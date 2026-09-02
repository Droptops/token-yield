# Calibration data — sourced, August 2026 + provider addendum, September 2026

*Produced by a 6-agent web-research sweep + adversarial paper audit (2026-08-28), synthesized
with per-bound citations. This file is the sourcing behind `docs/glacier-math.md` §10 and the
engine defaults in `index.html`. Read the provenance caveat before quoting any number.*

---
# Calibration data (sourced, August 2026; managed-inference rates refreshed 2026-09-01)

**Provenance caveat (applies to every number below).** All six underlying reports were compiled 2026-08-28 from a sandbox whose egress proxy blocked most primary domains. Only a handful of sources were fetched in full: `platform.claude.com` (Anthropic pricing), NVIDIA TensorRT-LLM perf docs (GitHub), DeepSeek's open-infra inference-system disclosure (GitHub), the dzhsurf DeepSeek benchmark repo, the Azure LLM inference trace dataset, the sglang issue #7452 thread, and Microsoft's FY26 Q4 investor press-release page. Everything else is **snippet-verified, page-unverified** — the source URL is given so a reader can confirm. Numbers marked **†** are inferences/synthesis (arithmetic on sourced figures, or a range constructed by the researcher) rather than direct citations; numbers marked **(unverified)** rest on a single secondary snippet.

## 1. Parameter table

| Parameter | LOW | CENTRAL | HIGH | Sources for bounds |
|---|---|---|---|---|
| **h** — $/GPU slot all-in (H100-SXM class) | $37,000 † | **$45,000 †** | $55,000 † | All three bounds are synthesis†: sourced server-level cost $250K–$320K per HGX H100 8-GPU (≈$31K–$40K/GPU, central ≈$35.6K/GPU) per [Mercatus](https://www.mercatus-ai.com/blog/h100-server-price), multiplied by a +15%/+25%/+40% networking/storage/integration overhead built from: IB ≈ $4K/GPU vs $0.8–2.5K Ethernet ([IntuitionLabs](https://intuitionlabs.ai/articles/h100-rental-prices-cloud-comparison), [Haink](https://haink.org/knowledge/technology/ai-infrastructure-cost-guide)); networking ≈ 10–15% of cluster TCO ([Silicon Analysts](https://siliconanalysts.com/tools/cloud-pricing)); servers ≈ 60% of DC capex ([Epoch AI](https://epoch.ai/data-insights/ai-datacenter-cost-breakdown), snippet); fully-loaded $47–52K/H100 ([H100 Freakonomics](https://substack.tech-talk-cto.com/p/h100-freakonomics-the-economical), unverified). Cross-check†: 3 yr of reserved H100 at $1.89–2.20/hr ≈ $50–58K/slot ([Spheron Lambda pricing](https://www.spheron.network/blog/lambda-cloud-h100-pricing-2026/), [Compute Exchange](https://compute.exchange/blogs/reserved-gpus-contract-length)) |
| **h** — B200-class slot (alt tier) | $58,000 † | $70,000 † | $85,000 † | HGX B200 server $400K–$500K, central ≈$56K/GPU deployed ([Mercatus B200](https://www.mercatus-ai.com/blog/b200-server-price)); DGX B200 appliance $515,410 list ([wccftech](https://wccftech.com/nvidia-blackwell-dgx-b200-price-half-a-million-dollars-top-of-the-line-ai-hardware/)); same overhead multiplier† as above |
| **w** — kW/slot | 1.275 (H100/H200; direct: 10.2 kW ÷ 8) | **1.3** (engine default = rounded 1.275) / 1.40 † with +10% cluster IT overhead | 1.79 (B200: ~14.3 kW ÷ 8) to ~2.0 † cluster-level | [NVIDIA DGX SuperPOD H100 design guide](https://docs.nvidia.com/dgx-superpod/design-guides/dgx-superpod-data-center-design-h100/latest/electrical.html); [DGX H200 datasheet](https://resources.nvidia.com/en-us-dgx-systems/dgx-h200-datasheet); [DGX B200 datasheet](https://resources.nvidia.com/en-us-dgx-systems/dgx-b200-datasheet); +10% cluster storage/switch/optics per [SemiAnalysis Neocloud Playbook](https://newsletter.semianalysis.com/p/ai-neocloud-playbook-and-anatomy) (snippet) |
| **PUE** | 1.09 (Google fleet) | **1.3–1.4** (modern colo; vendor claims, partially unverified) | 1.54 (industry average, flat ~6 yrs) | LOW: [datacenters.google/efficiency](https://datacenters.google/efficiency/); CENTRAL: colo marketing 1.2–1.4 + colo/enterprise 1.4–1.8 via [mgrid summary of Uptime](https://mgrid.org/2025/10/01/uptime-institute-data-center-pue-stagnation-2025-liquid-cooling/) (unverified); HIGH: [Uptime Institute Global Survey 2025](https://intelligence.uptimeinstitute.com/resource/uptime-institute-global-data-center-survey-2025) |
| **s0** — tok/s/GPU, dense-70B tier (Llama-3.3-70B, H100, FP8) | ~300 (strict chat SLO, 91 tok/s/user) | **800–1,500 †** (typical chat SLO 50–72 tok/s/user) | 2,209–2,587 (offline max, 1k/1k; H100 TP2 / H200 TP2) | LOW+CENTRAL: [SemiAnalysis InferenceMAX](https://inferencex.semianalysis.com/compare/llama-3-3-70b-h100-vs-h200) (snippet; 1,465 / 773 / 304 tok/s/GPU at 53/72/91 tok/s/user — central band is a synthesis† of these points); HIGH: [TensorRT-LLM perf-overview docs](https://raw.githubusercontent.com/NVIDIA/TensorRT-LLM/main/docs/source/developer-guide/perf-overview.md) (**fetched**). 8k-input workloads cut all values ~4–5x (same fetched doc: 398 tok/s/GPU at 8192/1024) |
| **s0** — tok/s/GPU, MoE tier (DeepSeek-V3/R1-class, 671B/37B-active) | 80–420 (naive single node / single-node chat SLO) | **1,600–2,200 †** (well-tuned H200 or wide-EP H100) | 2,787 (96xH100 wide-EP decode) | LOW: [dzhsurf community benchmark](https://github.com/dzhsurf/deepseek-v3-r1-deploy-and-benchmarks) (**fetched**; ~78/GPU naive) and [InferenceMAX 8xH200](https://inferencex.semianalysis.com/compare/deepseek-r1-b200-vs-h200) (snippet; 422/GPU at 59 tok/s/user); CENTRAL: [TRT-LLM docs](https://raw.githubusercontent.com/NVIDIA/TensorRT-LLM/main/docs/source/developer-guide/perf-overview.md) (**fetched**; R1 FP8 H200 DEP8 1,627/GPU), [vLLM wide-EP on H200](https://vllm.ai/blog/2025-12-17-large-scale-serving) (snippet; ~2,200/GPU), DeepSeek production decode ~1,850/GPU ([DeepSeek open-infra disclosure](https://github.com/deepseek-ai/open-infra-index/blob/main/202502OpenSourceWeek/day_6_one_more_thing_deepseekV3R1_inference_system_overview.md), **fetched**); HIGH: [LMSYS large-scale EP](https://www.lmsys.org/blog/2025-05-05-large-scale-ep/) (snippet) |
| **u** — utilization | 0.3 † | **0.5–0.6** | 0.8 † | LOW†: synthesis from [ClearML/AIIA survey 2024](https://go.clear.ml/the-state-of-ai-infrastructure-at-scale-2024) (snippet; 15% report <50%, only 7% report >85% peak); CENTRAL: ClearML modal band 51–70% + DeepSeek blended fleet ≈58% of decode capability (arithmetic† on fetched [DeepSeek disclosure](https://github.com/deepseek-ai/open-infra-index/blob/main/202502OpenSourceWeek/day_6_one_more_thing_deepseekV3R1_inference_system_overview.md) totals); HIGH†: DeepSeek 81.6% average node occupancy (same fetched source); diurnal valleys per [Azure LLM inference traces](https://github.com/Azure/AzurePublicDataset/blob/master/AzureLLMInferenceDataset2024.md) (**fetched** dataset; exact peak/trough unverified). No source supports sustained >85% for interactive fleets |
| **mu** — efficiency gain /yr (log) | 0.15 † | **0.25 †** | 1.0 † | Steady-state on tuned stacks: MLPerf v4.0→v4.1 +14%/6 mo software-only ([NVIDIA blog](https://developer.nvidia.com/blog/nvidia-blackwell-platform-sets-new-llm-inference-records-in-mlperf-inference-v4-1), snippet); best-engine 70B offline ~1,250→2,209 tok/s/GPU on same H100s over 2 yrs ≈ +33%/yr† ([LMSYS 2024](https://www.lmsys.org/blog/2024-07-25-sglang-llama3/) snippet vs fetched TRT-LLM docs); HIGH: step-change years — vLLM v0.6 1.8–2.7x ([vLLM blog](https://blog.vllm.ai/2024/09/05/perf-update.html), snippet), SGLang wide-EP 5x ([LMSYS](https://www.lmsys.org/blog/2025-05-05-large-scale-ep/), snippet), realized 2023–26 incl. steps ≈ 0.7–1.6/yr†; Character.AI 33x over ~2.5 yrs ([blog.character.ai](https://blog.character.ai/optimizing-ai-inference-at-character-ai/), snippet) |
| **e0** — $/kWh at meter | 0.083 (industrial) | **0.087 (industrial) / 0.135 (commercial) †** | 0.090 (industrial) / 0.144 (commercial) | Industrial: EIA annual 8.04¢ (2023) → 8.13¢ (2024) → 8.62¢ (2025) via [Statista/EIA](https://www.statista.com/statistics/190680/us-industrial-consumer-price-estimates-for-retail-electricity-since-1970/) (snippet); Feb-2026 ≈9.0¢ ([Utility Dive](https://www.utilitydive.com/news/electricity-retail-prices-february-eia-affordability/818425/), [EUCI](https://www.euci.com/electric-prices-jump-9-year-over-year-on-rising-investments-and-fuel-costs-eia-says/), snippets). Commercial: 13.54¢ Aug-2026 spot ([ChooseEnergy](https://www.chooseenergy.com/electricity-rates-by-state/), snippet), 14.37¢ Feb-2026, 13.5¢ 2026 projected (EIA STEO via snippets — 2024/25 commercial annual anchors **unverified**). Engine's single 0.11 is a blend† of the two tariff classes |
| **gamma** — electricity escalation /yr | 0.02 † | **0.04–0.05 †** | 0.08–0.10 † | LOW: colo contract escalator floor 2.5%/yr ([Morgan Lewis](https://www.morganlewis.com/blogs/datacenterbytes/2026/05/activating-the-colo-model-what-really-matters-in-data-center-colocation-agreements), snippet); CENTRAL: ICF ≈ +4.5%/yr wholesale to 2028 ([Utility Dive](https://www.utilitydive.com/news/us-electricity-prices-19-percent-higher-2028-ICF/727317/)), commercial +4.8% YoY Jun-2026 ([EIA monthly update](https://www.eia.gov/electricity/monthly/update/end-use.php), snippet); HIGH: Dallas Fed +20–30% generation costs by 2028 ([dallasfed.org](https://www.dallasfed.org/research/economics/2026/0305-kay-datacenters), snippet), Feb-2026 all-in +9.0% YoY, commercial +10.7% ([Utility Dive](https://www.utilitydive.com/news/electricity-retail-prices-february-eia-affordability/818425/)); realized 2025 all-in +6.9% ([Goldman via CNBC](https://www.cnbc.com/2026/02/12/electricity-price-data-center-ai-inflation-goldman.html)). Counter-signals capping the high end: PJM price caps, DC-specific tariffs (VA/OH/GA), Texas DC pause ([gov.texas.gov](https://gov.texas.gov/news/post/governor-abbott-directs-puc-and-ercot-to-shield-texans-from-data-center-infrastructure-costs)) |
| **p0** — frontier flagship blended $/Mtok (3:1 in:out †) | $8.00 (GPT-5.6 Sol promo, **unverified vs primary**) | **$10.00** (Claude Opus 5 $5/$25 — **primary fetched**; blend arithmetic†) | $11.25 (Sol list) — tail $20.00 (Claude Fable 5, primary) | LOW: [Startup Fortune](https://startupfortune.com/openai-cuts-gpt-56-sol-api-prices-after-holding-the-line-for-months/), [Technology.org](https://www.technology.org/2026/08/24/openai-gpt-5-6-sol-price-cut-developers/) (snippets); CENTRAL+tail: [platform.claude.com pricing](https://platform.claude.com/docs/en/about-claude/pricing) (**fetched primary**); HIGH: [Morph OpenAI pricing](https://www.morphllm.com/openai-api-pricing) (snippet) |
| **p0 (alt)** — frontier workhorse tier blended | $4.00 (Claude Sonnet 5, primary) | **$4.25 †** | $4.50 (GPT-5.6 Terra; Gemini 3.1 Pro ≤200K) | [platform.claude.com](https://platform.claude.com/docs/en/about-claude/pricing) (fetched); [Unite.AI](https://www.unite.ai/openai-cuts-api-prices-on-its-two-cheaper-gpt-5-6-tiers/), [DevTk Gemini](https://devtk.ai/en/models/gemini-3-1-pro/) (snippets). Central $4.25 is midpoint† |
| **lambda** — frontier-tier list-price decline /yr | ~0–0.2 † (flagship flat/re-inflating, trailing 12 mo) | **0.45 †** (halving ≈ 1.5 yr) | 1.0 † (halving ≈ 0.7 yr) | LOW: flagship blended **rose** ~2.3x GPT-5→Sol-promo Aug-25→Aug-26 (computed† from series in [UseRightAI](https://www.userightai.com/ai-model-price-history), [TokenCost](https://tokencost.app/blog/ai-price-index), [NxCode GPT-5.4](https://www.nxcode.io/resources/news/gpt-5-4-release-date-features-pricing-2026), [tech-insider GPT-5.5](https://tech-insider.org/gpt-5-5-launch-openai-april-23-terminal-bench-2026/) snippets); flagship λ≈0 fit per [arXiv 2511.23455](https://arxiv.org/html/2511.23455v2) (snippet, unverified); CENTRAL: computed† GPT-4→Sol-promo (4.7x/3.42 yr) and Claude Opus $30→$10 Mar-24→Aug-26, both λ=0.45; arXiv mid-tier λ=0.45 (same snippet); HIGH: computed† GPT-4→GPT-5 flagship-cheapest series (10.9x/2.42 yr, λ=0.99) |
| **lambda (alt)** — fixed-capability decline /yr | 1.1 † (3x/yr; halving 7.5 mo) | **2.3** (10x/yr; halving 3.6 mo) | 3.9 † (~50x/yr; halving 2.1 mo; tail λ≈6.8 = 900x/yr) | LOW: [ValueAddVC](https://valueaddvc.com/blog/how-ai-inference-costs-have-dropped-95-in-two-years-and-what-happens-next) 3–5x/yr projection (unverified); CENTRAL: [a16z LLMflation](https://a16z.com/llmflation-llm-inference-cost/) 10x/yr (via [X post](https://x.com/a16z/status/1856760107004035270) snippet); HIGH/tail: [Epoch AI](https://epoch.ai/data-insights/llm-inference-price-trends) 9x–900x/yr, GPT-4-level GPQA ~40x/yr (via [Epoch X thread](https://x.com/EpochAIResearch/status/1900264630473417006) + secondary snippets; Epoch itself flags the tail as unlikely to persist). Cross-check†: GPT-4 $37.50 → cheapest ≥GPT-4 models $0.30–0.45 gives λ = 1.29–1.41 as a hard floor |
| **pOpen0** — hosted open-weight, commodity tier (DeepSeek-V3.2 / Llama-4 / Qwen3 class), blended | $0.23 | **$0.30 †** | $0.39 | LOW: [OpenRouter DeepSeek-V3.2 blend](https://openrouter.ai/deepseek/deepseek-v3.2) (snippet); CENTRAL†: DeepSeek official $0.315 ([NxCode](https://www.nxcode.io/resources/news/deepseek-api-pricing-complete-guide-2026)), DeepInfra $0.29 ([Spheron](https://www.spheron.network/blog/deepseek-vs-llama-4-vs-qwen3/)), Qwen3-235B Together $0.30 ([aipricing.guru](https://www.aipricing.guru/together-pricing/)); HIGH: Together Llama-4 Maverick $0.385 ([Amnic](https://amnic.com/blogs/llama-api-pricing)) — all snippets |
| **pOpen0 (alt)** — best open-weight (DeepSeek V4 Pro / Kimi K2.6 / GLM-5.2), blended | $1.50 | **$2.00 †** | $2.18–2.20 | LOW: Groq Kimi K2 ([CloudZero Groq](https://www.cloudzero.com/blog/groq-pricing/)); CENTRAL†: midpoint incl. Together K2.6 $2.03 ([aipricing.guru](https://www.aipricing.guru/together-pricing/)), GLM-5.2 $2.15 ([Morph Fireworks](https://www.morphllm.com/fireworks-ai-pricing)); HIGH: Fireworks DeepSeek V4 Pro $2.18 (same Morph page) — all snippets |
| **kappa** — quality multiplier | ~1.0 † | **1.15 † (engine default — no sourced bound)** | not bounded † | **No benchmark-gap data was collected by any report — every kappa value is an inference.** Indirect evidence only: enterprise open-weight production share *fell* 19%→13%→11% (2024→late-2025), read as a persistent perceived quality/readiness gap ([Menlo Ventures 2025 report](https://menlovc.com/perspective/2025-the-state-of-generative-ai-in-the-enterprise/) via [Yahoo](https://finance.yahoo.com/news/menlo-ventures-2025-state-generative-123000623.html), snippet); price ratios bound willingness-to-pay at 5x (flagship vs best-open) to 33x (flagship vs commodity-open), computed† from Report 3's tables |
| **D** — one-time dev/integration cost | — | **$250,000 † (engine default — no direct source)** | — | No report sourced a one-time integration cost. Adjacent anchor (Report 6 audit): the companion papers' "$2M ≈ 4–5 engineers" is an **annual** team cost, explicitly not a setup cost (audit defect D1), and is itself flagged not independently checkable. Do not cite D as sourced |
| **m** — MLOps $/yr | $240,000 † (≈0.5 FTE) | **$400,000–500,000 †** (≈1 fully-loaded engineer) | $2,000,000 (4–5-engineer platform team; companion-paper anchor, not independently checkable) | Sole anchor: audited papers' F = $2M/yr for a routing/eval/hosting/monitoring team of 4–5 engineers (Report 6) → ≈$440K/FTE fully loaded (arithmetic†). Scale reality check: AT&T's cost-driven build runs ~530 GPUs ([AMD Newsroom](https://newsroom.amd.com/news/aai-2026-att-open-telco-update/), snippet), implying multi-FTE ops |
| **delta** — GPU value decay /yr | 0.15 † (bull) | **0.25–0.30 †** | 0.45–0.50 † (stress) | LOW†: H100 street ~$35K (2023) → used ~$24.5K (2026) ≈ 0.12/yr (computed from [Compute Exchange](https://compute.exchange/blogs/h100-gpu-price-2026), snippet); CENTRAL†: A100 $15K (2021) → $4–7K used (2024–25) ≈ ln(15,000/6,500)/4.75 ≈ 0.18/yr, plus quoted secondary-market depreciation 20–30%/yr ≈ δ 0.22–0.36 ([Hashrate Index](https://hashrateindex.com/blog/used-gpu-market-pricing-deprecation-secondary-ai/), [Alibaba A100 guide](https://electronics.alibaba.com/product/nvidia-a100-80gb-price), snippets); HIGH†: rental-income decay from scarcity peak $8→~$2.2/hr ≈ 0.5/yr ([latent.space "$2 H100s"](https://www.latent.space/p/gpu-bubble), [Silicon Data index](https://www.silicondata.com/blog/h100-rental-price-over-time), snippets); Burry 2–3-yr economic-life thesis vs CoreWeave 6-yr books ([CNBC](https://www.cnbc.com/2025/11/14/ai-gpu-depreciation-coreweave-nvidia-michael-burry.html), snippet) |
| **sigma** — movable-to-open share | 0.11 (US enterprise production) | **0.20 †** | 0.30–0.45 (developer/routed traffic; top unverified) | LOW: [Menlo 2025 enterprise survey](https://menlovc.com/perspective/2025-the-state-of-generative-ai-in-the-enterprise/) (snippet; and mid-year 13% per [Menlo mid-year update](https://menlovc.com/perspective/2025-mid-year-llm-market-update/)); CENTRAL†: synthesis between the two populations; HIGH: open-weight ≈30% of tokens in the [a16z × OpenRouter 100T-token study](https://a16z.com/state-of-ai/) ([arXiv 2601.10088](https://arxiv.org/abs/2601.10088), snippet); Chinese-origin models >45% of OpenRouter traffic Aug-2026 ([KuCoin recap](https://www.kucoin.com/news/flash/chinese-models-dominate-openrouter-weekly-token-usage-ranking), **unverified precision**) |

## 1.1 Managed-inference provider curve addendum (primary pages fetched 2026-09-01)

The generic `pOpen0` bounds above mix model families and providers. The dashboard's new
`inferenceCloud` path instead holds the model constant—**DeepSeek V4 Pro 0813**, standard
serverless tier—and changes only the provider. These are direct public rate-card observations,
not snippets:

| Provider | Uncached input `I_j` | Cached input `C_j` | Output `O_j` | Primary source |
|---|---:|---:|---:|---|
| Fireworks AI | $1.32 | $0.044 | $3.96 | [Fireworks serverless pricing](https://docs.fireworks.ai/serverless/pricing) |
| Baseten | $1.32 | $0.132 | $3.96 | [Baseten Model API pricing](https://www.baseten.co/pricing/) |
| DeepInfra | $1.30 | $0.10 | $2.60 | [DeepInfra model page](https://deepinfra.com/deepseek-ai/DeepSeek-V4-Pro-0813) |

All prices are dollars per million open-model tokens. The workload blend is

```
b_j = (1−d)[(1−θ)((1−χ)I_j + χC_j) + θO_j]
p_P0 = Σ_j ω_j b_j,  with ω_j = 1/3
```

At the dashboard defaults `θ=.25` (3:1 input:output), `χ=.25` (25% of input cached), and
`d=0`, this gives Fireworks `$1.74075`, Baseten `$1.75725`, and DeepInfra `$1.40000` per
million open tokens; the equal-weight center is **`p_P0=$1.6326667/M`** and the public-quote
band is **`$1.40000–$1.75725/M`**. With the model's `κ=1.15`, the central reference-quality
price is **`$1.8775667/M`**. With `χ=0`, the basket is `$1.8616667/M`; therefore the 25%
cache-hit scenario cuts the blended bill by 12.3%.

`θ`, `χ`, and `d` are workload/contract inputs, not population estimates. The engine defaults
to no contract discount because private quotes are unobservable. Baseten explicitly advertises
volume discounts, Fireworks documents separate batch and US-only pricing, and DeepInfra exposes
priority/flex tiers; none is silently folded into the standard-tier basket. The dashboard shows
the three-provider range and lets the user change mix, cache, discount, and `λ_P` directly.

**Notes on contested parameters (where reports disagree):**

- **p0 and lambda must be paired coherently** (Report 3's key warning): flagship p0 ($10) pairs with the *slow* frontier-list lambda (0–0.45/yr; flagship prices actually re-inflated ~2x since Jan 2026 per [Axis Intelligence](https://axis-intelligence.com/ai-inference-cost-statistics/), unverified). The fast fixed-capability lambda (2.3/yr) is only valid if p0 is interpreted as "cost of a fixed task." The two regimes differ ~5x and the gap has widened since 2025.
- **pOpen0 is tier-dependent**: commodity-open ($0.30) vs best-open ($2.00) differ ~7x. Pick per what the movable workload actually needs.
- **sigma diverges by population** and the divergence is itself a finding: enterprise surveys show a *falling* open share (risk/readiness routing) while routed developer traffic shows a *rising* one (cost routing). An enterprise-facing engine should sit near the low end.
- **e0 splits by siting**: industrial-tariff hyperscale ≈ $0.087 vs commercial-tariff retail colo ≈ $0.135; the engine's 0.11 is a defensible blend† of the two.
- **Blending conventions differ across reports**: Report 3 uses 3:1 input:output; Report 5's worked examples use 4:1 (Sonnet-class ≈ $3.60/Mtok blended vs $4.00 at 3:1). Both are stated assumptions†, not sourced mixes.

## 2. Recommended default changes

| Engine default | Verdict | Recommended | One-line justification |
|---|---|---|---|
| h = 32,000 | **CHANGE** | 45,000 | $32K is below even the sourced *server-only* cost (~$35.6K/GPU, [Mercatus](https://www.mercatus-ai.com/blog/h100-server-price)); all-in with fabric/storage/integration centers at ~$45K (†), corroborated by the $50–58K 3-yr reserved-rental cross-check. |
| wKw = 1.3 | **KEEP** | 1.3 | Matches NVIDIA's DGX H100 max 10.2 kW ÷ 8 = 1.275 exactly ([NVIDIA docs](https://docs.nvidia.com/dgx-superpod/design-guides/dgx-superpod-data-center-design-h100/latest/electrical.html)); add a 1.8 branch for B200 fleets. |
| pue = 1.3 | **KEEP** | 1.3 | Inside the modern-colo band (1.2–1.4), bracketed by Google's 1.09 and the Uptime industry average 1.54. |
| s0 = 600 | **CHANGE** | 1,000 | 600 only matches strict-latency chat serving; a competent 2026 operator at typical chat SLOs gets 800–1,500 dense / 1,600–2,200 MoE-at-scale ([InferenceMAX](https://inferencex.semianalysis.com/compare/llama-3-3-70b-h100-vs-h200), [TRT-LLM docs](https://raw.githubusercontent.com/NVIDIA/TensorRT-LLM/main/docs/source/developer-guide/perf-overview.md)). |
| u = 0.5 | **KEEP** | 0.5 | Sits in the ClearML modal band (51–70%) and matches DeepSeek's blended production ≈58%†; 0.3/0.8 as low/high branches. |
| mu = 0.25 | **KEEP** | 0.25 | Steady-state fixed-hardware software gains of 14–33%/yr are well supported; add a 1.0/yr high branch for step-change scenarios (wide-EP, spec-decode class events). |
| e0 = 0.11 | **KEEP** | 0.11 | A fair blend† of industrial (~0.087) and commercial (~0.135) tariffs; split by siting in sensitivity runs. |
| gamma = 0.06 | **KEEP** | 0.06 | Matches realized 2025–26 escalation (+6.0% industrial 2025, +6.9% all-in per Goldman); forward-central estimates (0.04–0.05) make it mildly conservative, well inside the 0.02–0.10 band. |
| p0 = 5 | **CHANGE** | 10.0 (flagship) or 4.25 (workhorse) | $5 matches no August-2026 tier: flagship blends at $8–11.25 (central $10, primary-verified Opus 5) and workhorse at $4.00–4.50 — pick one interpretation and its matching lambda. |
| lambda = 0.693 | **CHANGE** | 0.45 (paired with flagship/workhorse list p0) | The frontier *list-price* regime halves in ~1.5 yr (λ≈0.45, computed on both OpenAI and Anthropic series); 0.693 (1-yr halving) overstates it — reserve λ=2.3 only for a fixed-capability p0 interpretation. |
| pOpen0 = 0.50 | **CHANGE** | 0.30 (commodity) or 2.00 (best-open) | Commodity-open hosting converges tightly on $0.23–0.39 blended; $0.50 sits above that band but far below the best-open tier ($1.5–2.2) — it matches neither. |
| kappa = 1.15 | **KEEP (flagged)** | 1.15 † | No benchmark-gap evidence was collected; direction is consistent with enterprises' falling open-share, but treat as unsourced and expose it prominently in sensitivity. |
| D = 250,000 | **KEEP (flagged)** | 250,000 † | No direct source exists; the audit (defect D1) specifically warns against conflating one-time setup with the companion papers' $2M/yr *ongoing* team cost. |
| mYr = 240,000 | **CHANGE (weakly sourced)** | ~450,000 † | The only anchor ($2M/yr ≈ 4–5 engineers, Report 6, not independently checkable) prices a fully-loaded engineer at ~$440K/yr; $240K buys roughly half an engineer — keep 240K only if m is marginal cost on an existing platform team. |
| delta = 0.45 | **CHANGE** | 0.30 | Observed secondary-market hardware-value decay is 0.15–0.30/yr (A100 history, quoted 20–30%/yr depreciation); keep 0.45 as the bear/stress branch (rental-income decay from the scarcity peak; Burry's 2–3-yr life) — using 0.45 as central biases the model toward "buy." |

## 3. Enterprise worked examples (reproducible)

Conventions used below (stated so a reader can recompute): blended API $/Mtok at a **4:1** input:output mix per Report 5 — Opus-class ≈ $9/M, Sonnet-class ≈ $3.60/M, Haiku-class ≈ $1.80/M from Anthropic list $5/$25, $2/$10, $1/$5 ([platform.claude.com](https://platform.claude.com/docs/en/about-claude/pricing)). Implied GPU fleet = tokens/mo ÷ (s0 × u × 2.63M s/mo); at recommended s0=1,000 and u=0.5 that is ≈1.3B tok/mo per GPU slot (all fleet/capex figures are arithmetic†, not sourced).

**1. "Foundry trillion-token enterprise"** (F500 running production agents)
- Tokens/month: **~83B** (= 1T/yr; Microsoft reports **300+ customers on track for >1T tokens each in 2026**, up from 250+ two quarters earlier). Sources: [MSFT FY26 Q4 press-release page](https://www.microsoft.com/en-us/investor/earnings/fy-2026-q4/press-release-webcast) (**fetched**) with the token-cohort figure via [Yahoo call highlights](https://finance.yahoo.com/markets/stocks/articles/microsoft-q4-earnings-call-highlights-000355148.html) (snippet); prior-quarter cohort per [Futurum](https://futurumgroup.com/insights/microsoft-q2-fy-2026-cloud-surpasses-50b-azure-up-38-cc/).
- Suggested engine inputs: V = 83e9 tok/mo; p0 = 4.25 (workhorse); pOpen0 = 0.30; sigma = 0.11–0.20; kappa = 1.15†.
- Checks: API bill at Sonnet-class ≈ $300K/mo — consistent with Microsoft's separately disclosed fast-growing cohort spending **>$1M/quarter** on Foundry. Build side†: ~63 GPU slots ≈ 8 HGX nodes ≈ $2.8M capex at h=$45K.

**2. "Agent-platform SaaS vendor" (Salesforce-scale)**
- Tokens/month: **~9.5T** (28.6T processed in FQ1-27, quarter ended Apr 30 2026, +152% QoQ; 3.8B agentic work units). Source: [Benioff on X](https://x.com/Benioff/status/2059881098386280734) (snippet, primary post); [Motley Fool transcript](https://www.fool.com/earnings/call-transcripts/2026/05/28/salesforce-crm-q1-2027-earnings-transcript/).
- Suggested engine inputs: V = 9.5e12 tok/mo; sigma high (0.30+, cost-pressured agentic traffic); pOpen0 = 0.30.
- Checks: Sonnet-class list ≈ $34M/mo (~$410M/yr) against Agentforce ARR >$1B — list-price buying would eat 20–40% of AI revenue, vs ICONIQ's "inference ≈23% of AI product costs" benchmark ([ICONIQ State of AI](https://www.iconiq.com/growth/reports/state-of-ai-2026); note the unresolved costs-vs-revenue denominator conflict flagged by [SaaStr](https://saastr.com/inference-costs-average-23-of-revenue-at-ai-b2b-companies-how-will-you-pay-for-it)) — making routing/negotiated rates/self-hosting near-mandatory. Build side†: ~7,200 GPU slots ≈ $325M capex at h=$45K.

**3. "Support-automation fintech" (Klarna-shape)**
- Tokens/month: **2.3B–23B, central ~6B †** — 2.3M conversations/mo ([Klarna press release](https://www.klarna.com/international/press/klarna-ai-assistant-handles-two-thirds-of-customer-service-chats-in-its-first-month/), snippet; [OpenAI case study](https://openai.com/index/klarna/)) × an **assumed** 1K–10K tokens/conversation (central 2.5K — flagged assumption†, not sourced).
- Suggested engine inputs: V = 6e9 tok/mo; p0 = 1.80–4.25 (Haiku/Sonnet class); sigma near 0 (quality-gated support).
- Checks: even the high case bills $8K–$83K/mo (Sonnet-class) — under 0.3% of Klarna's claimed $40M/yr value, so build-vs-buy here is about control/quality, not inference cost. (Caveat: Klarna walked back the pure-substitution framing in May 2025 — use volumes, discount savings claims; [Twig recap](https://www.twig.so/blog/klarna-ai-customer-support-efficiency).) Build side†: ~5 GPU slots — below any sensible build threshold.

**4. "Consumer-platform self-hoster" (Roblox-shape)**
- Tokens/month: **~17B** (4B tokens/week served, up from 1.5B/wk at launch). Source: [Roblox newsroom, Sep 2024](https://about.roblox.com/newsroom/2024/09/running-ai-inference-at-scale-in-the-hybrid-cloud) (fetch blocked; corroborated via [ZenML LLMOps DB](https://www.zenml.io/llmops-database/building-a-hybrid-cloud-ai-infrastructure-for-large-scale-ml-inference), snippet).
- Suggested engine inputs: V = 17e9 tok/mo; pOpen0 = 0.30; sigma high (already open-model, vLLM-based); mu = 0.25 (Roblox reported ~2x gains from vLLM alone).
- Checks: API-equivalent Haiku-class ≈ $31K/mo, Sonnet-class ≈ $62K/mo; rented build ≈ 3 H100s ≈ $4.4K–$9.3K/mo at $1.99–$4.25/hr ([IntuitionLabs rental comparison](https://intuitionlabs.ai/articles/h100-rental-prices-cloud-comparison)) using the ~5.7B tok/mo/H100 heuristic ([GIGAGPU](https://gigagpu.com/is-self-hosting-llms-cheaper-than-apis/), **unverified heuristic**) — or ~13 owned slots at central s0·u†. Roblox's stated drivers were latency/throughput control, not price.

**Bonus build-side anchor — AT&T:** >1T tokens processed on **~530 GPUs (430 AMD MI300X)** running open models (Phi-4, gpt-oss-120B, Gemma), claiming "tens of millions of dollars" saved vs frontier APIs — the best-documented cost-driven open-model build ([AMD Newsroom](https://newsroom.amd.com/news/aai-2026-att-open-telco-update/), [SDxCentral](https://www.sdxcentral.com/news/att-processes-1t-tokens-using-amd-open-ai-telco-model/), snippets; the "90% Anthropic-cost cut" claim appears only in [cryptobriefing](https://cryptobriefing.com/att-open-source-models-reduce-anthropic-costs/) and is **unverified**).

## 4. Paper audit verdict

Adversarial audit of the companion papers ("Two Gates and a Half-Life" + "When Open Source Gets Cheap Enough"), all figures independently recomputed (δ(s)=0.9(1−s)², D(σ)=0.9[1−(1−σ)³]/3, F=$2M/yr, k=$1.5M/yr, p_f=$3e−6/token).

**Tally: ~26 claims checked, 19 reproduced cleanly, 7 defects — 4 substantive (D1–D4), 3 minor (D5–D7).**

Substantive defects and corrections:
1. **D1 — "$2M setup" mislabels an annual cost as one-time.** F is defined per-period ($2M/yr team cost) and the 3.4T-token break-even only holds under F-annual; labeling it "setup" (vs "$1.5M ongoing") contradicts the math. If F were truly one-time, break-even would drop toward ~2.5–2.8T. Correction: "$2M/yr team cost and $1.5M/yr per unit of share routed."
2. **D2 — threshold gap misattributed entirely to k.** With k=0 the two-gate threshold is already 2.22T vs the single-gate 1.48T; the 2.32x total gap decomposes roughly evenly (in logs) into 1.50x from the γ=2 substitutability curvature and 1.55x from k. Correction: the difference is due jointly to k and the curvature; k alone raises 2.22T→3.44T.
3. **D3 — "4.6 pp moves back on a 30% price cut" holds at exactly one V.** Δσ* = 0.195·G varies from 14.6 pp (V=10¹²) to 1.5 pp (V=10¹⁴) within the paper's own table; 4.6 pp is the V=10¹³ case only. Correction: state the V, or give Δσ* ≈ 0.195·G.
4. **D4 — the "5.94-year" feedback half-life is not a half-life under the paper's own dynamics.** 5.94 is the instantaneous decay constant frozen at G=0.5; solving the paper's ODE from G=0.5 to 0.25 gives **5.39 years**. ~10% overstatement ("nearly five and a half," not "nearly six"); the unfed 3.96-yr figure is exact.

Minor defects: **D5** — σ* at V=10¹⁴ misrounded (0.925464 → prints "0.926"; should be 0.925). **D6** — the same electricity cost share (8.51%) rounded to "about 9%" and "about 8%" three sentences apart; use 8.5% in both. **D7** — "weaker by roughly an order of magnitude for any plausible demand elasticity" contradicts the adjacent table, whose ε=3 row is 3.9x; correct to "4x–24x depending on elasticity."

Cleanly reproduced (selection): σ* = 0.255/0.764/0.000 at V = 10¹²/10¹³/10¹¹; participation fail/pass at 10¹²/10¹³; V* = 3.4425×10¹² vs single-gate 1.4815×10¹² ("more than a factor of two" = 2.32x); yield lifts +23.6%/+40.6%; unfed half-life 3.96 yr; melt law and driver signs; $30K chip from $7.5K at 75% margin; s_e = 0.085; capacity-elasticity ratios 23.5/11.8/5.9/3.9; "91% is the chip" (91.5%); "roughly thirty times" for the margin channel (reproduces as 32.3x under the natural parameterization, though only 10.8x under an alternative markup-multiplier parameterization — defensible but parameterization-dependent). Not independently checkable: the N=4×10⁵ simulation peak-location table (no code) and the "four to five engineers ≈ $2M" cost anchor.

## 5. Sources

Deduplicated across all six reports; all accessed 2026-08-28. Unless noted "fetched," figures were verified via search snippets only (egress proxy blocked direct fetches).

**Fetched primary sources:**
- https://platform.claude.com/docs/en/about-claude/pricing
- https://raw.githubusercontent.com/NVIDIA/TensorRT-LLM/main/docs/source/developer-guide/perf-overview.md
- https://github.com/deepseek-ai/open-infra-index/blob/main/202502OpenSourceWeek/day_6_one_more_thing_deepseekV3R1_inference_system_overview.md
- https://github.com/dzhsurf/deepseek-v3-r1-deploy-and-benchmarks
- https://github.com/sgl-project/sglang/issues/7452
- https://github.com/Azure/AzurePublicDataset/blob/master/AzureLLMInferenceDataset2024.md
- https://github.com/SemiAnalysisAI/InferenceX
- https://www.microsoft.com/en-us/investor/earnings/fy-2026-q4/press-release-webcast

**GPU hardware, depreciation, power, cloud rental:**
- https://compute.exchange/blogs/h100-gpu-price-2026
- https://compute.exchange/blogs/reserved-gpus-contract-length
- https://compute.exchange/blogs/reserved-gpus-march-20206
- https://www.cloudzero.com/blog/h100-gpu-cost/
- https://intuitionlabs.ai/articles/nvidia-ai-gpu-pricing-guide
- https://intuitionlabs.ai/articles/h100-rental-prices-cloud-comparison
- https://intuitionlabs.ai/articles/nvidia-hgx-data-center-requirements
- https://www.mercatus-ai.com/blog/h100-server-price
- https://www.mercatus-ai.com/blog/h100-gpu-cost
- https://www.mercatus-ai.com/blog/h200-price
- https://www.mercatus-ai.com/blog/h200-server-price
- https://www.mercatus-ai.com/blog/b200-server-price
- https://electronics.alibaba.com/question/nvidia-h100-price-guide-buy-vs-rent-in-2026
- https://electronics.alibaba.com/buyingguides/nvidia-a100-80gb-price-guide-2026
- https://electronics.alibaba.com/product/nvidia-a100-80gb-price
- https://www.gmicloud.ai/en/blog/nvidia-h100-gpu-pricing-2026-rent-vs-buy-cost-analysis
- https://jarvislabs.ai/blog/h100-price
- https://jarvislabs.ai/blog/h200-price
- https://jarvislabs.ai/blog/a100-price
- https://www.trgdatacenters.com/resource/nvidia-h200-price-guide/
- https://www.hyperbolic.ai/blog/h200-price
- https://northflank.com/blog/how-much-does-an-nvidia-b200-gpu-cost
- https://siliconanalysts.com/analysis/nvidia-b200-blackwell-cost-breakdown
- https://siliconanalysts.com/tools/cloud-pricing
- https://www.spheron.network/blog/nvidia-b200-cloud-pricing-2026/
- https://www.spheron.network/blog/aws-h100-pricing-2026/
- https://www.spheron.network/blog/lambda-cloud-h100-pricing-2026/
- https://aws.amazon.com/blogs/aws/announcing-up-to-45-price-reduction-for-amazon-ec2-nvidia-gpu-accelerated-instances/
- https://www.buildmvpfast.com/blog/gpu-cloud-cost-comparison-runpod-lambda-labs-coreweave-2026
- https://getdeploying.com/gpus/nvidia-h100
- https://getdeploying.com/gpus/nvidia-b200
- https://hashrateindex.com/blog/used-gpu-market-pricing-deprecation-secondary-ai/
- https://www.ebay.com/shop/nvidia-h100-gpu?_nkw=nvidia+h100+gpu
- https://www.latent.space/p/gpu-bubble
- https://www.silicondata.com/blog/h100-rental-price-over-time
- https://www.cnbc.com/2025/11/14/ai-gpu-depreciation-coreweave-nvidia-michael-burry.html
- https://finance.yahoo.com/news/michael-burrys-latest-warning-could-174332312.html
- https://docs.nvidia.com/dgx-superpod/design-guides/dgx-superpod-data-center-design-h100/latest/electrical.html
- https://www.sunbirddcim.com/blog/can-your-racks-support-nvidia-dgx-h100-systems
- https://www.sunbirddcim.com/blog/nvidia-h200-power-requirements-can-your-racks-support-them
- https://resources.nvidia.com/en-us-dgx-systems/dgx-h200-datasheet
- https://resources.nvidia.com/en-us-dgx-systems/dgx-b200-datasheet
- https://serverflow.ru/upload/iblock/a42/dc97yzl8xfyvegx7g5pr0nj73dqpb34p/%D0%9F%D0%BE%D0%BB%D1%8C%D0%B7%D0%BE%D0%B2%D0%B0%D1%82%D0%B5%D0%BB%D1%8C%D1%81%D0%BA%D0%B8%D0%B9%20%D0%B3%D0%B0%D0%B9%D0%B4%20NVIDIA%20DGX%20B200.pdf
- https://newsletter.semianalysis.com/p/ai-neocloud-playbook-and-anatomy
- https://newsletter.semianalysis.com/p/how-much-do-gpu-clusters-really-cost
- https://epoch.ai/data-insights/ai-datacenter-cost-breakdown
- https://pytorchtoatoms.substack.com/p/metas-24k-h100-cluster-capextco-and
- https://substack.tech-talk-cto.com/p/h100-freakonomics-the-economical
- https://gpuaas.com/blog/real-tco-gpu-cluster-2026
- https://haink.org/knowledge/technology/ai-infrastructure-cost-guide
- https://wccftech.com/nvidia-blackwell-dgx-b200-price-half-a-million-dollars-top-of-the-line-ai-hardware/
- https://www.topcpu.net/en/news/nvidia-dgx-b200-makes-retail-debut-equipped-with-8-b200-gpus

**Electricity, PUE, colocation, escalation:**
- https://www.statista.com/statistics/190680/us-industrial-consumer-price-estimates-for-retail-electricity-since-1970/
- https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_5_3
- https://www.eia.gov/electricity/monthly/update/end-use.php
- https://www.eia.gov/electricity/annual/pdf/epa.pdf
- https://www.eia.gov/outlooks/steo/
- https://www.eia.gov/outlooks/steo/pdf/steo_full.pdf
- https://www.eia.gov/todayinenergy/detail.php?id=67664
- https://www.utilitydive.com/news/electricity-retail-prices-february-eia-affordability/818425/
- https://www.euci.com/electric-prices-jump-9-year-over-year-on-rising-investments-and-fuel-costs-eia-says/
- https://www.utilitydive.com/news/electricity-prices-demand-to-continue-rising-in-2026-eia/805395/
- https://www.chooseenergy.com/electricity-rates-by-state/
- https://www.americanactionforum.org/insight/how-much-are-electricity-prices-rising-and-why/
- https://www.rtoinsider.com/110662-pjm-capacity-prices-hit-price-cap/
- https://insidelines.pjm.com/pjm-auction-procures-134311-mw-of-generation-resources-supply-responds-to-price-signal/
- https://www.pjm.com/-/media/DotCom/about-pjm/newsroom/2026-releases/20260714-pjm-capacity-auction-procures-138318-mw-of-generation-resources.pdf
- https://insidelines.pjm.com/pjm-capacity-auction-procures-138318-mw-of-generation-resources-as-work-continues-to-address-growing-electricity-demand/
- https://www.pjm.com/-/media/DotCom/markets-ops/rpm/rpm-auction-info/2027-2028/2027-2028-bra-report.pdf
- https://modoenergy.com/research/en/pjm-capacity-auction-2028-2029-reliability-price-cap-elcc
- https://avalonenergy.us/2026/07/pjm-2028-2029-base-residual-auction-clears-at-price-cap/
- https://ieefa.org/resources/projected-data-center-growth-spurs-pjm-capacity-prices-factor-10
- https://www.utilitydive.com/news/pjm-interconnection-capacity-auction-prices/753798/
- https://www.utilitydive.com/news/data-centers-pjm-capacity-auction-market-monitor/801780/
- https://www.utilitydive.com/news/data-centers-pjm-capacity-auction/808951/
- https://www.nrdc.org/bio/tom-rutigliano/building-data-centers-without-breaking-pjm
- https://www.scc.virginia.gov/about-the-scc/newsreleases/release/scc-issues-order-on-dev-biennial-review-2025/scc-rules-in-dev-biennial-review-case.html
- https://cardinalnews.org/2025/11/26/regulators-approve-dominion-energy-rate-increase/
- https://insideclimatenews.org/news/07012026/virginia-regulators-approve-new-dominion-rates/
- https://virginiamercury.com/2025/09/03/dominion-proposes-higher-utility-rates-new-rate-class-for-data-centers/
- https://virginiamercury.com/2026/02/10/bill-would-put-more-energy-costs-on-data-centers-slash-residential-customerss-rates/
- https://www.usnews.com/news/top-news/articles/2026-08-11/virginia-data-center-boom-pushes-dominion-deeper-into-costly-power-market
- https://www.utilitydive.com/news/data-center-demand-spike-could-drive-79-ercot-price-hike-in-2027-eia/814804/
- https://www.texaspolicy.com/press/new-report-texas-transmission-costs-expected-to-more-than-double-adding-100-annually-to-average-electric-bills
- https://www.texaspolicy.com/wp-content/uploads/2026/01/2026-01-LP-Transmission-Costs-BennettPiracci.pdf
- https://gov.texas.gov/news/post/governor-abbott-directs-puc-and-ercot-to-shield-texans-from-data-center-infrastructure-costs
- https://electricityplans.com/texas-electricity-trends/
- https://www.vorys.com/publication-public-utilities-commission-of-ohio-authorizes-tariff-for-aep-ohios-data-center-customers-requires-end-of-moratorium-on-new-services-for-data-centers
- https://ohiocapitaljournal.com/2026/02/20/aep-ohio-says-new-data-center-tariff-is-working-critics-arent-buying-it/
- https://www.utilitydive.com/news/aep-ohio-data-center-load-tariff-oma-manufacturers/811583/
- https://utilitiesformyhome.com/electric/news-electric/aep-ohio-rate-adjustment-data-center-tariff-2026/
- https://stopohiodatacenters.org/data-center-electric-bill-ohio
- https://psc.ga.gov/site/downloads/datacenterfactsheet.pdf
- https://www.georgiapower.com/rate-changes.html
- https://www.cbsnews.com/atlanta/news/georgia-regulators-approve-huge-electric-generation-increase-for-data-centers/
- https://georgiarecorder.com/briefs/georgia-powers-plan-for-powering-data-centers-is-up-for-a-final-vote-friday/
- https://www.altenergyse.com/blog/2026/april/the-truth-behind-georgia-power-s-rate-freeze-how/
- https://www.cbre.com/press-releases/fast-growing-north-american-data-center-market-set-records-in-2025
- https://www.cbre.com/press-releases/north-american-data-center-vacancy-rates-hit-record-low-despite-significant-supply-growth
- https://www.cbre.com/insights/books/north-america-data-center-trends-h2-2025
- https://www.cbre.com/insights/reports/global-data-center-trends-2026
- https://datacenterhawk.com/resources/fundamentals/colocation-data-center-pricing-a-2026-beginner-s-guide
- https://brightlio.com/colocation-pricing/
- https://datacenterscope.com/colocation/retail-vs-wholesale/
- https://encoradvisors.com/data-center-colocation-pricing/
- https://www.morganlewis.com/blogs/datacenterbytes/2026/05/activating-the-colo-model-what-really-matters-in-data-center-colocation-agreements
- https://intelligence.uptimeinstitute.com/resource/uptime-institute-global-data-center-survey-2025
- https://datacenter.uptimeinstitute.com/rs/711-RIA-145/images/2025.Annual.Survey.Report.pdf
- https://mgrid.org/2025/10/01/uptime-institute-data-center-pue-stagnation-2025-liquid-cooling/
- https://datacenters.google/efficiency/
- https://www.dallasfed.org/research/economics/2026/0305-kay-datacenters
- https://www.foxnews.com/politics/monthly-bill-americans-cant-avoid-quietly-surging-emerging-industry-data
- https://www.cnbc.com/2026/02/12/electricity-price-data-center-ai-inflation-goldman.html
- https://www.goldmansachs.com/insights/articles/us-data-center-power-demand-projected-to-double-by-2027
- https://www.utilitydive.com/news/us-electricity-prices-19-percent-higher-2028-ICF/727317/
- https://www.utilitydive.com/news/icf-sees-25-load-growth-by-2030-up-to-40-price-increase/748711/
- https://www.consumerreports.org/data-centers/ai-data-centers-impact-on-electric-bills-water-and-more-a1040338678/
- https://fortune.com/2026/05/19/data-centers-electricity-costs-us-public-opinion/
- https://fortune.com/2026/07/26/data-centers-electricity-costs-cheaper-7billion-buildout-ai-demand/
- https://www.tomshardware.com/tech-industry/data-centers/after-severe-76-percent-electricity-price-hikes-due-to-ai-data-centers-virginia-requires-firms-to-pay-for-all-dedicated-upstream-electrical-infrastructure-state-regulators-crack-down-governor-says-move-will-save-civilians-hundreds-of-millions-of-dollars

**LLM API token prices and decline rates:**
- https://www.morphllm.com/openai-api-pricing
- https://www.cloudzero.com/blog/openai-pricing/
- https://www.unite.ai/openai-cuts-api-prices-on-its-two-cheaper-gpt-5-6-tiers/
- https://startupfortune.com/openai-cuts-gpt-56-sol-api-prices-after-holding-the-line-for-months/
- https://www.technology.org/2026/08/24/openai-gpt-5-6-sol-price-cut-developers/
- https://www.eesel.ai/blog/gpt-5-6-pricing
- https://openai.com/index/gpt-5-6/
- https://openai.com/index/advancing-the-price-performance-frontier-with-gpt-5-6/
- https://pricepertoken.com/pricing-page/model/openai-gpt-5
- https://openrouter.ai/openai/gpt-5
- https://www.nxcode.io/resources/news/gpt-5-4-release-date-features-pricing-2026
- https://tech-insider.org/gpt-5-5-launch-openai-april-23-terminal-bench-2026/
- https://tokenmix.ai/blog/gpt-5-5-release-date-spud
- https://devtk.ai/en/blog/gemini-api-pricing-guide-2026/
- https://devtk.ai/en/models/gemini-3-1-pro/
- https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-3-7-flash/
- https://www.morphllm.com/gemini-api-pricing
- https://benchlm.ai/google/api-pricing
- https://www.anthropic.com/news/claude-opus-4-5
- https://venturebeat.com/ai/anthropics-claude-opus-4-5-is-here-cheaper-ai-infinite-chats-and-coding
- https://www.infoworld.com/article/4095894/anthropics-claude-opus-4-5-pricing-cut-signals-a-shift-in-the-enterprise-ai-market.html
- https://openrouter.ai/anthropic/claude-3-opus
- https://www.prompthub.us/models/claude-3-opus
- https://www.nxcode.io/resources/news/deepseek-api-pricing-complete-guide-2026
- https://devtk.ai/en/models/deepseek-v3-2/
- https://openrouter.ai/deepseek/deepseek-v3.2
- https://www.cloudzero.com/blog/deepseek-pricing/
- https://venturebeat.com/ai/deepseeks-new-v3-2-exp-model-cuts-api-pricing-in-half-to-less-than-3-cents
- https://www.spheron.network/blog/deepseek-vs-llama-4-vs-qwen3/
- https://www.getmaxim.ai/bifrost/llm-cost-calculator/provider/novita/model/deepseek-v3.2
- https://novita.ai/pricing
- https://www.aipricing.guru/blog/novita-ai-api-pricing-guide-2026/
- https://www.aipricing.guru/together-pricing/
- https://checkthat.ai/brands/together-ai/pricing
- https://www.morphllm.com/fireworks-ai-pricing
- https://www.morphllm.com/deepinfra-pricing
- https://www.cloudzero.com/blog/groq-pricing/
- https://amnic.com/blogs/llama-api-pricing
- https://epoch.ai/data-insights/llm-inference-price-trends
- https://x.com/EpochAIResearch/status/1900264630473417006
- https://a16z.com/llmflation-llm-inference-cost/
- https://x.com/a16z/status/1856760107004035270
- https://arxiv.org/html/2511.23455v2
- https://arxiv.org/html/2603.28576v1
- https://axis-intelligence.com/ai-inference-cost-statistics/
- https://benchlm.ai/llm-pricing-trends
- https://introl.com/blog/inference-unit-economics-true-cost-per-million-tokens-guide
- https://voxbooster.com/blog/ai-inference-cost-statistics-2026/
- https://valueaddvc.com/blog/how-ai-inference-costs-have-dropped-95-in-two-years-and-what-happens-next
- https://www.cloudzero.com/blog/gpt-4-api-cost/
- https://www.userightai.com/ai-model-price-history
- https://tokencost.app/blog/ai-price-index
- https://epoch.ai/blog/top-10-data-insights-and-gradient-updates-of-2025
- https://claude.com/pricing

**Serving throughput, utilization, efficiency:**
- https://www.lmsys.org/blog/2025-05-05-large-scale-ep/
- https://x.com/lmsysorg/status/1919465296966123721
- https://www.lmsys.org/blog/2024-07-25-sglang-llama3/
- https://www.lmsys.org/blog/2025-10-14-sa-inference-max/
- https://inferencex.semianalysis.com/compare/llama-3-3-70b-h100-vs-h200
- https://inferencex.semianalysis.com/compare/deepseek-r1-b200-vs-h200
- https://newsletter.semianalysis.com/p/inferencemax-open-source-inference
- https://vllm.ai/blog/2025-12-17-large-scale-serving
- https://blog.vllm.ai/2024/09/05/perf-update.html
- https://vllm.ai/blog/2025-01-27-v1-alpha-release
- https://developer.nvidia.com/blog/boost-llama-3-3-70b-inference-throughput-3x-with-nvidia-tensorrt-llm-speculative-decoding
- https://forums.developer.nvidia.com/t/boost-llama-3-3-70b-inference-throughput-3x-with-nvidia-tensorrt-llm-speculative-decoding/317167
- https://developer.nvidia.com/blog/tensorrt-llm-speculative-decoding-boosts-inference-throughput-by-up-to-3-6x/
- https://developer.nvidia.com/blog/nvidia-tensorrt-llm-supercharges-large-language-model-inference-on-nvidia-h100-gpus/
- https://developer.nvidia.com/blog/nvidia-blackwell-platform-sets-new-llm-inference-records-in-mlperf-inference-v4-1
- https://blogs.nvidia.com/blog/blackwell-inferencemax-benchmark-results/
- https://dstack.ai/blog/h200-mi300x-deepskeek-benchmark/
- https://verda.com/blog/deploy-deepseek-r1-on-8x-nvidia-h200
- https://go.clear.ml/the-state-of-ai-infrastructure-at-scale-2024
- https://go.clear.ml/state-of-ai-infrastructure-report-25-26
- https://www.hpcwire.com/bigdatawire/this-just-in/new-global-survey-unveils-the-state-of-ai-infrastructure-at-scale-exposing-gpu-utilization-challenges/
- https://blog.character.ai/optimizing-ai-inference-at-character-ai/
- https://www.microsoft.com/en-us/research/wp-content/uploads/2024/03/GPU_Power_ASPLOS_24.pdf
- https://dl.acm.org/doi/10.1109/ISCA59077.2024.00019
- https://www.maginative.com/article/mlperf-inference-v4-0-nvidia-reigns-supreme-intel-shows-impressive-generative-ai-performance-gains/
- https://venturebeat.com/ai/anthropic-challenges-openai-with-affordable-batch-processing
- https://www.respan.ai/articles/anthropic-message-batches-api
- https://www.mercatus-ai.com/blog/deepseek-peak-off-peak-hours
- https://developers.redhat.com/articles/2025/04/28/performance-boosts-vllm-081-switching-v1-engine
- https://cerebrium.ai/blog/benchmarking-vllm-sglang-tensorrt-for-llama-3-1-api

**Token volumes, enterprise spend, case studies, movable share:**
- https://tomtunguz.com/earnings-microsoft-2025-04-30/
- https://www.microsoft.com/en-us/investor/events/fy-2025/earnings-fy-2025-q3
- https://www.microsoft.com/en-us/investor/events/fy-2025/earnings-fy-2025-q4
- https://www.microsoft.com/en-us/investor/events/fy-2026/earnings-fy-2026-q2
- https://futurumgroup.com/insights/microsoft-q2-fy-2026-cloud-surpasses-50b-azure-up-38-cc/
- https://finance.yahoo.com/markets/stocks/articles/microsoft-q4-earnings-call-highlights-000355148.html
- https://newsletter.semianalysis.com/p/microsofts-ai-strategy-deconstructed
- https://blog.google/innovation-and-ai/sundar-pichai-io-2026/
- https://blog.google/company-news/inside-google/message-ceo/alphabet-earnings-q2-2025/
- https://blog.google/company-news/inside-google/message-ceo/alphabet-earnings-q2-2026/
- https://www.shacknews.com/article/149205/google-3-2-quadrillion-monthly-ai-tokens
- https://gigazine.net/gsc_news/en/20260520-google-monthly-tokens-processed/
- https://www.theregister.com/ai-ml/2026/05/19/google-touts-tokenmaxxing-huge-capex-and-ai-agents-at-i/o/5242983
- https://www.investing.com/news/company-news/alphabet-q2-2026-slides-24-revenue-growth-cloud-surges-despite-capex-93CH-4807148
- https://www.businesswire.com/news/home/20260526953416/en/OpenRouter-Raises-$113-Million-CapitalG-led-Series-B-as-Weekly-Volume-Explodes-to-25T-Tokens
- https://openrouter.ai/rankings
- https://openrouter.ai/state-of-ai
- https://a16z.com/state-of-ai/
- https://arxiv.org/abs/2601.10088
- https://technode.com/2026/08/05/deepseek-v4-flash-tops-openrouter-weekly-ranking-with-7-22-trillion-tokens/
- https://www.kucoin.com/news/flash/chinese-models-dominate-openrouter-weekly-token-usage-ranking
- https://memeburn.com/ai-agents-use-5x-more-tokens-than-humans-what-openrouter-data-reveals/
- https://aidailypost.com/news/openai-api-token-usage-rises-from-6-bn-15-bn-per-minute-straining
- https://businessanalytics.substack.com/p/openais-api-hits-15-billion-tokens
- https://x.com/Benioff/status/2059881098386280734
- https://www.fool.com/earnings/call-transcripts/2026/05/28/salesforce-crm-q1-2027-earnings-transcript/
- https://www.salesforce.com/news/press-releases/2026/02/25/fy26-q4-earnings/
- https://newsroom.servicenow.com/press-releases/details/2026/ServiceNow-Reports-Second-Quarter-2026-Financial-Results/default.aspx
- https://azure.microsoft.com/en-us/blog/att-and-microsoft-scale-trillion-token-workloads-with-microsoft-foundry-and-amd/
- https://newsroom.amd.com/news/aai-2026-att-open-telco-update/
- https://www.sdxcentral.com/news/att-processes-1t-tokens-using-amd-open-ai-telco-model/
- https://cryptobriefing.com/att-open-source-models-reduce-anthropic-costs/
- https://www.klarna.com/international/press/klarna-ai-assistant-handles-two-thirds-of-customer-service-chats-in-its-first-month/
- https://openai.com/index/klarna/
- https://www.twig.so/blog/klarna-ai-customer-support-efficiency
- https://www.usefini.com/blog/klarna-automates-two-thirds-of-customer-service-with-ai-assistant
- https://about.roblox.com/newsroom/2024/09/running-ai-inference-at-scale-in-the-hybrid-cloud
- https://www.zenml.io/llmops-database/building-a-hybrid-cloud-ai-infrastructure-for-large-scale-ml-inference
- https://www.scmp.com/tech/tech-trends/article/3329921/airbnb-picks-alibabas-qwen-over-chatgpt-win-chinese-open-source-ai
- https://www.bloomberg.com/news/articles/2026-05-20/airbnb-s-chesky-says-us-misunderstanding-use-of-chinese-open-source-ai-models
- https://www.spheron.network/blog/sovereign-ai-cloud-2026-buyers-guide-data-residency/
- https://www.premai.io/blog/self-hosted-llm-guide-setup-tools-cost-comparison-2026/
- https://menlovc.com/perspective/2025-mid-year-llm-market-update/
- https://menlovc.com/perspective/2025-the-state-of-generative-ai-in-the-enterprise/
- https://www.globenewswire.com/news-release/2025/07/31/3125037/0/en/enterprise-llm-spend-reaches-8-4b-as-anthropic-overtakes-openai-according-to-new-menlo-ventures-report-on-llm-market.html
- https://www.globenewswire.com/news-release/2025/12/09/3202258/0/en/Menlo-Ventures-2025-State-of-Generative-AI-Report-Enterprise-Investment-Hit-37B-in-2025-Tripling-in-One-Year.html
- https://finance.yahoo.com/news/menlo-ventures-2025-state-generative-123000623.html
- https://www.iconiq.com/growth/reports/state-of-ai-2026
- https://cdn.prod.website-files.com/65d0d38fc4ec8ce8a8921654/6979532decf89bd3df2163b0_ICONIQ_Analytics_Insights_2026_State_of_AI_Bi-Annual_Snapshot.pdf
- https://cdn.prod.website-files.com/65d0d38fc4ec8ce8a8921654/6a46e77c8e76fa41d3eba385_ICONIQ%20Analytics%20-%20State%20of%20AI%20July%202026.pdf
- https://saastr.com/inference-costs-average-23-of-revenue-at-ai-b2b-companies-how-will-you-pay-for-it
- https://www.saasletter.com/p/iconiq-state-of-ai-2026
- https://fourweekmba.com/ai-ramp-a16z-ai-spend-per-employee-headcount-growth/
- https://gigagpu.com/is-self-hosting-llms-cheaper-than-apis/
- https://newsletter.pragmaticengineer.com/p/how-ai-is-changing-software-engineering
