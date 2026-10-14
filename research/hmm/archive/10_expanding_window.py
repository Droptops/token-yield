"""
Expanding-window out-of-sample backtest.

Procedure: for each cutoff quarter T (where T is the last training quarter):
  1. Fit pooled HMM on all (ticker, quarter) data with quarter_end <= T
  2. State-conditional NTM alpha computed from training data only
  3. For each ticker, compute filtered probability at T using its sequence up to T
  4. Predict NTM alpha for that ticker at T: predictive distribution @ training state means
  5. Compare to realized NTM alpha (= return over (T, T+4Q] - beta*IGV)

Walk T forward, accumulate OOS predictions across all tickers and quarters.

Compare three models (V1 Gauss-1D, V2 Student-t-1D, V3 MVN-2D) plus
static yield LEVEL and static yield DELTA baselines.
"""
import numpy as np
import pandas as pd
from scipy.stats import spearmanr, rankdata
from hmm import baum_welch, viterbi, filtered_probs, reorder_states

panel = pd.read_csv("/home/claude/panel_v2_returns.csv", parse_dates=["quarter_end"])
panel = panel.sort_values(["ticker","quarter_end"]).reset_index(drop=True)

quarters = sorted(panel["quarter_end"].unique())
tickers = panel["ticker"].unique().tolist()

# Cutoff range: need at least 5 quarters of history to fit pooled HMM
# and NTM return must be available for cutoff (so cutoff <= last quarter with returns)
last_with_return = panel.dropna(subset=["ntm_alpha"])["quarter_end"].max()
print(f"Last cutoff with realized NTM alpha: {last_with_return.date()}")

cutoffs = [q for q in quarters if q >= pd.Timestamp("2024-09-30") and q <= last_with_return]
print(f"Cutoffs: {[q.date() for q in cutoffs]}")

# Storage
oos_rows = []

for T in cutoffs:
    # Training panel: all data up to and including T
    train = panel[panel.quarter_end <= T].copy()
    train_w_delta = train.dropna(subset=["dlog_ty"])

    seqs_1d = [train_w_delta.loc[train_w_delta.ticker==tk, "dlog_ty"].values
               for tk in tickers if (train_w_delta.ticker==tk).sum() > 0]
    seqs_2d = [train_w_delta.loc[train_w_delta.ticker==tk, ["log_ty","dlog_ty"]].values
               for tk in tickers if (train_w_delta.ticker==tk).sum() > 0]

    np.random.seed(11)
    m_g1 = reorder_states(baum_welch(seqs_1d, K=2, emission="gauss",     seed=11, n_iter=500))
    m_t1 = reorder_states(baum_welch(seqs_1d, K=2, emission="student_t", nu=5.0, seed=11, n_iter=500))
    m_g2 = reorder_states(baum_welch(seqs_2d, K=2, emission="mvn",       seed=11, n_iter=800), dim=1)

    # Per-ticker: compute state at T + predictive distribution
    for tk in tickers:
        tk_train = train_w_delta[train_w_delta.ticker==tk].copy()
        if len(tk_train) < 2: continue
        seq_1d  = tk_train["dlog_ty"].values
        seq_2d  = tk_train[["log_ty","dlog_ty"]].values

        f1 = filtered_probs(seq_1d, m_g1)[-1]    # filtered at T
        f2 = filtered_probs(seq_1d, m_t1)[-1]
        f3 = filtered_probs(seq_2d, m_g2)[-1]

        # Predictive distribution at T+1
        pred_g1 = f1 @ m_g1["A"]   # P(s_{T+1} | history)
        pred_t1 = f2 @ m_t1["A"]
        pred_g2 = f3 @ m_g2["A"]

        # Realized NTM alpha at T (if available)
        realized = panel[(panel.ticker==tk) & (panel.quarter_end==T)]
        if len(realized) == 0 or pd.isna(realized.iloc[0]["ntm_alpha"]): continue
        ntm_alpha = realized.iloc[0]["ntm_alpha"]
        token_yield_T = realized.iloc[0]["token_yield"]
        dlog_ty_T = realized.iloc[0]["dlog_ty"]
        if pd.isna(dlog_ty_T): continue

        # State-conditional NTM alpha from TRAINING DATA ONLY
        # We need each training observation's state assignment from THIS model
        train_w_alpha = train_w_delta.dropna(subset=["ntm_alpha"])
        if len(train_w_alpha) < 4: continue

        # State means per model, from training data only
        def state_means(model, obs_col_or_mvn):
            means = {}
            for tk_train in tickers:
                tk_data = train_w_alpha[train_w_alpha.ticker==tk_train]
                if len(tk_data) == 0: continue
                if obs_col_or_mvn == "_mvn":
                    seq_train = tk_data[["log_ty","dlog_ty"]].values
                else:
                    seq_train = tk_data[obs_col_or_mvn].values
                if len(seq_train) < 1: continue
                # Use full-sequence Viterbi states with training-only model
                full_seq = train_w_delta[train_w_delta.ticker==tk_train].copy()
                if obs_col_or_mvn == "_mvn":
                    full_seq_arr = full_seq[["log_ty","dlog_ty"]].values
                else:
                    full_seq_arr = full_seq[obs_col_or_mvn].values
                states = viterbi(full_seq_arr, model)
                full_seq["_state"] = states
                merge = full_seq[["quarter_end","_state"]].merge(
                    tk_data[["quarter_end","ntm_alpha"]], on="quarter_end", how="inner")
                for _, row in merge.iterrows():
                    means.setdefault(int(row["_state"]), []).append(row["ntm_alpha"])
            return {k: np.mean(v) for k, v in means.items() if len(v) > 0}

        sm_g1 = state_means(m_g1, "dlog_ty")
        sm_t1 = state_means(m_t1, "dlog_ty")
        sm_g2 = state_means(m_g2, "_mvn")

        # Expected NTM alpha = sum_k P(s_{T+1}=k) * mean_alpha[k]
        def expected_alpha(pred, means):
            if 0 not in means or 1 not in means: return np.nan
            return pred[0] * means[0] + pred[1] * means[1]

        oos_rows.append({
            "ticker": tk, "quarter_end": T,
            "token_yield":     token_yield_T,
            "dlog_ty":         dlog_ty_T,
            "ntm_alpha":       ntm_alpha,
            "filt_p1_g1":      f1[1], "pred_p1_g1": pred_g1[1],
            "filt_p1_t1":      f2[1], "pred_p1_t1": pred_t1[1],
            "filt_p1_g2":      f3[1], "pred_p1_g2": pred_g2[1],
            "pred_alpha_g1":   expected_alpha(pred_g1, sm_g1),
            "pred_alpha_t1":   expected_alpha(pred_t1, sm_t1),
            "pred_alpha_g2":   expected_alpha(pred_g2, sm_g2),
        })

oos = pd.DataFrame(oos_rows)
print(f"\nOOS observations: {len(oos)}")
print(oos[["ticker","quarter_end","token_yield","dlog_ty","ntm_alpha",
           "pred_p1_g1","pred_p1_g2","pred_alpha_g1","pred_alpha_g2"]]
      .to_string(index=False, float_format=lambda x: f"{x:>7.3f}"))

def evaluate(sig, ret_, name):
    mask = ~(np.isnan(sig) | np.isnan(ret_))
    s, r = sig[mask], ret_[mask]
    if len(s) < 4:
        return (np.nan, np.nan, np.nan, np.nan, len(s))
    ic, p = spearmanr(s, r)
    rank = rankdata(s)
    long_mask  = rank >  len(rank) / 2
    short_mask = rank <= len(rank) / 2
    ls = r[long_mask].mean() - r[short_mask].mean()
    hit = ((s - np.median(s)) * r > 0).mean()
    return ic, p, ls, hit, len(s)

print("\n" + "="*86)
print(f"OUT-OF-SAMPLE HORSE-RACE  (expanding window, dep var = NTM alpha vs IGV)")
print("="*86)
print(f"{'Signal':<32} {'Spearman IC':>13} {'p-value':>10} {'L-S spread':>13} {'Hit-Rate':>10} {'n':>4}")
print("-"*86)

candidates = [
    ("Static yield LEVEL",          oos["token_yield"].values),
    ("Static yield DELTA",          oos["dlog_ty"].values),
    ("V1 Filtered P(Accel)",        oos["filt_p1_g1"].values),
    ("V1 Predictive P(Accel)",      oos["pred_p1_g1"].values),
    ("V1 Predictive E[alpha]",      oos["pred_alpha_g1"].values),
    ("V2 Filtered P(Accel)",        oos["filt_p1_t1"].values),
    ("V2 Predictive P(Accel)",      oos["pred_p1_t1"].values),
    ("V2 Predictive E[alpha]",      oos["pred_alpha_t1"].values),
    ("V3 Filtered P(Accel)",        oos["filt_p1_g2"].values),
    ("V3 Predictive P(Accel)",      oos["pred_p1_g2"].values),
    ("V3 Predictive E[alpha]",      oos["pred_alpha_g2"].values),
]
for name, sig in candidates:
    ic, p, ls, hit, n = evaluate(sig, oos["ntm_alpha"].values, name)
    if np.isnan(ic):
        print(f"{name:<32} {'n/a':>13} {'n/a':>10} {'n/a':>13} {'n/a':>10} {n:>4}")
    else:
        print(f"{name:<32} {ic:>+13.3f} {p:>10.3f} {ls:>+13.3f} {hit:>10.1%} {n:>4}")

oos.to_csv("/home/claude/oos_results.csv", index=False)
