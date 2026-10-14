"""Replay historical calculations and expose known defects; no validity claim."""

from pathlib import Path
import argparse
import hashlib
import importlib.util
import json
import shutil
import subprocess
import sys
import tempfile

import numpy as np
import pandas as pd
import scipy
from pandas.testing import assert_frame_equal
from scipy.stats import rankdata, spearmanr

ROOT = Path(__file__).resolve().parent
ARCHIVE = ROOT / "archive"
SIGNALS = ("token_yield", "dlog_ty", "pred_alpha_g1", "pred_alpha_t1", "pred_alpha_g2")


def metrics(frame, column):
    sub = frame[[column, "ntm_alpha"]].dropna()
    signal, returns = sub[column].to_numpy(), sub.ntm_alpha.to_numpy()
    ranks = rankdata(signal)
    return {
        "n": len(sub),
        "spearman_ic": float(spearmanr(signal, returns).statistic),
        "pooled_long_minus_short": float(
            returns[ranks > len(sub) / 2].mean()
            - returns[ranks <= len(sub) / 2].mean()
        ),
        "pooled_hit_rate": float(((signal - np.median(signal)) * returns > 0).mean()),
    }


def compare_frames(expected, actual):
    # Checks row order, keys, column names, missing values and numeric values.
    assert_frame_equal(expected, actual, check_exact=False, rtol=1e-10, atol=1e-12)
    numeric = expected.select_dtypes("number").columns
    return {
        column: float(np.nanmax(np.abs(expected[column] - actual[column])))
        for column in numeric
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "generated")
    args = parser.parse_args()
    output = args.output.resolve()
    if output == ARCHIVE or ARCHIVE in output.parents:
        parser.error("Output must not be inside the historical archive")
    output.mkdir(parents=True, exist_ok=True)
    # Remove a prior success marker before starting a new run.
    (output / "results.json").unlink(missing_ok=True)
    manifest = json.loads((ROOT / "archive-manifest.json").read_text())
    for entry in manifest["files"]:
        actual = hashlib.sha256((ARCHIVE / entry["name"]).read_bytes()).hexdigest()
        if actual != entry["sha256"]:
            raise ValueError(f"Archive hash mismatch: {entry['name']}")

    results = {
        "status": "historical_calculations_reproduced_known_defects_present",
        "clean_out_of_sample_validation": False,
        "archive_hashes_verified": len(manifest["files"]),
        "versions": {
            "python": sys.version.split()[0], "numpy": np.__version__,
            "pandas": pd.__version__, "scipy": scipy.__version__,
        },
    }
    with tempfile.TemporaryDirectory(prefix="token-yield-hmm-") as directory:
        work = Path(directory)
        for source in ARCHIVE.glob("*.csv"):
            shutil.copyfile(source, work / source.name)
        for name in ("hmm.py", "07_expand_panel.py", "10_expanding_window.py", "13_robustness_tests.py"):
            text = (ARCHIVE / name).read_text().replace("/home/claude/", work.as_posix() + "/")
            (work / name).write_text(text)

        def run(name):
            completed = subprocess.run(
                [sys.executable, name], cwd=work, capture_output=True,
                text=True, timeout=600,
            )
            # Archive stdout contains historical OOS wording, qualified by the README.
            (output / (name + ".txt")).write_text(completed.stdout + completed.stderr)
            completed.check_returncode()
            print(f"Replayed {name}", flush=True)

        run("07_expand_panel.py")
        original_panel = pd.read_csv(ARCHIVE / "panel_v2.csv")
        results["panel_max_absolute_differences"] = compare_frames(
            original_panel, pd.read_csv(work / "panel_v2.csv")
        )
        if (len(original_panel), original_panel.ticker.nunique(), original_panel.quarter.nunique()) != (80, 8, 10):
            raise ValueError("Unexpected historical panel dimensions")
        results["panel_rows"] = len(original_panel)
        results["names"] = sorted(original_panel.ticker.unique().tolist())
        results["source_confidence_counts"] = original_panel.conf.value_counts().to_dict()

        run("10_expanding_window.py")
        saved = pd.read_csv(ARCHIVE / "oos_results.csv")
        rerun = pd.read_csv(work / "oos_results.csv")
        if len(rerun) != 32:
            raise ValueError("Expected 32 historical prediction rows")
        results["prediction_rows"] = len(rerun)
        results["prediction_max_absolute_differences"] = compare_frames(saved, rerun)
        results["metrics"] = {column: metrics(rerun, column) for column in SIGNALS}
        # Reproduce the saved-data robustness calculation, avoiding platform drift
        # in upstream fitting from changing the rank-based historical comparison.
        shutil.copyfile(ARCHIVE / "oos_results.csv", work / "oos_results.csv")
        run("13_robustness_tests.py")
        results["name_deletion_max_absolute_differences"] = compare_frames(
            pd.read_csv(ARCHIVE / "loo_by_name.csv"), pd.read_csv(work / "loo_by_name.csv")
        )

    means = saved.groupby("ticker")[["dlog_ty", "ntm_alpha"]].mean()
    demeaned = saved[["dlog_ty", "ntm_alpha"]] - saved.groupby("ticker")[["dlog_ty", "ntm_alpha"]].transform("mean")
    within = spearmanr(demeaned.dlog_ty, demeaned.ntm_alpha)
    results["between_name_ic"] = float(spearmanr(means.dlog_ty, means.ntm_alpha).statistic)
    results["within_name_ic"] = float(within.statistic)
    results["within_name_p_naive"] = float(within.pvalue)

    panel = pd.read_csv(ARCHIVE / "panel_v2_returns.csv", parse_dates=["quarter_end"])
    maturity = []
    for cutoff in sorted(pd.to_datetime(saved.quarter_end).unique()):
        cutoff = pd.Timestamp(cutoff)
        labels = panel[(panel.quarter_end <= cutoff) & panel.dlog_ty.notna() & panel.ntm_alpha.notna()]
        matured = labels.quarter_end + pd.DateOffset(years=1) <= cutoff
        maturity.append({
            "cutoff": str(cutoff.date()), "labels_used": len(labels),
            "nominally_matured": int(matured.sum()),
            "future_labels": int((~matured).sum()),
            "current_cutoff_targets": int((labels.quarter_end == cutoff).sum()),
        })
    if ([row["future_labels"] for row in maturity] != [24, 32, 32, 32]
            or any(row["current_cutoff_targets"] != 8 for row in maturity)):
        raise ValueError("Historical label-leakage diagnostic changed")
    results["label_maturity"] = maturity

    spec = importlib.util.spec_from_file_location("historical_hmm", ARCHIVE / "hmm.py")
    hmm = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(hmm)
    observations = np.r_[np.full(20, -2.), np.full(20, 2.), 100.]
    fitted = hmm.baum_welch([observations], K=2, emission="student_t", n_iter=1, tol=0)
    after = float(hmm.forward_backward(
        hmm.log_emission(observations, fitted, "student_t"),
        np.log(fitted["pi"]), np.log(fitted["A"]),
    )[-1])
    before = float(fitted["log_lik"])
    if not after < before:
        raise ValueError("Expected the archived Student-t likelihood-decrease counterexample")
    results["student_t_counterexample"] = {
        "log_likelihood_before_update": before,
        "log_likelihood_after_update": after,
        "reported_log_likelihood_is_stale": True,
    }
    (output / "results.json").write_text(json.dumps(results, indent=2, allow_nan=False) + "\n")
    print("Historical calculations reproduced. KNOWN VALIDATION DEFECTS REMAIN.")
    print("This is not clean out-of-sample validation. See docs/hmm-validation.md.")
    print(f"Results and logs: {output}")


if __name__ == "__main__":
    main()
