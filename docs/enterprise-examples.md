# Enterprise examples — reproducible, sourced, run through the engine

*Four archetypes whose token volumes come from public, checkable disclosures (sources in
[calibration-data.md](calibration-data.md) §3), run through this repo's engine at the
sourced August-2026 defaults (`h=$45k`, `s0=1000 tok/s/GPU`, `u=0.5`, `p0=$4.25/M`
workhorse-frontier, 18-mo halving, hosted-open `$0.30/M`, managed-inference basket
`$1.633/M` open tokens, `m=$450k/yr` unless noted).
Reproduce: the inputs below into the dashboard, or `node` against the engine in
`index.html`. σ = movable share (the slice of workload open models can serve).*

| Archetype | Volume (source) | σ | g | Movable | vs frontier API | vs inference clouds | vs hosted open-weights |
|---|---|---:|---:|---:|---|---|---|
| **Foundry-cohort F500** — one of Microsoft's "300+ customers on track for >1T tokens/yr" ([MSFT FY26Q4](https://www.microsoft.com/en-us/investor/earnings/fy-2026-q4/press-release-webcast)) | 83B tok/mo | 0.20 | 25% | 16.6B/mo | **BUY** · −$310k NPV (3yr), never breaks even — just under the ~18B/mo threshold; σ→0.3 flips it | BUY · −$1.22M | BUY · −$1.81M |
| **Agent-platform SaaS** — Salesforce-scale: 28.6T tokens processed in FQ1-27 ≈ 9.5T/mo ([Benioff](https://x.com/Benioff/status/2059881098386280734), [transcript](https://www.fool.com/earnings/call-transcripts/2026/05/28/salesforce-crm-q1-2027-earnings-transcript/)); D=$1M, m=$2M/yr platform team (assumed†) | 9.5T tok/mo | 0.30 | 60% | 2.85T/mo | **BUILD** · +$278M NPV, break-even month 13, fleet grows to ~6,900 GPUs (~$310M capex) | **BUILD** · +$28.0M, break-even month 35 | **BUY** · −$133M — commodity hosting still wins at u=0.5 |
| **Support-automation fintech** — Klarna-shape: 2.3M conversations/mo ([Klarna PR](https://www.klarna.com/international/press/klarna-ai-assistant-handles-two-thirds-of-customer-service-chats-in-its-first-month/)) × 2.5k tok/conv (assumed†) ≈ 6B tok/mo, quality-gated σ | 6B tok/mo | 0.05 | 40% | 300M/mo | BUY · −$1.40M | BUY · −$1.41M | BUY · −$1.42M |
| **Consumer self-hoster** — Roblox-shape: ~4B tokens/week served on open models ([Roblox](https://about.roblox.com/newsroom/2024/09/running-ai-inference-at-scale-in-the-hybrid-cloud)) | 17B tok/mo | 0.90 | 30% | 15.3B/mo | BUY · −$341k | BUY · −$1.23M | BUY · −$1.81M — cost alone doesn't justify owning; Roblox's stated drivers are latency and control |

## How to read this

1. **The participation gate is the binding one everywhere.** Every archetype passes
   Gate 1 (positive per-token margin, melt time 13.2 yr vs frontier / 10.1 yr vs
   inference clouds / 3.9 yr vs hosted-open at these rates) — only the Salesforce-scale
   platform clears Gate 2 against the frontier and managed-provider basket.
2. **The managed-inference curve is the missing middle screen.** The agent platform can
   beat the named-provider basket by $28M at enormous scale, while the smaller archetypes
   still cannot. This is materially different from pretending all hosted open inference
   costs either the commodity lower bound or one generic best-open sticker price.
3. **The real lower bar is commodity hosted open-weights, and nobody here clears it at u = 0.5.**
   Commodity hosted-open at $0.30/M sits so close to the electricity + capex floor
   that owning only wins with provider-grade utilization (u ≥ 0.7 and s0 ≥ 1,500
   flips the Roblox-shape) or when APIs are off the table.
4. **The one well-documented cost-driven build agrees**: AT&T serves >1T tokens on
   ~530 GPUs running open models claiming "tens of millions" saved vs frontier APIs
   ([AMD](https://newsroom.amd.com/news/aai-2026-att-open-telco-update/)) — a
   frontier-substitution story at telecom utilization, exactly the corner the model
   says works.
5. **What flips a BUY to BUILD**, in order of tornado leverage: σ (movable share),
   u (utilization), s0 (throughput), then λ slowing. Not electricity price.

*† = assumption, not sourced; every sourced number links to its origin. Analytical
work, not investment advice.*
