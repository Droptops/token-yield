# The Glacier Model — the version for the nerds

*Build-vs-buy economics for LLM inference: power chips, token prices, dev cost, and the
melting margin. Deterministic, month-start convention, continuous rates. Companion to
[Two Gates and a Half-Life](https://claude.ai/code/artifact/aaa96ee8-841e-450f-90a1-52865e584372)
(sector model of open-weight substitution) and
[When Open Source Gets Cheap Enough](https://claude.ai/code/artifact/40c001e6-97f2-4796-bf2f-a538cfdf8142)
(its plain-English version). This paper is the firm-level cash-flow instrument: given your
volume, the chips, the power, and the people, when does self-hosting open models beat buying
tokens — and for how long before the advantage melts?*

Every number in this document is reproduced by `dashboard/verify.mjs` against the engine
embedded in `index.html`. Nothing here is hand-computed.

---

## 0. TL;DR — the decision rule

Self-hosting is a bet that a **melting margin** can pay off a **fixed toll** before it is gone.

```
BUILD  ⟺  Gate 1:  a(0) > 0                       (route at the margin)
      AND  Gate 2:  G ≥ D + PV(capex) + PV(m) − PV(salvage)   (pay the toll)

a(t) = c(t) − κ·ε(t)                    the per-token glacier margin
G    = ∫₀^min(T,t*) a(t)·Q(t)·e^(−rt) dt   the harvestable glacier
t*   = ln(c₀ / κε₀) / (λ + γ − μ)          the melt time
```

Gate 1 without Gate 2 is the **mid-size trap**: worth routing at the margin, not worth the
fixed cost. Most mid-sized deployments live there.

## 1. Symbols and units

| Symbol | Meaning | Unit |
|---|---|---|
| `t` | time from decision date | yr |
| `T` | horizon | yr |
| `r` | discount rate, continuous | /yr |
| `Q(t) = σ·Q₀·e^(gt)` | movable reference-token demand | Mtok/month |
| `σ` | movable share of workload (open models can handle it) | – |
| `g` | demand growth, continuous | /yr |
| `p(t) = p₀·e^(−λt)` | frontier API blended price | $/Mtok |
| `λ = ln 2 / t_half` | frontier price melt rate | /yr |
| `p_o(t) = p_o₀·e^(−λ_o t)` | hosted open-weight price (per *open* token) | $/Mtok |
| `I_j, C_j, O_j` | provider `j` public prices: uncached input, cached input, output | $/Mtok |
| `θ` | output share of all provider-billed tokens | – |
| `χ` | cached share of provider input tokens | – |
| `d` | negotiated discount to public provider rates | – |
| `ω_j` | routing weight for provider `j`, `Σ_j ω_j = 1` | – |
| `b_j` | workload-blended price at provider `j` | $/Mtok open |
| `p_P(t) = p_P₀·e^(−λ_P t)` | managed-inference basket price, `p_P₀ = Σ_jω_jb_j` | $/Mtok open |
| `κ ≥ 1` | quality multiplier: open tokens needed per reference token | – |
| `c(t)` | comparator price per **reference** Mtok: `p(t)`, `κ·p_o(t)`, or `κ·p_P(t)` | $/Mtok |
| `N` | GPUs owned | – |
| `h` | all-in cost per GPU slot (card + server share + install) | $ |
| `D` | one-time dev/integration cost | $ |
| `m` | ongoing MLOps + maintenance | $/yr |
| `s(t) = s₀·e^(μt)` | effective output tokens/sec per GPU | tok/s |
| `μ` | serving + open-model efficiency gain on owned hardware | /yr |
| `u ∈ (0,1]` | utilization: busy fraction of powered time | – |
| `w` | server power per GPU slot, drawn whenever on | kW |
| `φ` | PUE | – |
| `e(t) = e₀·e^(γt)` | electricity price | $/kWh |
| `γ` | electricity escalation — **the upward force vector** | /yr |
| `ε(t)` | electricity cost per open token served | $/Mtok |
| `δ` | hardware market-value decay | /yr |
| `v` | value realized per reference Mtok (Token Yield numerator) | $/Mtok |

Constants: `Y = 31,557,600 s/yr` (365.25 d), `8,766 h/yr`, month = `Y/12 s = 730.5 h`.

## 2. Assumptions (and which way each one biases)

1. **Deterministic exponential paths** for prices, demand, electricity, efficiency. No
   volatility, no option value of waiting. *Biases toward building* (waiting has value when
   λ is uncertain).
2. **Month-start pricing convention**: month `i` spans `t_i = i/12`; all of month `i`'s
   volume is charged at month-start prices and discounted at `e^(−r·t_i)`. Overstates both
   paths' PV by the same second-order factor `(x/12)/(1−e^(−x/12))` per rate `x`; the
   *comparison* is nearly unbiased.
3. **Idle power is paid.** The fleet draws `N·w·φ` kW every hour whether busy or not; only
   the busy fraction `u` produces tokens. This is why `u` sits in ε's denominator. *Biases
   against building* at low utilization — honestly.
4. **Only the movable share σ competes.** Tokens open models cannot serve are bought on
   both paths and cancel out of the comparison. σ is the block (γ→0) approximation of the
   heterogeneous-substitutability curve in *Two Gates* §2 — see §7.
5. **Quality parity via κ**: the open model needs κ reference-equivalent tokens per
   frontier token's outcome. Scalar, workload-averaged. *Optimistic for agentic chains,
   pessimistic for extraction.*
6. **Fleet purchased in tranches** as demand arrives ("staged", the default), each tranche
   at price `h` (no hardware deflation on later tranches — *biases against building* under
   growth), salvaging at `h·e^(−δ(T−t_buy))`. "Upfront" mode (fleet sized at t=0 for
   horizon peak) exists for closed-form comparability.
7. **Overflow above capacity is bought at the comparator price** — the hybrid is built in.
8. **No terminal value beyond salvage**; the option to keep operating past T is ignored.
   *Biases against building.*
9. **λ is exogenous.** Defensive pricing (frontier cuts in response to migration) makes λ
   endogenous and *slows* the sector melt — see *Two Gates* §4. In this model a larger λ
   always shrinks your glacier: the incumbent's price cuts are a brake on your build case.
10. **The managed-inference curve is a same-model public-rate snapshot, not a company
    valuation model.** Fireworks AI, Baseten, and DeepInfra are compared on DeepSeek V4 Pro
    0813 standard serverless rates as of 2026-09-01. Equal routing weights are the neutral
    default; cache hit, output mix, contract discount, and future price melt are explicit
    scenario inputs. Latency tiers, private deployments, batch discounts, and negotiated
    commitments are excluded unless entered through `d`.

## 3. The BUY path

Monthly cost is `c_i·q_i` with `c_i = c₀·e^(−λ_c t_i)`, `q_i = σQ₀·e^(g t_i)`. With
`ρ = e^((g−λ_c−r)/12)`, the exact discounted sum over `M = 12T` months is geometric:

```
PV_buy = c₀·σQ₀·(1 − ρ^M)/(1 − ρ)          [ = c₀·σQ₀·M when ρ = 1 ]
```

Continuous check (the engine's sum converges to this as steps shrink):

```
PV_buy^cont = c₀·σQ₀ᵧ · (1 − e^(−(λ_c+r−g)T)) / (λ_c + r − g)      Q₀ᵧ = 12·σQ₀
```

with the removable singularity `λ_c + r − g → 0` giving `c₀·σQ₀ᵧ·T`. For `T → ∞` this
converges iff `λ_c + r > g`. Verified: `verify.mjs` vector B matches the geometric form to
1e-12 relative.

### 3.1 The managed-inference provider curve

A single “hosted open” sticker price hides the largest billing asymmetries in real
serverless inference. For provider `j`, let `θ` be output tokens divided by total billed
tokens and `χ` the cache-hit fraction of input tokens. The workload-blended public quote is

```
b_j = (1−d)·[(1−θ)·((1−χ)I_j + χC_j) + θO_j]
p_P₀ = Σ_j ω_j b_j,       Σ_j ω_j = 1
p_P(t) = p_P₀·e^(−λ_P t)
c_P(t) = κ·p_P(t)         $/reference Mtok
```

This order of operations matters: cache applies only to input, output has its own rate,
the contract discount applies to the resulting bill, and `κ` converts the open-token bill
to the reference-quality basis only after blending.

The reproducible 2026-09-01 rate card uses the same DeepSeek V4 Pro 0813 model and standard
tier at all three providers:

| Provider | `I_j` | `C_j` | `O_j` | `b_j` at `θ=.25`, `χ=.25`, `d=0` |
|---|---:|---:|---:|---:|
| [Fireworks AI](https://docs.fireworks.ai/serverless/pricing) | 1.32 | 0.044 | 3.96 | **1.74075** |
| [Baseten](https://www.baseten.co/pricing/) | 1.32 | 0.132 | 3.96 | **1.75725** |
| [DeepInfra](https://deepinfra.com/deepseek-ai/DeepSeek-V4-Pro-0813) | 1.30 | 0.10 | 2.60 | **1.40000** |
| Equal-weight basket | — | — | — | **1.63267** |

Thus the dashboard's new managed-inference line starts at `$1.63267/M` open tokens, with a
public-quote band of `$1.40000–$1.75725/M`; at `κ=1.15` that is `$1.87757/M` reference
tokens. The zero-cache control is `$1.86167/M` open tokens, so the assumed 25% input cache
hit lowers the basket by 12.3%. `χ` is not a market fact—replace it with workload telemetry.
All four numbers are checked at machine precision in `verify.mjs` vector I.

## 4. The BUILD path

**Electricity per token.** One GPU-hour consumes `w·φ` kWh and produces `3600·s(t)·u`
tokens. Therefore

```
ε(t) = w·φ·e(t) / (3600·s(t)·u)   $/token  =  (w·φ·e₀ / (3600·s₀·u)) · e^((γ−μ)t)
ε₀ = w·φ·e₀ / (3600·s₀·u) · 10⁶   $/Mtok (open tokens)
```

Dimensional check: `kW·(kWh/kW·h)·($/kWh) / (tok/h) = $/tok`. At central defaults
(`w=1.3, φ=1.3, e₀=$0.11, s₀=1000 tok/s, u=0.5`): **ε₀ = $0.103 per million open tokens**
— matching the engine's `epsilon0()` exactly. Electricity moves at net rate `γ − μ`:
escalation pushes up, efficiency on your own metal pushes down.

**Fleet.** Capacity per GPU-month is `s(t)·u·(Y/12)` tokens. Staged purchasing:
`N_i = max(N_{i−1}, ⌈κq_i / cap_i⌉)`, each increment paid at month `i` and salvaged from
its own purchase date. Fleet electricity is paid on **all** owned GPUs (assumption 3), so
early oversizing under `upfront` mode is genuinely expensive — the staircase in the
dashboard's race chart is this.

**Totals.**

```
PV_build = D + PV(capex) + Σᵢ e^(−r tᵢ)·[ N_i·w·φ·730.5·e(t_i) + m/12 + c_i·overflow_i ] − PV(salvage)
NPV_adv  = PV_buy − PV_build          BUILD ⟺ NPV_adv ≥ 0
```

Break-even month: first `i` where cumulative discounted BUY ≥ cumulative discounted BUILD
(D and capex land when incurred; salvage credits at the final month).

## 5. Break-even structure

- **Max dev cost.** D enters additively: `D_max = D + NPV_adv`. (Vector E: exact.)
- **Min viable scale.** Within a fixed-GPU band, `NPV_adv(Q₀)` rises with volume, but each
  additional GPU causes a downward jump: the feasible set is a sawtooth, not necessarily
  one interval. A divisible-fleet relaxation first skips only the region that provably cannot
  work; the engine then walks every integer fleet breakpoint and returns the **first** feasible
  crossing. It does not use an invalid global bisection. At central defaults vs the frontier API:
  **≈ 18 B movable tokens/month**. Against hosted open-weights: **no scale suffices**
  (see §10 — the capex per token alone exceeds the hosted margin).

  For the safe skip, let `B` be discounted BUY dollars per unit of `Q₀`, `K_frac` the
  discounted variable BUILD cost per unit under perfectly divisible GPUs, and
  `F = D + PV(m)`. Then

  ```text
  NPV_frac(Q₀) = Q₀(B−K_frac) − F,
  NPV_integer(Q₀) ≤ NPV_frac(Q₀).
  ```

  The inequality follows because each rounded-up GPU adds nonnegative net capex, power,
  and depreciation cost. If `B−K_frac≤0`, no integer fleet can work at any scale; otherwise
  no crossing can occur below `F/(B−K_frac)`. The exact breakpoint walk starts there.
- **Break-even horizon** `T_be` solves `NPV_adv(T) = 0`; generally a root-find. Special
  case `g = 0, γ = μ, λ_c = 0`: linear-in-T closed form
  `T_be = (D + H − V) / (12σQ₀(c₀ − κε₀) − m)` per discounted-rate adjustment.
- **Signs of sensitivities** (all verified in the dashboard's tornado):
  `∂NPV_adv/∂λ < 0` (faster melt kills the build case), `∂/∂e₀ < 0`, `∂/∂γ < 0`,
  `∂/∂u > 0`, `∂/∂s₀ > 0`, `∂/∂κ < 0`, `∂/∂D = −1`, `∂/∂h < 0`, `∂/∂m < 0`.
  On the provider path, `∂NPV_adv/∂χ < 0` and `∂NPV_adv/∂d < 0` because cache hits and
  contract discounts make buying cheaper; `∂NPV_adv/∂θ > 0` for this rate card because
  output tokens cost more than effective input tokens.

## 6. The glacier equations

**Margin (the glacier's thickness).** Per reference token, variable-cost basis:

```
a(t) = c(t) − κ·ε(t) = c₀·e^(−λ_c t) − κ·ε₀·e^((γ−μ)t)
```

**Melt time.** `a(t*) = 0` gives

```
t* = ln( c₀ / (κ·ε₀) ) / (λ_c + γ − μ)
```

| Case | Condition | Meaning |
|---|---|---|
| melts | `c₀ > κε₀`, `λ_c+γ−μ > 0` | margin open now, gone at t* |
| never melts | `c₀ > κε₀`, `λ_c+γ−μ ≤ 0` | margin grows — harvest forever |
| already melted | `c₀ ≤ κε₀`, `λ_c+γ−μ ≥ 0` | buying is cheaper per token from day one |
| opens later | `0 < c₀ ≤ κε₀`, `λ_c+γ−μ < 0` | margin negative now, turns positive at the formula's nonnegative root t* |

Central defaults vs frontier: `t* = ln(4.25/0.119)/0.272 = 13.2 yr`. Vs hosted open-weights:
`t* = ln(0.30/0.103)/0.272 = 3.92 yr`. Vs the managed-inference basket, `κ` cancels
from the ratio and `t* = ln(1.63267/0.10328)/0.272 = 10.15 yr`. (Vectors C and J:
closed forms match independent calculations to machine precision.)

**Glacier value (the harvestable volume).** Over `τ = min(T, t*)`:

```
G = σQ₀ᵧ ∫₀^τ [ c₀·e^(−λ_c t) − κε₀·e^((γ−μ)t) ] · e^((g−r)t) dt
  = σQ₀ᵧ [ c₀·(1−e^(−(λ_c+r−g)τ))/(λ_c+r−g) − κε₀·(1−e^(−(r+μ−γ−g)τ))/(r+μ−γ−g) ]
```

each bracket collapsing to `·τ` at its removable singularity. The engine computes G as the
month-sum over positive-margin months (identical convention to the cash flows; vector D:
exact agreement), capped to the reference-equivalent volume actually self-served; overflow
is bought on both paths and contributes zero margin. This also handles the sign cases without
case analysis.

**The decision rule restated.** `BUILD ⟺ G ≥ toll`, where
`toll = D + PV(capex) + PV(m) − PV(salvage)`. G excludes fixed costs by construction;
the toll collects all of them. At scaleup defaults: G = $570k vs toll = $1.58M — **Gate 2
fails while Gate 1 passes.**

## 7. Two gates, and the sector behind them

This model's two gates are the cash-flow instantiation of *Two Gates and a Half-Life*:

- **Gate 1 (marginal condition)** `a(0) > 0` ↔ Proposition 1's routing condition
  `V·p_f·δ(σ*) = k`: route while the marginal token saves more than it costs to route.
  Here the "marginal cost of routing" is the physical serving cost `κ·ε(t)` plus, at the
  fleet boundary, the next GPU tranche.
- **Gate 2 (participation)** `G ≥ toll` ↔ Proposition 2: realized savings at the optimum
  must cover the fixed cost. Their `F` is this model's `D + PV(m)`; their marginal
  integration cost `k·σ` shows up here as capex and power scaling with routed volume.
- **σ here is a block share** — the `γ → 0` member of their `δ(s) = δ₀(1−s)^γ` family. If
  your workload's substitutability decays steeply, their interior optimum σ* < 1 applies
  and this model should be run at `σ = σ*`, not `σ = 1`.
- **The melt law.** Sector-level, the frontier-priced pool decays as `G_pool = G₀e^(−mt/γ)`
  with half-life `t½ = γ·ln2/m ≈ 4 yr` at their calibration. Firm-level, this model's `t*`
  is your private copy of the same clock.
- **Frontier price cuts slow the melt — both models agree on the sign.** There:
  `∂τ/∂ln p_f = +1`, a 30% cut moves ≈4.6 pp of workload back to frontier and stretches
  the half-life 4.0 → 5.9 yr. Here: `∂t*/∂p₀ > 0` and `∂G/∂p₀ > 0` — every frontier price
  cut shortens your harvest window and shrinks the prize. **The cheaper the API gets, the
  weaker the case for owning metal — and the API is getting cheaper on schedule.** Anyone
  extrapolating self-hosting from open-model capability alone is missing the lever the
  incumbent still holds.

## 8. Force vectors on Token Yield

Token Yield `y = v / (cost per Mtok)`, value realized per dollar of token spend.

**Buying:** `d ln y_buy/dt = +λ_c`. At λ = 0.46/yr (18-month halving), the buyer's per-dollar yield rises ~59%/yr for
free. This is the down-escalator the build case races against.

**Building:** all-in cost = amortization (fixed) + MLOps (fixed) + electricity (moving at
`γ − μ`). With electricity share `s_E(t)` of build cost:

```
d ln y_build/dt = (μ − γ)·s_E(t) + (growth dilution of fixed costs)
```

**The downward force vector, quantified.** Rising electricity drags build-side yield at
rate `γ·s_E`. At central defaults `s_E ≈ 1.7%` (scaleup) to `4.6%` (enterprise), γ = 6%/yr:
**the drag is 0.1–0.3%/yr**. It is real, it compounds, and it is *two orders of magnitude
smaller* than the λ ≈ 46%/yr tailwind the buyer rides. Electricity **price** cannot decide
this decision; it can only nibble it.

**Where electricity actually bites** (from *From Delivered Power to Token Price*, s_e ≈
0.085): the **capacity channel**. `∂ln Y/∂ln e = −s_e ≈ −0.085`, but
`∂ln Y/∂ln E_delivered = +1/ε` in the power-limited regime — 4× to 24× stronger for any
plausible demand elasticity. For a self-hoster the firm-level analog is blunt: if you
cannot get megawatts (or rack power at your colo), `N` is capped, capacity binds, overflow
is bought at `c(t)`, and the glacier goes unharvested regardless of its size. **Watch the
megawatts, not the $/kWh.** And note the macro feedback: the AI buildout is itself a
driver of γ — token demand exports a cost externality onto its own input.

## 9. The discrete engine (what the dashboard actually computes)

State per month `i ∈ [0, M)`, `t_i = i/12`; all annual rates enter as `e^(x/12)` monthly
factors; month-start prices × month volume; discount `e^(−r t_i)`.

```
q_i        = σQ₀·G^i            G = e^(g/12)          movable ref Mtok
p_i        = p₀·L^i             L = e^(−λ/12)         $/ref Mtok
pO_i       = p_o₀·Lo^i          Lo = e^(−λ_o/12)      $/open Mtok
b_j        = (1−d)[(1−θ)((1−χ)I_j+χC_j)+θO_j]         $/open Mtok
pP_i       = (Σ_jω_jb_j)·Lp^i   Lp = e^(−λ_P/12)      $/open Mtok
c_i        = p_i, κ·pO_i, or κ·pP_i                   $/ref Mtok
e_i        = e₀·Γ^i             Γ = e^(γ/12)          $/kWh
cap/GPU_i  = s₀·e^(μ t_i)·u·(Y/12)/10⁶                open Mtok
N_i        = staged: max(N_{i−1}, ⌈κq_i/capGPU_i⌉)  · tranche capex N_i−N_{i−1} at h
buy_i      = c_i·q_i
elec_i     = N_i·w·φ·730.5·e_i
over_i     = max(0, κq_i − N_i·capGPU_i)/κ · c_i
build_i    = elec_i + m/12 + over_i (+ tranche capex)
salvage    = Σ_tranches n_k·h·e^(−δ(T−t_k)), credited at i = M−1, discounted e^(−rT)
```

Outputs: `npvBuy`, `npvBuild`, `npvAdvantage`, `breakEvenMonth`, per-token series
(including the intuition-only straight-line amortized all-in), Token Yield series, melt
analytics, first viable scale, D_max, tornado (±30% one-at-a-time).

**Verification** (`node dashboard/verify.mjs`, 47 checks, all machine-precision):
A. constant world vs exact closed form; B. exponential world vs exact geometric sums;
C. t* closed form vs bisection; D. glacier value vs independent sum; E. `D_max` identity;
F. staged ≤ upfront and staged-covers-demand invariants; plus σ-equivalence
(`σ=0.5 ≡ Q₀/2`); H. canonical-spec test vectors; I. provider rate-card blending,
range, cache and discount invariants; J. provider-path geometric NPV, melt time, and token-basis
identity. The embedded dashboard engine must also match `dashboard/engine.dev.js` byte-for-byte.
K is the minimum-scale regression: the true first default crossing is `18,032.95M` tokens/month,
followed almost immediately by another GPU purchase and a temporary dip below zero; the retired
global bisection returned a later crossing near `18,049.30M`.
L verifies that overflow bought on both paths earns no glacier margin and that a zero-price
comparator remains already melted rather than spuriously “opening later.” M proves the
breakpoint walk still finds an earlier profitable fleet band when the arbitrary search ceiling
itself is infeasible after a GPU jump.

## 10. Default parameters (Aug/Sep 2026 — sourced; per-bound citations in [calibration-data.md](calibration-data.md))

| Param | Low | Central | High | Note |
|---|---|---|---|---|
| `h` $/GPU slot | 37,000 | **45,000** | 55,000 | H100-class all-in incl. server share, fabric, integration; B200 tier $58–85k |
| `w` kW/slot | 1.0 | **1.3** | 1.6 | 8-GPU HGX ≈ 10.2 kW ⇒ ~1.3/slot |
| `φ` PUE | 1.15 | **1.3** | 1.5 | hyperscale low, retail colo high |
| `s₀` tok/s/GPU | 300 | **1,000** | 2,600 | 70B-dense strict-SLO low; MoE wide-EP / offline high |
| `u` | 0.3 | **0.5** | 0.8 | peaky SaaS low; batch pipelines high |
| `μ` /yr | 0.10 | **0.25** | 0.50 | serving-stack + open-model gains on fixed hardware |
| `e₀` $/kWh | 0.07 | **0.11** | 0.16 | US industrial→commercial; colo all-in equivalent higher |
| `γ` /yr | 0.03 | **0.06** | 0.10 | 2024–26 escalation, datacenter-heavy regions high |
| `p₀` $/Mtok | 4.00 | **4.25** (workhorse) / 10 (flagship) | 11.25 | frontier blended 3:1; pick tier AND its matching λ |
| `λ` /yr | 0.2 | **0.462** (18-mo halving, list-price regime) | 1.0 | fixed-capability regime runs λ≈2.3 (10×/yr) — only valid with a fixed-task p₀ |
| `p_o₀` $/Mtok | 0.23 | **0.30** (commodity) / 2.00 (best-open) | 2.20 | hosted open-weight, per tier |
| `p_P₀` $/Mtok | 1.400 | **1.633** | 1.757 | same-model provider quote range / equal-weight center at `θ=.25`, `χ=.25`, `d=0` |
| `λ_P` /yr | 0.2 | **0.462** | 1.0 | provider-price scenario; no historical three-provider fit claimed |
| `θ` | workload | **0.25** | workload | 3:1 input:output token mix |
| `χ` | 0 | **0.25** | measured | cached share of input; scenario input, not a sourced population mean |
| `d` | 0 | **0** | negotiated | public list-rate discount; private contracts are not observable |
| `κ` | 1.0 | **1.15** | 1.5 | workload-dependent; agentic chains worse |
| `D` $ | 100k | **250k** | 600k | 1–3 eng × 3–6 mo loaded |
| `m` $/yr | 240k | **450k** | 2M | ~0.5–1 loaded FTE central; 4–5-eng platform team high |
| `δ` /yr | 0.15 | **0.30** | 0.50 | secondary-market decay (A100/H100 history); 0.45+ = stress branch |
| `r` /yr | 0.08 | **0.12** | 0.20 | WACC-ish |
| `g` /yr | 0 | **0.25–0.60** | 1.0 | archetype-dependent |

Sanity: `ε₀ = $0.103/M open tok` at central values — below even commodity hosted-open
prices ($0.23–0.39/M), i.e. electricity is a small share of serving cost; capex + people dominate.
Consistent with the companion's s_e ≈ 0.085 at the provider level.

## 11. Worked examples (engine output, `scratchpad → verify.mjs` reproducible)

**Scaleup** — 5 B movable tok/mo, g=40%/yr, D=$250k, m=$450k/yr, T=3, r=12%:

| vs Frontier ($4.25/M, 18-mo halving) | vs Inference clouds ($1.633/M·κ) | vs Hosted open ($0.30/M·κ) |
|---|---|---|
| Gate 1 **PASS**: t* = 13.2 yr | Gate 1 PASS: t* = 10.1 yr | Gate 1 PASS: t* = 3.9 yr |
| Gate 2 **FAIL**: G = $570k < toll = $1.58M | Gate 2 FAIL: G = $238k < toll | Gate 2 FAIL: G = $24k ≪ toll |
| NPV_adv = **−$1.02M** · break-even: never | NPV_adv = **−$1.35M** | NPV_adv = −$1.56M |
| First viable scale ≈ 18 B tok/mo | ≈ 120 B tok/mo | no scale suffices |

The mid-size trap, exactly: the margin is open for 13 years, and it still can't pay a
$1.6M toll out of a $21k/month API bill.

**Enterprise** — 50 B movable tok/mo, g=25%/yr, D=$400k, m=$900k/yr:

| vs Frontier | vs Inference clouds | vs Hosted open |
|---|---|---|
| Gate 1 PASS · Gate 2 **PASS**: G = $4.71M > toll = $4.10M | Gate 2 FAIL: G = $1.97M | Gate 2 FAIL: G = $203k |
| NPV_adv = **+$617k** · break-even month 33 · fleet grows to 44 GPUs | NPV_adv = **−$2.12M** | NPV_adv = −$3.90M |

Verdict: **it depends** — building beats the frontier API, but *renting the same open
model* beats building by $3.9M. Self-hosting only wins outright when APIs are off the
table (data residency, compliance, latency) or when your utilization and throughput reach
provider grade (`u → 0.8, s₀ → 2,000` flips it — try it in the dashboard). Four sourced real-world
archetypes are run through the engine in [enterprise-examples.md](enterprise-examples.md).

## 12. Limitations

- κ is a scalar; substitutability is a curve (*Two Gates* γ). Both are unobservable today
  — pick them, and say you picked them.
- Deterministic paths: no λ volatility, hence no option value of waiting; the model will
  recommend building slightly too eagerly near the boundary.
- No defensive-pricing endogeneity: λ is your assumption, but the incumbent moves it in
  response to exactly the migration this model recommends.
- Public provider rates are a dated same-model snapshot. The provider line excludes batch
  pricing, priority/flex/US-only tiers, latency and reliability differences, egress, minimum
  commitments, and private discounts; use `d` only for a discount you can substantiate.
- Integer-GPU steps make thresholds locally fuzzy (reported ~2 s.f.).
- No latency/SLA constraints, no data-gravity value, no compliance premium — all of which
  are *reasons to build at negative NPV_adv*, and they belong in the verdict as
  qualitative overrides, not in this arithmetic.

*Analytical work, not investment advice. Infrastructure defaults are Aug-2026
knowledge-based estimates; the provider rate card is a 2026-09-01 primary-source snapshot.
Plug in your own numbers. Figures reproduced by `dashboard/verify.mjs`.*
