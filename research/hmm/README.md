# Historical Token Yield / HMM research

**Status: exploratory historical archive, with known validation defects.**
This package makes the May 2026 calculations inspectable and reproducible.
Reproducing the outputs does not establish predictive validity. Read the
[validation note and evidence index](../../docs/hmm-validation.md) before using
any result. In particular, `oos_results.csv` retains its historical filename;
it is **not** a clean out-of-sample result.

## Contents and provenance

The author-maintained research files were recovered and checked on October 14,
2026. The nine files in `archive/` preserve the recovered bytes, including
historical comments and absolute paths. Their SHA-256 hashes are in
[`archive-manifest.json`](archive-manifest.json). The replay changes only
`/home/claude/` paths in temporary copies and never executes the market-data
download script. No account access or external documents are required.

| File | Evidence |
| --- | --- |
| [hmm.py](archive/hmm.py) | Gaussian, Student-t and multivariate emission branches; forward/backward inference, Baum-Welch-style iteration and Viterbi decoding. The Student-t update is defective. |
| [07_expand_panel.py](archive/07_expand_panel.py) | Hard-coded construction of the 80-row panel. |
| [panel_v2.csv](archive/panel_v2.csv) | Eight firms × ten quarters, 2023Q4–2026Q1. |
| [08_pull_returns_v2.py](archive/08_pull_returns_v2.py) | Historical price-download, quarterly aggregation and sector-beta logic; inspected, not rerun. |
| [panel_v2_returns.csv](archive/panel_v2_returns.csv) | Frozen features and return inputs used by the replay. |
| [10_expanding_window.py](archive/10_expanding_window.py) | Historical model fitting and state-to-return mapping, including target leakage. |
| [oos_results.csv](archive/oos_results.csv) | 32 saved prediction rows across four cutoffs. |
| [13_robustness_tests.py](archive/13_robustness_tests.py) | Name/cutoff deletion sensitivity, disclosure splits and ticker-block bootstrap. |
| [loo_by_name.csv](archive/loo_by_name.csv) | Saved name-deletion results. |

Firms: ADBE, CRM, CRWD, DDOG, MSFT, NOW, ORCL and SNOW.
Original confidence labels are D (disclosed, 24 rows), E (estimated, 41) and
S (synthetic, 15). These are the original author's classifications, not an
independent certification of filings. AI cost shares are assumed; D does not
mean every field in the row was observed. Row-level primary-source URLs and
publication timestamps have not been recovered.

## Run the offline replay

Use Python 3.12. From the repository root:

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r research/hmm/requirements.txt
python research/hmm/reproduce.py
```

On Windows PowerShell, replace the activation line with
`.\.venv\Scripts\Activate.ps1`.

The last command uses only local inputs. It checks archive hashes, rebuilds the
80-row panel, reruns the 32 predictions and robustness script, compares saved
outputs, and diagnoses label maturity and the Student-t likelihood decrease.
It exits nonzero on a failed command, file mismatch or failed diagnostic.
Floating-point comparisons allow `rtol=1e-10, atol=1e-12`; the October 14 local
replay matched all saved prediction numbers exactly.
The [reference result summary](reference-results.json) records that run; it
explicitly marks clean out-of-sample validation as false.

Results and execution logs go to ignored `research/hmm/generated/`. Pass
`--output /path/to/results` to choose another directory. The runner prints an
explicit warning that successful reproduction is not successful validation.

## Historical results, not trading performance

| Signal | Spearman IC | Pooled long-minus-short | Pooled hit rate |
| --- | ---: | ---: | ---: |
| Yield level | -0.0605 | -11.03 percentage points | 34.375% |
| Change in log yield | +0.6664 | +33.78 percentage points | 78.125% |
| Gaussian HMM expected alpha | +0.6298 | +36.20 percentage points | 78.125% |
| Student-t branch expected alpha | +0.6118 | +32.73 percentage points | 71.875% |
| Multivariate HMM expected alpha | +0.0062 | +1.04 percentage points | 46.875% |

All metrics pool 32 observations across cutoffs. The spread ranks that full
sample into halves; it is not a quarterly executable portfolio return. The
hit rate is `mean((signal - pooled_median(signal)) * forward_alpha > 0)`.
The simpler change signal has the highest rank correlation, while Gaussian HMM
has a slightly higher pooled spread. This does not demonstrate incremental
HMM predictive value.

No current market prices, live model calls, customer records or later corrected
panel are used. The Glacier dashboard is an independent model and has its own
verification command: `node dashboard/verify.mjs`.
