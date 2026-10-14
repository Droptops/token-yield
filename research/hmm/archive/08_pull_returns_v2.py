"""
Pull quarterly closing prices for the 8 names + IGV (SaaS sector benchmark).
Compute NTM (next-twelve-month) total returns and sector-residualized alpha.
"""
import pandas as pd
import numpy as np
import yfinance as yf
from scipy.stats import linregress

panel = pd.read_csv("/home/claude/panel_v2.csv", parse_dates=["quarter_end"])
tickers = panel["ticker"].unique().tolist()

raw = yf.download(tickers + ["IGV"], start="2023-01-01", end="2026-05-18",
                  auto_adjust=True, progress=False)["Close"]
qe = raw.resample("QE").last()
print("Quarter-end prices (latest):")
print(qe.tail(5).round(2))

# NTM return per ticker
ntm = qe.shift(-4) / qe - 1
ntm_long = ntm.stack().reset_index()
ntm_long.columns = ["quarter_end","ticker","ntm_return"]

# IGV NTM
igv_ntm = pd.DataFrame({
    "quarter_end": ntm.index,
    "igv_ntm": (qe["IGV"].shift(-4) / qe["IGV"] - 1).values
})

panel = panel.merge(ntm_long, on=["quarter_end","ticker"], how="left")
panel = panel.merge(igv_ntm, on="quarter_end", how="left")

# Per-ticker beta vs IGV (use all available obs)
betas = {}
for tk in panel.ticker.unique():
    sub = panel.dropna(subset=["ntm_return","igv_ntm"])
    sub = sub[sub.ticker == tk]
    if len(sub) >= 4:
        slope, intercept, *_ = linregress(sub["igv_ntm"], sub["ntm_return"])
        betas[tk] = slope
    else:
        betas[tk] = 1.0

panel["beta"] = panel["ticker"].map(betas)
panel["ntm_alpha"] = panel["ntm_return"] - panel["beta"] * panel["igv_ntm"]

print("\nBetas vs IGV:")
for tk, b in sorted(betas.items(), key=lambda x: x[1]):
    print(f"  {tk}: {b:+.2f}")

# Token Yield log + delta
panel = panel.sort_values(["ticker","quarter_end"]).reset_index(drop=True)
panel["log_ty"]  = np.log(panel["token_yield"])
panel["dlog_ty"] = panel.groupby("ticker")["log_ty"].diff()

obs_w_return = panel.dropna(subset=["ntm_alpha"])
print(f"\nObservations with NTM return: {len(obs_w_return)} / {len(panel)}")

panel.to_csv("/home/claude/panel_v2_returns.csv", index=False)
