# Historical HMM research: evidence and validation limits

Audit date: October 14, 2026. Scope: the
[nine-file historical archive](../research/hmm/README.md), its saved inputs and
outputs. The archive predates this audit; the original files remain unchanged.

## Evidence index

| Result or claim | Status | Exact repository evidence |
| --- | --- | --- |
| Eight companies and ten quarters | Reproduced: 80 rows, 2023Q4–2026Q1 | [Builder](../research/hmm/archive/07_expand_panel.py), [panel](../research/hmm/archive/panel_v2.csv) |
| HMM implementations and inference | Code present and executable; Student-t correctness qualified below | [hmm.py](../research/hmm/archive/hmm.py) |
| Expanding-window predictions | All 32 saved rows reproduced; clean OOS validity not established | [Backtest](../research/hmm/archive/10_expanding_window.py), [saved predictions](../research/hmm/archive/oos_results.csv) |
| Name/cutoff deletion and disclosure splits | Reproduced as sensitivity calculations, not held-out-company retraining | [Robustness script](../research/hmm/archive/13_robustness_tests.py), [saved name deletion](../research/hmm/archive/loo_by_name.csv) |
| Ticker-block bootstrap | 5,000 draws, seed 11; change-signal IC interval approximately [+0.149, +0.847]; 0.7% of draws at or below zero | [Robustness script](../research/hmm/archive/13_robustness_tests.py) |
| Between-/within-name interpretation | Between-name IC +0.976; within-name demeaned IC +0.150, nominal p=0.412 | [Replay calculations](../research/hmm/reproduce.py) |
| Later corrected-panel, controls and permutation findings | Not independently reproduced here; corresponding code/data absent from this archive | Separate follow-up, not evidence supplied by this replay |
| Glacier infrastructure economics | Separate arithmetic verification, not empirical validation of this panel | [Glacier checks](../dashboard/verify.mjs) |

## 1. Future outcomes enter the training return map

[Backtest lines 79–105](../research/hmm/archive/10_expanding_window.py#L79)
select all non-missing forward alphas in observations with quarter end at or
before the cutoff. That does not ensure the forward outcome was available at
the decision date. Although HMM observation fitting stops at the cutoff, the
state-to-return map uses future labels, including each cutoff's evaluation
targets.

| Decision cutoff | Labels used | Labels whose nominal 12-month horizon has matured | Future labels | Current-cutoff targets included |
| --- | ---: | ---: | ---: | ---: |
| 2024-09-30 | 24 | 0 | 24 | 8 |
| 2024-12-31 | 32 | 0 | 32 | 8 |
| 2025-03-31 | 40 | 8 | 32 | 8 |
| 2025-06-30 | 48 | 16 | 32 | 8 |

These counts use `quarter_end + 1 year` as the nominal label end, not recovered
publication timestamps. Correcting the filter alone leaves no matured labels
at the first two cutoffs, so valid evaluation requires more history or fewer
eligible cutoffs. A clean rerun cannot simply preserve the original sample size.

## 2. Return construction is not point-in-time

The [return script](../research/hmm/archive/08_pull_returns_v2.py) downloads
prices only through May 18, 2026. `resample("QE").last()` labels the final
partial quarter June 30, so the last cutoff lacks a complete twelve-month
outcome. The per-company beta uses all available forward returns rather than
training-only observations. Raw price snapshots and filing availability dates
are absent. The replay uses the frozen return CSV and does not validate its
underlying prices.

## 3. Student-t estimation uses an incorrect emission update

The [likelihood](../research/hmm/archive/hmm.py) uses a Student-t density, but
the mean/variance M-step uses Gaussian moment updates without the Student-t
latent-scale weights. A deterministic stress example (twenty -2s, twenty +2s
and one 100; two states, default seed and nu=5) lowers the log likelihood from
-147.635160 to -157.312121 after one update. The returned `log_lik` also refers
to parameters before the last update, not the returned parameters.

The replay verifies this counterexample. Preserving a defect for historical
reproduction is not a claim that the Student-t branch is correctly estimated.

## 4. Constructed inputs and units limit economic interpretation

56 of 80 original rows are flagged estimated or synthetic. Cost shares are
assumed ramps, and some earlier values are reconstructed from later anchors.
The field `ai_acv_qrtly` contains annualized ACV/ARR-style inputs divided by
quarterly cost. Definitions also differ across companies. A constant factor of
four cancels in within-name log differences, but does not fix mislabeled levels
or heterogeneous measures. Original D labels have not been independently
checked against filings. Preserve the historical panel and build corrections
as a separately sourced version.

## 5. Sensitivity tests do not establish generalization

The [metric code](../research/hmm/archive/10_expanding_window.py#L134) ranks
all 32 observations together, rather than constructing portfolios at each
decision date. Annual outcomes overlap, there are only eight firms, trading
costs are omitted and model/signal selection is exploratory. Ordinary rank-test
p-values do not address this dependence or selection. The bootstrap resamples
only eight company blocks and cannot cure label leakage or data errors.

Name/cutoff deletion removes evaluation rows without refitting the models.
The strong between-name and weak within-name relationship supports a
sample-specific cross-sectional interpretation; it does not establish a
persistent company classifier or a timing signal.

## Requirements for a new validation result

1. Publish row-level primary sources, disclosure timestamps, metric definitions,
   periods and original-to-corrected values, distinguishing observed inputs from
   estimates and synthetic assumptions.
2. Require every mapped return label to mature by the decision time; estimate
   beta on training data only and use complete, archived price horizons.
3. Correct the Student-t M-step and likelihood reporting in a new implementation,
   with a likelihood-monotonicity check and independent reference comparison.
4. Specify baselines and model selection before evaluation; compare against the
   simple change signal using per-cutoff metrics and dependence-aware inference.
5. Refit for company holdouts if claiming generalization to unseen firms. Report
   sample attrition, uncertainty, costs and failed specifications.
6. Publish corrected data, controls and permutation scripts for later follow-up
   findings before presenting them as independently reproducible.

Until then, describe this package as reproducible exploratory research with
documented limitations, not validated out-of-sample investment performance.
