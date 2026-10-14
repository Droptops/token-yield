"""
Robustness tests for the Token Yield signal.

Three tests:
  1. Leave-one-NAME-out for IC stability
  2. Leave-one-CUTOFF-out for time stability
  3. Split-half by disclosure quality:
     (a) Report's split: {NOW, CRM, ADBE, ORCL} (hard) vs {MSFT, SNOW, DDOG, CRWD} (soft)
     (b) Strict conf-flag split: any 'D' vs no 'D'

Signals tested:
  - Δlog Token Yield (the raw signal that survived in the headline result)
  - V1 Predictive E[α] (the best HMM variant)
"""
import numpy as np
import pandas as pd
from scipy.stats import spearmanr, rankdata

oos = pd.read_csv("oos_results.csv")
panel = pd.read_csv("panel_v2.csv")

def metrics(sig, ret_):
    mask = ~(np.isnan(sig) | np.isnan(ret_))
    s, r = sig[mask], ret_[mask]
    if len(s) < 4:
        return dict(ic=np.nan, p=np.nan, ls=np.nan, hit=np.nan, n=len(s))
    ic, p = spearmanr(s, r)
    rank = rankdata(s)
    long_mask  = rank >  len(rank)/2
    short_mask = rank <= len(rank)/2
    ls = r[long_mask].mean() - r[short_mask].mean()
    hit = ((s - np.median(s)) * r > 0).mean()
    return dict(ic=ic, p=p, ls=ls, hit=hit, n=len(s))

def fmt(m):
    if np.isnan(m["ic"]):
        return f"     n/a    n/a       n/a    n/a   {m['n']:>3}"
    return f"{m['ic']:>+8.3f}  {m['p']:>6.3f}  {m['ls']:>+8.3f}  {m['hit']:>5.1%}   {m['n']:>3}"

ret = oos["ntm_alpha"].values

print("="*92)
print("BASELINE (full panel, all 32 OOS obs)")
print("="*92)
print(f"{'Signal':<40}     IC      p     L-S      HR   n")
for name, col in [("Δlog Token Yield","dlog_ty"),
                  ("V1 Predictive E[α]","pred_alpha_g1"),
                  ("V2 Predictive E[α]","pred_alpha_t1")]:
    print(f"{name:<40} {fmt(metrics(oos[col].values, ret))}")

# ──────────────────────────────────────────────────────────────────────────
# 1. LEAVE-ONE-NAME-OUT
# ──────────────────────────────────────────────────────────────────────────
print("\n" + "="*92)
print("TEST 1 · LEAVE-ONE-NAME-OUT")
print("Re-compute Spearman IC on the OOS panel with each ticker held out.")
print("="*92)
print(f"{'Held out':<10}  {'n':>3}  {'Δlog IC':>9}  {'Δlog p':>7}  {'Δlog HR':>8}    {'V1 IC':>8}  {'V1 p':>7}")
print("-"*92)
rows = []
for tk in sorted(oos.ticker.unique()):
    sub = oos[oos.ticker != tk]
    m_d = metrics(sub["dlog_ty"].values, sub["ntm_alpha"].values)
    m_g = metrics(sub["pred_alpha_g1"].values, sub["ntm_alpha"].values)
    rows.append({"held_out": tk, "n": m_d["n"],
                 "dlog_ic": m_d["ic"], "dlog_p": m_d["p"], "dlog_hr": m_d["hit"],
                 "v1_ic": m_g["ic"], "v1_p": m_g["p"]})
    print(f"{tk:<10}  {m_d['n']:>3}  {m_d['ic']:>+9.3f}  {m_d['p']:>7.3f}  {m_d['hit']:>7.1%}    {m_g['ic']:>+8.3f}  {m_g['p']:>7.3f}")

loo_df = pd.DataFrame(rows)
print(f"\nΔlog IC range across LOO: [{loo_df['dlog_ic'].min():+.3f}, {loo_df['dlog_ic'].max():+.3f}]   "
      f"mean = {loo_df['dlog_ic'].mean():+.3f}   std = {loo_df['dlog_ic'].std():.3f}")
worst = loo_df.iloc[loo_df['dlog_ic'].idxmin()]
print(f"Most influential single name: {worst['held_out']}  →  IC falls to {worst['dlog_ic']:+.3f}")

# ──────────────────────────────────────────────────────────────────────────
# 2. LEAVE-ONE-CUTOFF-OUT
# ──────────────────────────────────────────────────────────────────────────
print("\n" + "="*92)
print("TEST 2 · LEAVE-ONE-CUTOFF-OUT")
print("Re-compute IC with each cutoff quarter held out.")
print("="*92)
print(f"{'Held out':<14}  {'n':>3}  {'Δlog IC':>9}  {'Δlog p':>7}  {'Δlog HR':>8}    {'V1 IC':>8}")
print("-"*92)
for q in sorted(oos.quarter_end.unique()):
    sub = oos[oos.quarter_end != q]
    m_d = metrics(sub["dlog_ty"].values, sub["ntm_alpha"].values)
    m_g = metrics(sub["pred_alpha_g1"].values, sub["ntm_alpha"].values)
    print(f"{q:<14}  {m_d['n']:>3}  {m_d['ic']:>+9.3f}  {m_d['p']:>7.3f}  {m_d['hit']:>7.1%}    {m_g['ic']:>+8.3f}")

# Per-cutoff in-sample (no LOO, just within-quarter cross-section)
print("\nWithin-quarter cross-sectional IC (each cutoff alone, n=8):")
print(f"{'Cutoff':<14}  {'Δlog IC':>9}  {'Δlog p':>7}    {'V1 IC':>8}  {'V1 p':>7}")
for q in sorted(oos.quarter_end.unique()):
    sub = oos[oos.quarter_end == q]
    m_d = metrics(sub["dlog_ty"].values, sub["ntm_alpha"].values)
    m_g = metrics(sub["pred_alpha_g1"].values, sub["ntm_alpha"].values)
    print(f"{q:<14}  {m_d['ic']:>+9.3f}  {m_d['p']:>7.3f}    {m_g['ic']:>+8.3f}  {m_g['p']:>7.3f}")

# ──────────────────────────────────────────────────────────────────────────
# 3. SPLIT-HALF BY DISCLOSURE
# ──────────────────────────────────────────────────────────────────────────
print("\n" + "="*92)
print("TEST 3a · SPLIT-HALF (report's grouping)")
print("HARD disclosure: NOW, CRM, ADBE, ORCL    SOFT: MSFT, SNOW, DDOG, CRWD")
print("="*92)
hard_a = ["NOW","CRM","ADBE","ORCL"]
soft_a = ["MSFT","SNOW","DDOG","CRWD"]
for name, group in [("HARD (4 names)", hard_a), ("SOFT (4 names)", soft_a)]:
    sub = oos[oos.ticker.isin(group)]
    m_d = metrics(sub["dlog_ty"].values, sub["ntm_alpha"].values)
    m_g = metrics(sub["pred_alpha_g1"].values, sub["ntm_alpha"].values)
    print(f"  {name:<18}  Δlog IC={m_d['ic']:+.3f} (p={m_d['p']:.3f}, HR={m_d['hit']:.0%}, n={m_d['n']})   "
          f"V1 IC={m_g['ic']:+.3f}")

print("\n" + "="*92)
print("TEST 3b · SPLIT-HALF (strict conf-flag, panel-v2 source of truth)")
# any 'D' anywhere in the panel → hard disclosure; otherwise soft
hard_b = sorted([tk for tk in panel.ticker.unique()
                 if (panel[panel.ticker==tk].conf == "D").any()])
soft_b = sorted([tk for tk in panel.ticker.unique() if tk not in hard_b])
print(f"HARD ({len(hard_b)} names with any 'D' flag): {hard_b}")
print(f"SOFT ({len(soft_b)} names, no 'D' ever):       {soft_b}")
print("="*92)
for name, group in [(f"HARD ({len(hard_b)} names)", hard_b),
                    (f"SOFT ({len(soft_b)} names)", soft_b)]:
    sub = oos[oos.ticker.isin(group)]
    m_d = metrics(sub["dlog_ty"].values, sub["ntm_alpha"].values)
    m_g = metrics(sub["pred_alpha_g1"].values, sub["ntm_alpha"].values)
    print(f"  {name:<18}  Δlog IC={m_d['ic']:+.3f} (p={m_d['p']:.3f}, HR={m_d['hit']:.0%}, n={m_d['n']})   "
          f"V1 IC={m_g['ic']:+.3f}")

# ──────────────────────────────────────────────────────────────────────────
# 4. BOOTSTRAP CI ON HEADLINE IC
# ──────────────────────────────────────────────────────────────────────────
print("\n" + "="*92)
print("TEST 4 · BLOCK-BOOTSTRAP CI ON Δlog HEADLINE IC")
print("Resample tickers with replacement (the unit that drives dependence in panel data).")
print("="*92)
rng = np.random.default_rng(11)
tickers_all = sorted(oos.ticker.unique())
boot_ic = []
for _ in range(5000):
    draw = rng.choice(tickers_all, size=len(tickers_all), replace=True)
    sub = pd.concat([oos[oos.ticker == tk] for tk in draw], ignore_index=True)
    s = sub["dlog_ty"].values
    r = sub["ntm_alpha"].values
    mask = ~(np.isnan(s) | np.isnan(r))
    if mask.sum() < 4:
        continue
    if np.std(s[mask]) < 1e-9 or np.std(r[mask]) < 1e-9:
        continue
    ic, _ = spearmanr(s[mask], r[mask])
    boot_ic.append(ic)
boot_ic = np.array(boot_ic)
print(f"Headline Δlog IC: {metrics(oos['dlog_ty'].values, ret)['ic']:+.3f}")
print(f"Bootstrap (5000 draws, block = ticker)")
print(f"  mean IC:    {boot_ic.mean():+.3f}")
print(f"  median IC:  {np.median(boot_ic):+.3f}")
print(f"  95% CI:     [{np.percentile(boot_ic, 2.5):+.3f}, {np.percentile(boot_ic, 97.5):+.3f}]")
print(f"  P(IC ≤ 0):  {(boot_ic <= 0).mean():.3f}")
print(f"  P(IC < 0.3): {(boot_ic < 0.3).mean():.3f}")

# Save consolidated artifact
loo_df.to_csv("loo_by_name.csv", index=False)
print("\n✓ Wrote loo_by_name.csv")
