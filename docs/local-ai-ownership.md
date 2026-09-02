# Local AI ownership: DGX Spark and the 2026 Mac desktop ladder

**Hardware and price snapshot:** 2026-09-02  
**Video:** Nate B. Jones, [“Apple's New Mac Line is Built Around Local AI. The Bet Is You'd Rather Own Than Rent.”](https://youtu.be/1lO8aNSLPJc) (2026-08-31)  
**Transcript source:** [Podscan episode transcript](https://podscan.fm/podcasts/ai-news-amp-strategy-daily-with-nate-b-jones/episodes/apples-new-mac-line-is-built-around-local-ai-the-bet-is-youd-rather-own-than-rent)

This is a timestamped synthesis, not a verbatim republication of the transcript. The public transcript appears machine-generated and contains recognition errors, so the video remains the authority for wording and intent.

## What the episode argues

| Time | Transcript-derived point | How the dashboard represents it |
|---:|---|---|
| 00:00–01:51 | Apple has organized its desktop refresh around local AI, while frontier agents continue moving toward larger cloud computers. The strategic choice is not purely Apple versus NVIDIA; it is how much intelligence a user owns versus rents. | Local hardware gets a distinct ownership curve beside hosted-open and managed-inference curves. |
| 02:49–03:40 | The line spans M6 and M5 Pro Mac mini systems through M5 Max and M5 Ultra Mac Studio systems. Memory and bandwidth, not just chip-generation names, define the ladder. | Every profile exposes starting memory, maximum configurable memory, and bandwidth. A memory-fit gate runs before a cost curve is drawn. |
| 05:42–06:34 | Local hardware does not need to hold every frontier model. It needs to handle a large enough share of useful recurring work that purchase plus electricity can beat an uncertain token bill. | The curve includes purchase, electricity, depreciation/resale, output volume, model quality, and falling cloud prices. |
| 06:34–08:18 | Useful models are moving down the cost curve. More memory supports larger contexts and multiple concurrent local agents; Apple is offering a progression rather than one universal machine. | The model-weight footprint and memory reserve are inputs. Starting configurations that cannot fit the selected footprint are omitted and identified in the table. |
| 08:18 onward | Local and cloud systems are complements: route routine/private work locally and use frontier capability where it earns its premium. | Local ownership is compared with both commodity hosted open weights and the same managed-inference basket used elsewhere in Token Yield. |

The transcript mentions the 128GB M5 Max and 512GB M5 Ultra ceilings. Those are configure-to-order limits. The cost curves deliberately use **starting U.S. prices and starting memory**, because Apple does not publish one stable public price for every build-to-order combination in the technical-spec table. Maximum memory is displayed for context only; it is not used for fit or paired with the base price in the arithmetic.

## Hardware inputs

| Curve | Starting U.S. price | Starting / maximum memory | Starting bandwidth | Input-power ceiling used |
|---|---:|---:|---:|---:|
| NVIDIA DGX Spark | $4,699 | 128 / 128GB | 273GB/s | 240W power supply |
| Mac mini, M6 | $899 | 16 / 32GB | 153GB/s | 155W maximum continuous |
| Mac mini, M5 Pro | $1,699 | 24 / 64GB | 307GB/s | 155W maximum continuous |
| Mac Studio, M5 Max | $2,499 | 36 / 128GB | 460GB/s | 480W maximum continuous |
| Mac Studio, M5 Ultra | $5,499 | 96 / 512GB | 1.2TB/s | 480W maximum continuous |

Apple announced these Macs on 2026-08-25. They begin arriving on 2026-09-22; the 512GB Mac Studio configuration follows in late October. The curves are therefore announcement-date scenarios, not independent post-ship benchmarks.

Primary sources:

- Apple, [Mac mini announcement, pricing, and availability](https://www.apple.com/newsroom/2026/08/apple-unveils-a-more-powerful-mac-mini-featuring-the-all-new-m6-and-m5-pro/)
- Apple, [Mac mini technical specifications](https://www.apple.com/mac-mini/specs/)
- Apple, [Mac Studio announcement, pricing, and availability](https://www.apple.com/newsroom/2026/08/apple-introduces-new-mac-studio-with-m5-max-and-m5-ultra/)
- Apple, [Mac Studio technical specifications](https://www.apple.com/mac-studio/specs/)
- NVIDIA, [DGX Spark marketplace listing](https://marketplace.nvidia.com/en-us/enterprise/personal-ai-supercomputers/dgx-spark/)
- NVIDIA, [DGX Spark hardware guide](https://docs.nvidia.com/dgx/dgx-spark/hardware.html)

## Common basis

The local chart uses **dollars per million generated, reference-quality output tokens**. This avoids comparing a decode throughput measured in output tokens per second directly with a cloud rate blended across input and output tokens.

Variables added for the local model:

| Symbol | Meaning | Default |
|---|---|---:|
| \(W\) | Quantized model-weight footprint, GB | 12GB |
| \(\rho\) | Memory reserved for the OS, runtime, context/KV cache, and safety | 20% |
| \(\eta\) | Realized share of the bandwidth roofline | 55% |
| \(a\) | Hours per day generating output tokens | 8h |
| \(\ell\) | Active draw as a share of the official input-power ceiling | 65% |
| \(\zeta\) | Idle draw during the other \(24-a\) hours | 8% |

Existing Glacier inputs still apply: electricity \(e_0\), electricity escalation \(\gamma\), software efficiency improvement \(\mu\), continuous discount rate \(r\), resale decay \(\delta\), quality multiplier \(\kappa\), and cloud-price melt rates.

## 1. Memory-fit gate

For profile \(j\), a curve exists only if the weights fit after the memory reserve:

\[
W \le M_j(1-\rho).
\]

This is intentionally stricter than comparing model weights with the headline RAM number. It leaves room for the operating system, inference runtime, KV cache, prompt state, and other applications. It is still a coarse gate: real context capacity depends on architecture, precision, cache quantization, and concurrency.

## 2. Decode-throughput roofline

Batch-1 autoregressive decode is often memory-bandwidth-bound: the model weights are approximately streamed once for every generated token. With memory bandwidth \(B_j\), the physical upper bound is \(B_j/W\). The dashboard discounts that bound by a user-controlled realized-bandwidth factor \(\eta\):

\[
\widehat{s}_{j,0}=\eta\frac{B_j}{W}
\qquad\text{output tokens/second}.
\]

Software and model improvements reuse the Glacier efficiency rate:

\[
\widehat{s}_j(t)=\widehat{s}_{j,0}e^{\mu t}.
\]

For month \(i\), with \(d_m=365.25/12\) days:

\[
q_{j,i}=\frac{\widehat{s}_j(t_i)\,3600\,a\,d_m}{10^6}
\qquad\text{million open-model output tokens}.
\]

This is an auditable estimate, **not a benchmark claim**. It does not credit DGX Spark separately for CUDA ecosystem support, FP4 tensor compute, training/fine-tuning, prefill speed, or batching. It also does not credit Apple’s Neural Accelerators separately. Those can matter substantially; the shared bandwidth roofline isolates sustained single-stream decode economics.

## 3. Electricity

Let \(\overline{w}_j\) be the official power ceiling in kW. Monthly energy is:

\[
kWh_{j,i}=\overline{w}_j\left[\ell a+\zeta(24-a)\right]d_m.
\]

With electricity escalation:

\[
E_{j,i}=kWh_{j,i}\,e_0e^{\gamma t_i}.
\]

Apple publishes maximum continuous system power, while NVIDIA publishes a 240W power-supply rating and a 140W GB10 SoC TDP. Neither is an inference wall-power benchmark. The \(\ell\) and \(\zeta\) controls make that conversion explicit instead of treating a nameplate ceiling as continuous measured draw.

## 4. Purchase, resale, and present value

If \(P_j\) is the starting price, the resale assumption after \(\tau\) years is:

\[
R_j(\tau)=P_je^{-\delta\tau}.
\]

At the end of ownership month \(n\), \(\tau_n=(n+1)/12\). Electricity is booked at each month start and a hypothetical resale is credited at that month end:

\[
C^{PV}_{j,n}
=P_j
+\sum_{i=0}^{n}e^{-rt_i}E_{j,i}
-e^{-r\tau_n}R_j(\tau_n).
\]

The discounted reference-equivalent output is:

\[
Q^{PV,ref}_{j,n}
=\frac{1}{\kappa}\sum_{i=0}^{n}e^{-rt_i}q_{j,i}.
\]

The plotted local ownership curve is therefore:

\[
\boxed{
L_{j,n}
=\frac{C^{PV}_{j,n}}{Q^{PV,ref}_{j,n}}
=\kappa\,
\frac{P_j+\sum_{i=0}^{n}e^{-rt_i}E_{j,i}-e^{-r\tau_n}P_je^{-\delta\tau_n}}
{\sum_{i=0}^{n}e^{-rt_i}q_{j,i}}
}
\]

The resale credit is why this is an economic ownership cost rather than cash paid to date. Set resale decay very high to approximate no recoverable value.

## 5. Converting cloud rates to the same output basis

The managed-inference basket first calculates a workload-blended rate per million total billed tokens:

\[
b_j=(1-d)\left[(1-\theta)((1-\chi)I_j+\chi C_j)+\theta O_j\right].
\]

Here \(\theta\) is the output share of total billed tokens. Because local throughput is generated output tokens per second, a blended cloud rate must be divided by \(\theta\) and then quality-adjusted:

\[
c_{P,out}^{ref}(t)=\frac{\kappa}{\theta}\,b_0e^{-\lambda_Pt},
\qquad
c_{O,out}^{ref}(t)=\frac{\kappa}{\theta}\,p^O_0e^{-\lambda_Ot}.
\]

The dashed chart lines are cumulative discounted averages, not the spot prices:

\[
\overline{c}_{n}
=\frac{\sum_{i=0}^{n}e^{-rt_i}q_{j,i}c(t_i)}
{\sum_{i=0}^{n}e^{-rt_i}q_{j,i}}.
\]

Because all hardware profiles share \(\mu\), the proportional \(q_{j,i}\) scale cancels and one cloud benchmark curve serves every profile.

## 6. Break-even

The table reports the first month when buying the same generated output from the managed-inference basket has accumulated at least as much discounted cost as owning the device, including the resale credit available at that time:

\[
n_j^*=\min\left\{n:\sum_{i=0}^{n}e^{-rt_i}q_{j,i}\frac{b_0e^{-\lambda_Pt_i}}{\theta}
\ge C^{PV}_{j,n}\right\}.
\]

If no such month exists inside the selected horizon, the table says “not in horizon.” Break-even is workload- and assumption-specific; it is not a product ranking.

## Default-scenario reading

At the dashboard defaults (12GB weights, 20% reserve, 55% realized bandwidth, 8 generate-hours/day, three years), all five starting configurations pass the memory gate. The model estimates these batch-1 decode rates: DGX Spark 12.5 tok/s; M6 mini 7.0; M5 Pro mini 14.1; M5 Max Studio 21.1; M5 Ultra Studio 55.0. Those values come directly from \(\eta B/W\), so changing either \(W\) or \(\eta\) updates every curve consistently.

The result should be read as a routing decision:

1. Pick a local model and measure its real weights, context use, decode speed, and wall power.
2. Replace \(W\), \(\eta\), \(\ell\), and \(\zeta\) with those measurements.
3. Set \(\kappa\) for the work the local model can actually complete.
4. Compare the resulting local curve with the cloud route that can deliver the same quality and latency.

## Exclusions and cautions

- Starting prices exclude tax, memory/storage upgrades, displays, networking, support, financing, and resale transaction costs.
- Maximum configurable memory is informational until its actual configuration price is entered; the engine never combines maximum RAM with the starting price.
- The roofline models sustained decode, not time to first token, prefill, training, fine-tuning, image/video generation, speculative decoding, batching, or multi-agent contention.
- Unified memory capacity is not fully available to weights. The reserve is a simplification, not a context-length guarantee.
- Cloud prices can include service, elasticity, newer models, reliability, and zero idle capacity. Local machines can provide privacy, data locality, offline operation, and predictable marginal cost. These product differences remain outside the dollar-per-token curve.
- The managed basket currently uses DeepSeek V4 Pro 0813 public prices. A 12GB local model is not quality-equivalent by default; \(\kappa\) must carry that gap, and some work should remain in the cloud.
- Apple’s 2026 systems were announced but had not shipped at the snapshot date. Replace the roofline with independent measurements when they exist.
