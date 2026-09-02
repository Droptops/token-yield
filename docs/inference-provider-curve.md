# Managed inference provider curve

*A same-model, workload-aware BUY curve for Fireworks AI, Baseten, and DeepInfra.*

This addendum closes a specific gap in the Glacier Model. A generic hosted-open price is
useful as a commodity lower-bound screen, but it is not an apples-to-apples estimate of
what a production workload would pay an inference cloud. Public inference bills distinguish
uncached input, cached input, and output; the mix differs by workload; enterprise discounts
are private; and public quotes vary across providers even for the same model.

The dashboard therefore keeps the generic `hostedOpen` curve and adds a separate
`inferenceCloud` curve. It holds the model and service tier fixed, computes each provider's
workload-specific price, then displays an equal-weight center and the full public-quote range.

## 1. Rate-card snapshot

Model: **DeepSeek V4 Pro 0813**. Tier: public standard serverless. Snapshot date:
**2026-09-01**. Prices are USD per million open-model tokens.

| Provider | Uncached input `I_j` | Cached input `C_j` | Output `O_j` | Primary source |
|---|---:|---:|---:|---|
| Fireworks AI | 1.32 | 0.044 | 3.96 | [Serverless pricing](https://docs.fireworks.ai/serverless/pricing) |
| Baseten | 1.32 | 0.132 | 3.96 | [Model API pricing](https://www.baseten.co/pricing/) |
| DeepInfra | 1.30 | 0.10 | 2.60 | [DeepSeek V4 Pro 0813](https://deepinfra.com/deepseek-ai/DeepSeek-V4-Pro-0813) |

Using one model removes model-quality and architecture differences from the provider
comparison. The Glacier Model's quality conversion `κ` is applied later, once, to both the
managed BUY path and the self-hosted BUILD path.

## 2. Workload blend

Let:

- `θ = T_out / (T_in + T_out)` be output's share of all billed tokens;
- `χ = T_cached / T_in` be the cached share of input tokens;
- `d` be a documented contract discount to the public rate card;
- `ω_j ≥ 0` be the routing weight for provider `j`, with `Σ_j ω_j = 1`.

Provider `j`'s effective input price and total workload price are

```text
E_j(χ) = (1−χ)I_j + χC_j
b_j(θ,χ,d) = (1−d)[(1−θ)E_j(χ) + θO_j].                 (1)
```

The order is deliberate. Cache discounts only input. Output is blended after the cached
and uncached input legs are resolved. A contract discount then applies to the bill. No
cached-output category is invented.

The routed basket and public-quote interval are

```text
p_P0 = Σ_j ω_j b_j,                                      (2)
p_P0^low  = min_j b_j,
p_P0^high = max_j b_j.                                  (3)
```

The neutral dashboard default is `ω_j = 1/3`. The center is not claimed to be market share;
it represents a diversified workload with no preferred provider. The band prevents the
center from disguising the actual cross-provider dispersion.

## 3. Time curve and token basis

The current model retains the Glacier Model's transparent exponential scenario for future
list prices:

```text
p_P(t) = p_P0 e^(−λ_P t)                                (4)
```

where `λ_P` is a user-controlled scenario, not an estimated historical coefficient. The
provider range evolves under the same scenario:

```text
p_P^low(t)  = p_P0^low  e^(−λ_P t),
p_P^high(t) = p_P0^high e^(−λ_P t).                     (5)
```

Provider quotes are per **open** token. If `κ` open tokens are needed for one reference-
quality token outcome, the managed BUY comparator is

```text
c_P(t) = κ p_P(t)                                        (6)
```

in dollars per million reference tokens. This is the same basis as the frontier curve and
the dashboard's all-in BUILD curve. Multiplying only the provider price, or only BUILD
demand, would mix denominations; the engine applies `κ` to both.

## 4. BUY present value

For movable reference demand

```text
Q(t) = σQ_0 e^(gt),                                      (7)
```

the continuous managed-provider BUY present value is

```text
PV_P^cont
  = ∫_0^T κp_P0 e^(−λ_P t) · σQ_0y e^(gt) · e^(−rt) dt
  = κp_P0 σQ_0y · [1 − e^(−(λ_P+r−g)T)]/(λ_P+r−g),       (8)
```

with removable singularity `λ_P+r−g = 0` giving `κp_P0 σQ_0y T`.

The dashboard uses month-start prices. With `M=12T` and
`ρ_P=e^((g−λ_P−r)/12)`, its exact discrete value is

```text
PV_P = κp_P0 σQ_0m · (1−ρ_P^M)/(1−ρ_P),                 (9)
```

or `κp_P0 σQ_0m M` when `ρ_P=1`. Verification vector J reproduces (9) to machine
precision.

## 5. Glacier margin and melt time

Self-hosted electricity per open million tokens is

```text
ε(t) = ε_0 e^((γ−μ)t).                                  (10)
```

The managed-provider variable margin per reference million tokens is

```text
a_P(t) = κ[p_P0 e^(−λ_Pt) − ε_0 e^((γ−μ)t)].             (11)
```

When the margin starts positive and `λ_P+γ−μ>0`, it melts at

```text
t_P* = ln[p_P0/ε_0]/(λ_P+γ−μ).                           (12)
```

`κ` cancels from (12), as it must: changing the unit from open tokens to reference-quality
tokens scales both provider price and self-hosted electricity by the same factor. It does
not cancel from fleet sizing, capex, total BUY dollars, or total BUILD dollars.

Over `τ=min(T,t_P*)`, the continuous harvestable provider glacier is

```text
G_P = κσQ_0y {
        p_P0 [1−e^(−(λ_P+r−g)τ)]/(λ_P+r−g)
      − ε_0  [1−e^(−(r+μ−γ−g)τ)]/(r+μ−γ−g)
      }.                                                 (13)
```

Each quotient becomes `τ` on its zero-rate manifold. The implementation uses the exact
month-start sum over positive-margin months, consistent with every other cash flow. Equation
(13) assumes owned capacity can serve the modeled movable demand. The engine is stricter:
it applies the margin only to `min(reference demand, self-served open tokens / κ)`. Overflow
is bought on both paths, so it contributes zero provider-vs-BUILD margin.

## 6. Comparative statics

From (1):

```text
∂b_j/∂χ = (1−d)(1−θ)(C_j−I_j) < 0,                      (14)
∂b_j/∂d = −[(1−θ)E_j+θO_j] < 0,                         (15)
∂b_j/∂θ = (1−d)(O_j−E_j).                               (16)
```

Equation (16) is positive for every rate in this snapshot, so output-heavy workloads make
managed inference more expensive. Higher cache hit or a real contract discount makes BUY
cheaper and therefore reduces BUILD's NPV advantage.

For routing weights,

```text
∂p_P0/∂ω_j = b_j                                        (17)
```

subject to `Σω_j=1`; moving weight from provider `k` to cheaper provider `j` changes the
basket by `b_j−b_k`. A perfect cost router lands on the lower edge of the displayed band,
while redundancy, regional, latency, or capacity constraints generally place the realized
price inside it.

Ignoring overflow, `∂NPV_adv/∂p_P0>0`: a higher provider bill strengthens BUILD. With
overflow, comparator-price changes cancel on tokens bought by both paths, leaving only the
discounted self-served volume. Faster provider melt has the opposite sign:
`∂NPV_adv/∂λ_P<0`.

## 7. Default arithmetic

At `θ=.25`, `χ=.25`, and `d=0`:

```text
Fireworks effective input = .75(1.32)+.25(.044) = 1.001
Fireworks b_F            = .75(1.001)+.25(3.96) = 1.74075

Baseten effective input  = .75(1.32)+.25(.132) = 1.023
Baseten b_B              = .75(1.023)+.25(3.96) = 1.75725

DeepInfra effective input= .75(1.30)+.25(.10) = 1.000
DeepInfra b_D            = .75(1.000)+.25(2.60) = 1.40000

p_P0 = (1.74075+1.75725+1.40000)/3 = 1.6326666667
range = [1.40000, 1.75725]
κp_P0 at κ=1.15 = 1.8775666667 per reference Mtok.       (18)
```

At `χ=0`, the three blends are `1.98`, `1.98`, and `1.625`; their mean is
`1.8616666667`. The default 25% input-cache hit therefore saves

```text
1 − 1.6326666667/1.8616666667 = 12.300%.                 (19)
```

At the Glacier defaults `ε_0=0.1032777778` and
`λ_P+γ−μ=.462+.06−.25=.272`, so

```text
t_P* = ln(1.6326666667/.1032777778)/.272 = 10.1491 years. (20)
```

The 3-year scaleup run produces `G_P=$237,956`, toll `$1,584,324`, and
`NPV_adv=−$1,348,537`; the enterprise run produces `G_P=$1,973,504`, toll
`$4,097,149`, and `NPV_adv=−$2,124,858`. These values sit between the frontier and
commodity-hosted screens, giving the intended three-layer picture.

## 8. What this curve does not claim

- It is not a quality ranking or valuation of Fireworks AI, Baseten, or DeepInfra.
- It does not treat public list price as a private enterprise quote.
- It excludes batch pricing, priority/flex/US-only tiers, dedicated endpoints, GPU-hour
  commitments, egress, support, latency, uptime, residency, and capacity guarantees.
- It uses one future melt rate for transparency; it does not claim the three vendors will
  cut prices in lockstep.
- It is dated. Refresh the rate card before making a procurement decision.

The generic `hostedOpen` curve remains useful as a commodity lower bound. The provider
basket answers a different question: *what does this exact open model cost across named
production inference clouds under my actual token mix?*
