# Token Yield — The Glacier Model

**When does self-hosting open-source models beat buying tokens?** Take the price of power
chips, the (falling) price of tokens, the (rising) price of electricity, and the dev cost
of standing up open-source inference — and get a verdict, a break-even month, and the
melt clock on your savings.

**[→ Open the dashboard](index.html)** · plug in your numbers, flip between **Plain** and
**Nerd** mode, watch the two gates decide.

## The idea in four lines

1. A token on your own GPUs costs cents in electricity; a bought token costs dollars.
   That gap is a **glacier of savings** — and it is **melting**, because frontier API list
   prices halve roughly every 18 months (the sun) while electricity drifts up (the warm ground).
2. Harvesting it costs a **toll**: dev cost + GPUs + an MLOps team − resale value.
3. **Gate 1**: is a token on your metal cheaper today? **Gate 2**: does the discounted
   glacier beat the toll before it melts? Passing 1 but failing 2 is the mid-size trap.
4. Electricity going up is a real **downward force vector on token yield** — worth
   0.1–0.3%/yr of drag — but API prices melt at ~46%/yr. The meter rate nibbles;
   the *megawatts* veto.

## What's here

| File | What it is |
|---|---|
| [`index.html`](index.html) | The dashboard. Self-contained, no build step. Plain + Nerd modes, presets, glacier/break-even/token-yield charts, sensitivity tornado. |
| [`docs/glacier-math.md`](docs/glacier-math.md) | **The nerd version** — full derivations, closed forms, melt time, glacier value, two gates, force vectors, calibration, worked examples. |
| [`docs/glacier-math.tex`](docs/glacier-math.tex) | Same, as a LaTeX working paper. |
| [`docs/glacier-plain.md`](docs/glacier-plain.md) | **The easy version** — the whole model as one glacier story, no equations. |
| [`dashboard/verify.mjs`](dashboard/verify.mjs) | Verification: extracts the engine from `index.html` and checks it against exact closed forms (23 checks, machine precision, incl. cross-checks against the reviewed canonical spec). |
| [`docs/calibration-data.md`](docs/calibration-data.md) | **Sourced calibration** — Aug-2026 low/central/high for every parameter with per-bound citations, from a 6-agent web sweep. |
| [`docs/enterprise-examples.md`](docs/enterprise-examples.md) | **Reproducible enterprise archetypes** (Microsoft Foundry cohort, Salesforce-scale, Klarna-shape, Roblox-shape) run through the engine. |
| [`docs/paper-audit.md`](docs/paper-audit.md) + [`dashboard/audit-twogates.mjs`](dashboard/audit-twogates.mjs) | Audit of the companion papers: 17/17 claims reproduce; 2 wording defects found and corrected in place. |
| [`dashboard/engine.dev.js`](dashboard/engine.dev.js) | Development copy of the engine (the canonical copy is inlined in `index.html`). |

```bash
node dashboard/verify.mjs   # ALL CHECKS PASS
```

## Companion pieces (the wider Token Yield line of work)

- [Two Gates and a Half-Life](https://claude.ai/code/artifact/aaa96ee8-841e-450f-90a1-52865e584372) —
  the sector model: optimal routing share σ*, the participation gate, the melt law with a
  ~4-year half-life, and why **frontier price cuts slow the melt**.
- [When Open Source Gets Cheap Enough](https://claude.ai/code/artifact/40c001e6-97f2-4796-bf2f-a538cfdf8142) —
  its plain-English version.
- [Melt Rate](https://claude.ai/code/artifact/569e7a6d-2292-4403-90e8-c522772700af) —
  the interactive for the sector model (this repo's dashboard is the firm-level,
  cash-flow one).

## Headline numbers at the August-2026 central calibration

- Electricity floor: **$0.10 per million open tokens** — power is ~2–5% of build cost;
  chips and people are the money.
- Melt time vs the frontier API: **13 years**; vs hosted open-weights: **3.9 years** —
  the fixed toll, not the margin, is what blocks most builds.
- Minimum viable scale vs the frontier: **≈ 18B movable tokens/month**. Below that, buy.
- Even at 50B tokens/month, **hosted open-weights beat building by ~$3.9M over 3 years**
  at typical utilization — self-hosting wins outright only with provider-grade
  utilization or when data can't leave.

*Analytical work, not investment advice. Defaults are sourced Aug-2026 estimates (see
[calibration-data.md](docs/calibration-data.md)) — the dashboard exists so you can disagree with them.*
