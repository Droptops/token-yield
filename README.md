# Token Yield — The Glacier Model

**When does self-hosting open-source models beat buying tokens?** Take the price of power
chips, the (falling) price of tokens, the (rising) price of electricity, and the dev cost
of standing up open-source inference — and get a verdict, a break-even month, and the
melt clock on your savings. The dashboard separates frontier APIs, commodity hosted
open weights, and an apples-to-apples managed-inference basket for Fireworks AI, Baseten,
and DeepInfra. It also models a personal/local ownership ladder for NVIDIA DGX Spark and
Apple desktop hardware.

**[→ Open the dashboard](index.html)** · plug in your numbers, flip between **Plain** and
**Nerd** mode, watch the two gates decide.

## The idea in four lines

1. A token on your own GPUs costs cents in electricity; a bought token costs dollars.
   That gap is a **glacier of savings** — and it is **melting**, because frontier API list
   prices tend to fall while electricity and operating costs do not.
2. Harvesting it costs a **toll**: dev cost + GPUs + an MLOps team − resale value.
3. **Gate 1**: is a token on your metal cheaper today? **Gate 2**: does the discounted
   glacier beat the toll before it melts? Passing 1 but failing 2 is the mid-size trap.
4. Electricity going up is a real **downward force vector on token yield**, but hardware,
   utilization, staffing, and API-price compression usually dominate the economics.

## What's here

| File | What it is |
|---|---|
| [`index.html`](index.html) | The dashboard. Self-contained, no build step. Plain + Nerd modes, presets, glacier/break-even/token-yield charts, local-AI ownership ladder, sensitivity tornado. |
| [`docs/glacier-math.md`](docs/glacier-math.md) | Full derivations, closed forms, melt time, glacier value, two gates, force vectors, calibration, and worked examples. |
| [`docs/inference-provider-curve.md`](docs/inference-provider-curve.md) | Fireworks AI / Baseten / DeepInfra same-model rate-card treatment, input-output-cache blend, quote band, NPV and melt derivations. |
| [`docs/local-ai-ownership.md`](docs/local-ai-ownership.md) | Local-AI ownership analysis: hardware specs, memory-fit gate, bandwidth roofline, electricity, resale, output-basis conversion, and break-even derivation. |
| [`docs/glacier-math.tex`](docs/glacier-math.tex) | LaTeX working-paper version of the model. |
| [`docs/glacier-plain.md`](docs/glacier-plain.md) | Plain-English version of the model. |
| [`dashboard/verify.mjs`](dashboard/verify.mjs) | Verification: extracts the engine from `index.html` and checks it against exact closed forms and reviewed test vectors. |
| [`docs/calibration-data.md`](docs/calibration-data.md) | Sourced calibration inputs and dated provider-rate snapshots. |
| [`docs/enterprise-examples.md`](docs/enterprise-examples.md) | Reproducible enterprise archetypes run through the engine. |
| [`docs/paper-audit.md`](docs/paper-audit.md) + [`dashboard/audit-twogates.mjs`](dashboard/audit-twogates.mjs) | Audit of the companion model claims and wording corrections. |
| [`docs/canonical-spec.md`](docs/canonical-spec.md) | Machine-verified derivation appendix and canonical test vectors. |
| [`dashboard/engine.dev.js`](dashboard/engine.dev.js) | Development copy of the engine; the deployed copy is inlined in `index.html`. |

```bash
node dashboard/verify.mjs
```

The public repository is the source of truth for the model, assumptions, derivations,
calibration, and verification. External/private drafting artifacts are intentionally not
part of the reproducibility chain.

## Headline numbers at the August/September-2026 central calibration

- Electricity floor: **$0.10 per million open tokens** — power is ~2–5% of build cost;
  chips and people are the money.
- Managed-inference basket: **$1.633/M open tokens** at a 3:1 input:output mix and 25%
  input-cache hit rate, with a **$1.400–$1.757/M** public-quote range across Fireworks AI,
  Baseten, and DeepInfra for the same DeepSeek V4 Pro 0813 model (Sep 1, 2026 snapshot).
- Local-AI ladder: **five ownership curves** spanning DGX Spark and Apple desktop options.
  Curves use starting configurations, reject model footprints that do not fit after memory
  reserve, and estimate decode throughput from the explicit bandwidth roofline `ηB/W`
  rather than unverified vendor token claims.
- Melt time vs the frontier API: **13 years**; vs hosted open-weights: **3.9 years** —
  the fixed toll, not the margin, is what blocks most builds.
- First viable scale vs the frontier: **≈ 18B movable tokens/month**. Below that, buy;
  above it, check the exact load because integer GPU purchases make NPV a sawtooth.
- Even at 50B tokens/month, **hosted open-weights beat building by ~$3.9M over 3 years**
  at typical utilization — self-hosting wins outright only with provider-grade
  utilization or when data can't leave.

## Reproducibility and scope

The dashboard is analytical software, not a benchmark of any provider and not a promise
that historical price-decline rates will continue. Calibration inputs are dated; rerun
the model with current quotes before using it for a real infrastructure decision.

*Analytical work, not investment advice. Infrastructure defaults are sourced Aug-2026
estimates and provider rates are dated snapshots. See
[`docs/calibration-data.md`](docs/calibration-data.md) and
[`docs/local-ai-ownership.md`](docs/local-ai-ownership.md); the dashboard exists so you
can disagree with the assumptions.*
