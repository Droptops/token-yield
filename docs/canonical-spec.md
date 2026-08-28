# Canonical spec — machine-verified derivation appendix

*This is the full output of the background derive-and-adversarially-verify loop
(4 independent derivations → synthesis → hostile 6-lens review rounds, every closed
form re-verified numerically). Provenance, honestly stated: the loop applied **three
full rounds of review fixes**; a fourth round returned 2 clean lenses and 3 lenses
with findings whose fix pass was cut off by an account spend limit — those findings
are quoted verbatim in the appendix at the bottom and affect only this document's
§7.6 wait-vs-build refinement, one §10 worked-example sizing choice, and the
reference engine's `meltMonth` diagnostic in the forms-later corner. They do NOT
affect the dashboard engine in `index.html`, which independently reproduces this
spec's §8.4 test vectors to every reported digit (`dashboard/verify.mjs`, vectors H)
and already handles the flagged forms-later case correctly (`meltTime()` returns the
`opens` mode with the formation time). The readable version of this material is
`docs/glacier-math.md`.*

---

# BUILD vs BUY for LLM Inference: The Canonical Glacier Model Specification

**Synthesis note.** This document merges four independent derivations (continuous NPV closed forms; discrete monthly engine; glacier equations and corollaries; 2026 parameter defaults) into one canonical spec. Every closed form was **re-verified numerically by the synthesizer** (Python 3 Simpson quadrature n = 20,000–40,000; node v22 for the discrete engine; scripts at
`/tmp/claude-0/-home-user-token-yield/535ccb12-a57d-5b29-b0fa-867446c85da9/scratchpad/synth_verify.py`,
`.../synth_verify2.py`, `.../synth_sawtooth.py`, `.../synth_engine.mjs`, and — for the hostile-review fixes — `.../review_fixes.py`, `.../review_fixes2.py`, and `.../review_fixes3.py`). Where a source derivation's number could not be reproduced, the recomputed number stands and the discrepancy is flagged inline. Conflicts resolved by recomputation: (i) the integer-N minimum-scale claim of Derivation 1 is confirmed for the *first* crossing but sharpened — the feasible set is a sawtooth (Section 5.2); (ii) Derivation 1's singular-case "Set B" headline number was not reproducible from its stated parameters — the recomputed value with fully pinned parameters replaces it (Section 3); (iii) the two fleet-sizing rules (continuous-form vs engine) genuinely differ and are both kept, with the difference quantified (Sections 4.1, 8.2); (iv) all three discrete test vectors were rerun independently and **reproduced Derivation 2's outputs exactly** (Section 8.4). A first hostile-review round corrected two major analytical defects — the wait-vs-build FOC's missing MLOps-window term and its scale corollary (Section 7.6), and the missing horizon clamp in the forms-later glacier case (Sections 6.1–6.3) — plus four reproducibility/labeling defects. A second round corrected one major defect of economic logic — the hybrid corollary's utilization threshold conflated average cost with marginal cost (Section 7.4, Limitation 6) — and three minor ones: the hosted-open benchmark mixed token bases (Section 9.3 / Step 7), the capacity check named the wrong endpoint in the forms-later case (Sections 5.2/6.2), and the 9.4 validation corner used an unlabeled out-of-table throughput. A third round corrected two further minor defects of basis/window bookkeeping: the hosted-open recipe dropped the `kappa` demand conversion — the basis-invariant shortfall is **35.1×**, not the previously printed 39.6×/43.1× (Sections 9.3, 10 Step 7) — and the Section-1.2 `Gamma_1` kernel was single-endpoint and therefore wrong in the forms-later window (Sections 1.2, 5.2, 7.5). See the Review responses appendix.

---

## 0. TL;DR decision rule

1. The per-token savings from self-hosting, `a(t) = p(t) − kappa·epsilon(t)` [$/token], is a **glacier**: melted from above by API price decline (`lambda`), from below by rising electricity (`gamma`), rebuilt by software efficiency on owned hardware (`mu`); net melt rate `Delta = lambda + gamma − mu` [/yr], melt date `t* = ln(p0/(kappa·epsilon0))/Delta` [yr].
2. The harvestable value is the discounted glacier volume `G = ∫ a(t)·Q(t)·e^(−r·t) dt` over the harvest window — generically `[0, min(T, t*)]`; the forms-later case clamps to `[min(t*, T), T]` and G = 0 on an empty window (Section 6.2) [$].
3. The toll gate is `Toll = D + H·(1 − e^(−(r+delta)·T)) + m·F(r,T)` [$] — dev cost, plus capex net of discounted salvage, plus the PV of the MLOps crew.
4. **BUILD only if G ≥ Toll** (necessary under any powering policy; exact when the fleet is continuously right-sized and T ≤ t*; the fixed-fleet NPV in Section 5 and the monthly engine in Section 8 give the binding cash-exact answer).
5. At August-2026 central parameters the glacier melts from the **top** (`lambda ≈ 0.9/yr`) not the bottom (`gamma × electricity-share ≈ 0.1–0.4 %/yr`), and the toll is dominated by **people** (`m`), so BUILD requires large steady volume, high utilization, and a lean crew — a 5B tok/month scaleup at central parameters is a decisive BUY (Section 10).

---

## 1. Symbols and units

### 1.1 Canonical symbols (exact, used throughout)

| Symbol | Definition | Units |
|---|---|---|
| `t` | time from decision date | yr |
| `T` | evaluation horizon | yr |
| `r` | continuous discount rate | /yr |
| `Q(t) = Q0·e^(g·t)` | demand in reference-quality tokens (blended input+output) | tokens/yr |
| `Q0`, `g` | initial demand; demand growth | tokens/yr; /yr |
| `p(t) = p0·e^(−lambda·t)` | API blended price | $/token |
| `lambda = ln(2)/t_half` | **glacier melt rate** (API price decline) | /yr |
| `kappa ≥ 1` | open-model quality multiplier (open tokens per reference-token outcome) | – |
| `N` | number of GPU slots | GPUs |
| `h` | all-in cost per GPU slot (card + pro-rated server/network/install) | $/GPU |
| `H = N·h` | hardware capex | $ |
| `D` | one-time dev/integration cost | $ |
| `m` | ongoing MLOps + maintenance (mostly headcount) | $/yr |
| `s(t) = s0·e^(mu·t)` | effective blended tokens/s per GPU (serving-stack + open-model gains on OWNED hardware) | tokens/s |
| `u ∈ (0,1]` | utilization (busy fraction of powered time) | – |
| `Y = 31,557,600` | seconds per Julian year (= 8766 h/yr × 3600 s/h, exactly) | s/yr |
| `K(t) = N·s(t)·u·Y` | fleet capacity | tokens/yr |
| `w` | average server power per GPU slot, drawn whenever powered on, independent of `u` | kW |
| `phi` | PUE (facility power multiplier) | – |
| `e(t) = e0·e^(gamma·t)` | electricity price | $/kWh |
| `gamma > 0` | **upward electricity force vector** | /yr |
| `epsilon(t) = w·phi·e(t)/(3600·s(t)·u)` | electricity cost per token served | $/token |
| `delta` | hardware market-value decay | /yr |
| `V(T) = H·e^(−delta·T)` | salvage value at T | $ |
| `a(t) = p(t) − kappa·epsilon(t)` | **glacier margin** (variable-cost basis) | $/token |
| `t*` | melt time, `a(t*) = 0` | yr |
| `G` | discounted glacier value over the harvest window `W` (Section 6.2; generically `[0, min(T, t*)]`) | $ |

### 1.2 Derived symbols (defined here, used throughout)

| Symbol | Definition | Units | Meaning |
|---|---|---|---|
| `F(x,T) ≡ ∫₀ᵀ e^(−x·t) dt = (1 − e^(−x·T))/x`, `F(0,T) = T` | annuity kernel | yr | every PV below is built from it |
| `epsilon0 = w·phi·e0/(3600·s0·u)` | | $/token | electricity per served token at t = 0 |
| `R0 = p0/(kappa·epsilon0)` | | – | initial margin ratio |
| `Delta = lambda + gamma − mu` | | /yr | net glacier melt rate |
| `alpha = lambda + r − g` | | /yr | discounted decay of the BUY (price) leg |
| `beta_N = r − gamma` | | /yr | discounted decay of **fixed-fleet** electricity |
| `beta_Q = r + mu − gamma − g` | | /yr | discounted decay of **demand-tracking** electricity (the ε-leg of G) |
| `W_e = N·w·phi·8766·e0` | | $/yr | fleet electricity cost rate at t = 0 |
| `tau = min(T, t*)` | | yr | harvest window end (melting cases; see Section 6.2 for the forms-later clamp) |
| `Gamma_1 = p0·(F(alpha,t2) − F(alpha,t1)) − kappa·epsilon0·(F(beta_Q,t2) − F(beta_Q,t1))` | | $·yr/token | glacier value per unit of initial annual demand over the harvest window `[t1, t2]` of Section 6.2 — `[0, tau]` in the melting cases (where it reduces to the single-endpoint form `p0·F(alpha,tau) − kappa·epsilon0·F(beta_Q,tau)`), `[min(t*,T), T]` in the forms-later case; `G = Q0·Gamma_1`. **The single-endpoint form must not be used in the forms-later case** — there `tau` is the window's *start*, and the literal kernel integrates the negative-margin interval `[0, t*]` (Section 5.2's verified example) |
| `Toll = D + H·(1 − e^(−(r+delta)·T)) + m·F(r,T)` | | $ | the toll gate |
| `Theta = h·(1 − e^(−(r+delta)T)) + w·phi·8766·e0·F(beta_N,T)` | | $ | PV cost of one marginal always-on GPU slot |

Engine constants (Section 8): `SEC_PER_MONTH = Y/12 = 2,629,800 s`; `HOURS_PER_MONTH = Y/3600/12 = 730.5 h` (exact — not 730 or 731).

**Kernel facts (verified, `synth_verify.py` Part 1).** `dF/dT = e^(−x·T)` (central FD vs closed, rel. err ≤ 1.6e−10 at x = 0.35, 0, −0.19); zero-limit `F(0,T) = T` exact and `F(1e−13, 7) = 7.0000000000` via the stable form `−expm1(−x·T)/x` with a series branch for `|xT| < 1e−8`; the rate-derivative `F'(x,T) ≡ ∂F/∂x = [e^(−xT)(1+xT) − 1]/x² < 0` for all `x, T > 0` (since `e^y > 1+y` for `y ≠ 0`), with `F'(0,T) = −T²/2`; FD check rel. err ≈ 4e−11.

---

## 2. Assumptions (numbered, with bias direction)

Bias key: **[→BUY]** = the assumption makes BUILD look worse than reality (conservative against building); **[→BUILD]** = makes BUILD look better; **[flag]** = direction ambiguous or workload-dependent — must be stated on any dashboard.

1. **Constant-rate exponentials** for `p, e, s, Q` over all of `[0,T]`. Exponential `mu` sustained beyond ~3 yr is aggressive (FP8 + speculative-decoding-type gains saturate). **[→BUILD at long T; cap or decay mu beyond ~3 yr.]**
2. **Blended-token accounting**: one `Q(t)`, one `p(t)`, one `s(t)` at a fixed input:output blend (defaults blended 3:1). **[flag — neutral if the blend matches the workload; a mismatch shifts both paths together.]**
3. **`kappa` constant in time** (open-frontier quality gap frozen at decision date). Open models have been closing the gap; the waiting-option `q`-term (Section 7.6) is where this re-enters. **[→BUY.]**
4. **Quality parity is achievable and achieved** once `D` is spent — no residual quality/eval risk beyond the `kappa` token tax. **[→BUILD.]**
5. **Single upfront fleet purchase**, sized for the horizon peak, no staged buying: capex that is not needed until near `T` is paid at `t = 0` where discounting is weakest. **[→BUY; a staged-purchase engine can only improve BUILD.]**
6. **Honest idle power**: every slot draws `w·phi` kW for the entire horizon, independent of utilization and of whether demand has grown into the fleet. Real operators can consolidate, power-cap, or park nodes (idle draw of a modern GPU server is ~40–60% of load draw, not 100%). **[→BUY.]**
7. **`u` exogenous and constant.** **[flag — `epsilon ∝ 1/u`, one of the two or three most decision-critical parameters.]**
8. **No shutdown option before `T`**: the fixed-fleet NPV and the engine keep the fleet powered even after the glacier melts (`t > t*`); `G` by contrast assumes harvest stops at `t*`. The two bracket the truth. **[NPV/engine →BUY; G →BUILD; report both.]**
9. **Salvage certain**, realized at exactly `T` for `H·e^(−delta·T)` cash. Secondary-market liquidity and next-generation (Blackwell/Rubin) repricing risk are unpriced. **[→BUILD; Vector B in Section 8 shows a win that exists only because of the salvage credit.]**
10. **`m` constant** (no wage escalation). **[→BUILD.]**
11. **No taxes**: the depreciation tax shield on `H` (real, favors owning) and equal deductibility of both paths' opex are both omitted. **[net mildly →BUY; a CFO-grade run should add the shield.]**
12. **Frictionless API side**: no rate limits, no negotiated volume discounts beyond the `p0` calibration, batch/caching modeled only as a `p0` discount. Omitted discounts **[→BUILD]**; omitted rate-limit/ToS/data-governance constraints on BUY **[→BUY]**. **[flag.]**
13. **Electricity bookkeeping**: `e(t)` prices metered energy only; colocation capacity fees (≈ $160–380/kW-month, i.e. ≈ $0.22–0.52/kWh-equivalent at full draw, 730.5 h/month — the often-quoted ≈$0.26/kWh corresponds to ~$190/kW-month, near the bottom of the range) must be booked as fixed $/yr in `m` or a facility line, never inside `epsilon(t)`. **[flag — double-counting hazard, stated rule prevents it.]**
14. **Self-hosting operational risk** (outages, on-call burnout, security, compliance) priced only through `m`. **[→BUILD.]**
15. **Demand exogenous** — no price-elasticity feedback (falling `p` would in reality raise `Q`). **[flag.]**
16. **All rates nominal, continuous compounding, pre-tax; `r` constant.** Consistency requirement: `gamma`, `lambda`, `g` and `r` must all be nominal (or all real). **[neutral.]**
17. **No double counting of capex** (structural): `D + H` enter the NPV once, as cash at `t = 0`; salvage enters once, at `t = T`. The straight-line "amortization" of Sections 6–8 is a *chart quantity only* and appears nowhere in any NPV. **[neutral — an invariant, enforced in the engine.]**

---

## 3. BUY path math

The instantaneous API spend rate is `p(t)·Q(t)` [$/token · token/yr = $/yr]. Discounting continuously:

```
C_buy(T) = ∫₀ᵀ p0·e^(−lambda·t) · Q0·e^(g·t) · e^(−r·t) dt
         = p0·Q0 · F(alpha, T),        alpha = lambda + r − g          [/yr]

C_buy(T) = p0·Q0·(1 − e^(−(lambda+r−g)·T))/(lambda+r−g)                 [$]
```

Units: `[$/token]·[tokens/yr]·[yr] = $`.

**Verification by differentiation.** `dC_buy/dT = p0·Q0·e^(−alpha·T) = p(T)·Q(T)·e^(−r·T)`, the integrand — checked by central FD vs the integrand at `T` on all three sets below, rel. err ≤ 3.7e−11.

**Limits.**
- **Removable singularity `alpha → 0`** (price melt + discounting exactly cancels demand growth; the discounted spend rate is the constant `p0·Q0` $/yr): `C_buy → p0·Q0·T`. Handled exactly by `F(0,T) = T`.
- **`T → ∞`**: `C_buy → p0·Q0/(lambda+r−g)` **iff `lambda + r > g`** — the convergence condition: melt plus discounting must beat demand growth, otherwise the perpetuity diverges.
- **`lambda → 0`**: `C_buy = p0·Q0·F(r−g, T)` — the glacier can then melt only from below (Section 6).

**Numerical verification** (`synth_verify.py` Part 2; Simpson n = 20,000). Three fully-pinned parameter sets, two sitting exactly on singular manifolds:

| Set | Definition | C_buy closed vs Simpson |
|---|---|---|
| A (generic) | `p0=2e−6, lambda=.35, Q0=1e12, g=.30, r=.10, T=4` (full set in 5.4) | 6,015,844.8521 both; rel 0.0e0 |
| B (**alpha = 0 exactly**: `lambda=.5, r=.08, g=.58`) | rest as A | 8,000,000.0000 both = `p0·Q0·T` exactly; rel 0.0e0 |
| C (`r = gamma = .03`, singular on the BUILD side) | rest as A | 6,846,274.0732 both; rel 9.1e−15 |

*Conflict resolved:* Derivation 1 reported its alpha = 0 case as C_buy = 6,000,000 "= p0·Q0·T", which is inconsistent with the parameters it stated (those give 8,000,000). My recomputation with fully pinned parameters gives **8,000,000.00 = p0·Q0·T exactly**; the singular-limit identity is confirmed, the headline number is corrected.

---

## 4. BUILD path math

### 4.1 Capacity constraint and fleet sizing

The open model needs `kappa` tokens per reference token, so serving all demand in-house requires, **for all** `t ∈ [0, T]`:

```
kappa·Q(t) ≤ K(t) = N·s(t)·u·Y      ⇔      N ≥ kappa·Q0·e^((g−mu)·t)/(s0·u·Y)     [GPUs]
```

The load ratio moves at net rate `g − mu` and is monotone, so it binds at `t = T` if `g > mu` and at `t = 0` otherwise. Two sizing rules, both correct, with different robustness stances:

- **Closed-form rule (mu-credited, tight in continuous time):**
  `N = ceil( kappa·Q0·e^(max(g−mu,0)·T) / (s0·u·Y) )` — credits future software gains against future demand.
- **Engine rule (robust to mu = 0; Section 8):**
  `N = ceil( kappa·q_peak·12 / (s0·u·Y) )` with `q_peak` the peak *monthly* demand — sizes peak demand against **today's** throughput `s0`, guaranteeing zero overflow even if no efficiency gains materialize (lemma verified in 8.3).

The difference is material when both `g` and `mu` are large: on the Section-10 scaleup (`g=0.70, mu=0.40`), the mu-credited rule gives N = 6 (T = 3) / 11 (T = 5); the robust rule gives N = 19 / 76 (`synth_verify2.py`). State which rule a given number uses; this spec's closed forms use the mu-credited rule, the engine uses the robust rule.

**Conservatism (Assumptions 5–6).** The whole horizon-peak fleet is bought at `t = 0` and powered continuously, so early years carry idle slack (effective utilization `u·e^(−(g−mu)(T−t)) < u` when `g > mu`). Both effects inflate `C_build` — bias **toward BUY**. Demand above `K(t)` (excluded here by construction) overflows to the API at `p(t)` in the discrete engine.

### 4.2 Electricity, with honest idle power

Each powered slot draws `w·phi` kW **whenever on, independent of utilization**. Fleet energy = `N·w·phi·8766` kWh/yr; since `8766 h/yr × 3600 s/h = 31,557,600 s/yr = Y` **exactly**, hour-based and second-based bookkeeping agree with no rounding. The cost flow is `W_e·e^(gamma·t)` [$/yr] with `W_e = N·w·phi·8766·e0` [GPU · kW · h/yr · $/kWh = $/yr]:

```
PV_elec(T) = ∫₀ᵀ W_e·e^(gamma·t)·e^(−r·t) dt = W_e·F(beta_N, T),   beta_N = r − gamma   [$]
```

with the removable singularity `r = gamma ⇒ PV_elec = W_e·T` (escalation exactly cancels discounting — Set C above sits exactly on this manifold; closed vs Simpson rel 1.0e−14 for the full C_build).

**Per-token identity (why `u` is in epsilon's denominator).** A slot costs `w·phi·e(t)·(Y/3600)` $/yr powered [kW · $/kWh · h/yr] but produces only `s(t)·u·Y` tokens/yr — power accrues on wall-clock time, tokens only on busy time. Dividing:

```
epsilon(t) = w·phi·e(t)/(3600·s(t)·u)     [($/h)/(tokens/h) = $/token]
```

Idle draw is not ignored — it is amortized over the tokens actually served, which is exactly why `epsilon ∝ 1/u`. Moreover, with exact continuous sizing `N_c = kappa·Q0/(s0·u·Y)` (g = 0), the fleet-level and per-token formulations coincide **identically**:

```
N_c·w·phi·8766·e0 = [kappa·Q0/(s0·u·Y)]·w·phi·e0·8766 = kappa·Q0·w·phi·e0/(3600·s0·u) = kappa·Q0·epsilon0
```

(exact because `Y/8766 = 3600`). Integer `N` adds the honest slack-capacity power cost on top. Zero-limits: `u → 0⁺` or `s0 → 0⁺` gives `epsilon → ∞` (paying power, producing nothing); `u = 0` is excluded — the domain is `u ∈ (0,1]` and the engine rejects it.

### 4.3 MLOps and salvage

```
PV_ops(T)     = ∫₀ᵀ m·e^(−r·t) dt = m·F(r, T)          [$]   (→ m·T as r → 0; verified at r = 0 and r = 1e−12)
PV_salvage(T) = V(T)·e^(−r·T) = H·e^(−(delta+r)·T)      [$]   (single point cash flow at exactly t = T)
```

### 4.4 BUILD total (no double counting)

```
C_build(T) = D + H·(1 − e^(−(delta+r)·T)) + W_e·F(r−gamma, T) + m·F(r, T)      [$]

with H = N·h,  W_e = N·w·phi·8766·e0,  N = ceil(kappa·Q0·e^(max(g−mu,0)·T)/(s0·u·Y))
```

`D + H` appear once, upfront; salvage is netted inside the bracket (`H − H·e^(−(delta+r)T)`); no amortization stream exists anywhere. Note `C_build(0) = D` (salvage returns `H` immediately at `T = 0`).

**Two powering policies (made explicit — this resolves an apparent conflict between the source derivations):**
- **P1 (always-on full fleet)** — used by `C_build` above and by the discrete engine: electricity decays at `beta_N = r − gamma`; conservative, honest about idle slack.
- **P2 (dynamic consolidation / right-sized)** — implicit in the glacier margin `a(t) = p − kappa·epsilon(t)`: power only the slots demand needs; the electricity leg then decays at `beta_Q = r + mu − gamma − g`. When `g = mu` the fleet is exactly full at all times and **P1 = P2 identically** (`W_e·e^(gamma·t) = kappa·Q(t)·epsilon(t)`, by the 4.2 identity).

**Verification** (`synth_verify.py` Part 2): C_build closed vs Simpson on sets A/B/C: rel ≤ 1.2e−15 / 8.4e−16 / 1.0e−14, including Set C exactly on the `r = gamma` singular manifold.

---

## 5. NPV comparison and break-even closed forms

### 5.1 The one expression

```
NPV_adv(T) = p0·Q0·(1 − e^(−(lambda+r−g)·T))/(lambda+r−g)          ← avoided API spend
           − D                                                      ← dev cost
           − N·h·(1 − e^(−(delta+r)·T))                             ← capex net of salvage
           − N·w·phi·8766·e0·(1 − e^(−(r−gamma)·T))/(r−gamma)       ← electricity (policy P1)
           − m·(1 − e^(−r·T))/r                                     ← MLOps
```

each ratio replaced by `T` at its removable singularity (`lambda+r = g`, `r = gamma`, `r = 0`). **Decision: BUILD iff NPV_adv(T) > 0.** Verified on sets A/B/C closed vs Simpson: **+325,322.4097 / −3,046,936.9490 / +1,110,411.4922**, rel ≤ 2.0e−14 (`synth_verify.py` Part 2).

Relation to the glacier (Section 6): under policy P2 with `g = mu` (continuously full fleet) and `T ≤ t*`, `NPV_adv = G − Toll` **exactly** (same kernels, `beta_N = beta_Q` there). In general `G − Toll ≥ NPV_adv`: G excludes post-melt bleed and idle slack. So **G ≥ Toll is a necessary condition for BUILD; NPV_adv (or the engine) is the binding test.**

### 5.2 Minimum volume Q0_min

**Continuous-N closed form** (g = 0; `N_c = kappa·Q0/(s0·u·Y)` so `H` and `W_e` scale linearly with `Q0` — stated approximation, under-costs BUILD by at most one GPU):

```
Q0_min = ( D + m·F(r,T) ) / Pi     [tokens/yr],   valid Pi > 0, where
Pi = p0·F(lambda+r, T) − (h·kappa/(s0·u·Y))·(1 − e^(−(delta+r)·T)) − kappa·epsilon0·F(r−gamma, T)   [$·yr/token]
```

`Pi` is the discounted lifetime net margin per unit of annual demand. **Zero-limit of the denominator:** `Pi → 0⁺ ⇒ Q0_min → ∞`; if `Pi ≤ 0`, *no* volume ever justifies building at this horizon — scale cannot fix negative unit economics.

**Growth version** (capacity-scaled capex, Derivation 3's corollary): `G = Q0·Gamma_1` with the **windowed** `Gamma_1` of Section 1.2 — the two-endpoint form over the same `[t1, t2]` as `G` itself (`[0, tau]` in the melting cases, `[min(t*,T), T]` in the forms-later case). **The single-endpoint kernel is wrong in the forms-later case**, where `tau = min(T, t*)` is the window's *start*: it integrates the negative-margin interval `[0, t*]` and returns a spurious "never build at any scale". Verified (`review_fixes3.py`) on GS6's rates (T = 5) with ordinary toll parameters (`h = 30K, delta = 0.30, D = 500K, m = 500K`): the literal kernel gives `Gamma_1 − eta_net = −1.53e−5 ≤ 0` ⇒ "never", while the true windowed threshold is finite — `Q0_min = 1.70e11 tok/yr ≈ 14B tok/month`, confirmed by the integer-N `G ≥ Toll` screen: pass at `Q0 = 3e11` (G $5.28M vs Toll $3.35M window-sized, $3.46M at conservative t = 0 sizing), fail at `1e11` (G $1.76M vs Toll $2.72M). Capex: `H = Q0·eta` with `eta = h·kappa·e^(max(g−mu,0)·t2)/(s0·u·Y)`, where `t2` is the harvest window's **upper endpoint** (`t2 = tau` in the melting cases; `t2 = T` in the forms-later case, where the fleet must be sized for demand at `T` — see Section 6.2's capacity rule); `Gamma_1` and `eta` thus use the same window consistently. With `eta_net = eta·(1 − e^(−(r+delta)T))`:

```
Q0_min = (D + m·F(r,T)) / (Gamma_1 − eta_net),    never build at any scale if Gamma_1 ≤ eta_net
```

**Integer-N exact condition** (inequality): BUILD iff

```
p0·Q0·F(lambda+r,T) ≥ D + m·F(r,T) + ceil(kappa·Q0/(s0·u·Y)) · Theta,
Theta = h·(1 − e^(−(delta+r)T)) + w·phi·8766·e0·F(r−gamma,T)     [$ per GPU, PV]
```

**Sawtooth structure (recomputed — sharpens Derivation 1's claim).** Within a fixed-N band NPV rises at slope `p0·F(lambda+r,T)` per token/yr; at each band boundary it drops by `Theta`. Consequences, all verified on Set A with g = 0 (`synth_sawtooth.py`; `epsilon0 = 1.000000e−7 $/tok`, `Pi = 1.215576e−7 $·yr/token`, `Q0_min = 1.701843e13 tok/yr`, quantum `ΔQ0 = s0·u·Y/kappa = 1.2016e10 tok/yr`):
- The **first** crossing into NPV ≥ 0 lies within one quantum above `Q0_min`: observed gap 8.216e9 < 1.2016e10 (grid-point argument: at `Q0 = N·ΔQ0` integer and continuous costs coincide, and the first grid point above `Q0_min` has NPV = +1,030 ≥ 0). This confirms Derivation 1's verified claim.
- **But the feasible set is not an interval**: NPV dips below zero again at band boundaries until `Q0_perm ≈ Q0_min + Theta/Pi` (predicted 29.5 quanta; last observed dip at 28.73 quanta; 2,000 random probes above `Q0_perm` found zero negatives). Dashboard rule: evaluate NPV at your actual `Q0`; never conclude from `Q0 > Q0_min` alone.
- Plug-back check: continuous-N NPV at `Q0_min` = 0.0e0 exactly.

### 5.3 Maximum justifiable dev cost

`D` enters additively with coefficient −1, so:

```
D_max(T) = p0·Q0·F(lambda+r−g, T) − N·h·(1−e^(−(delta+r)T)) − W_e·F(r−gamma, T) − m·F(r, T)   [$]
```

Verified on Set A: `D_max = 1,075,322.41`; NPV at `D = D_max` is 0.0e0 closed, −6.5e−9 numeric on a $6M scale (`synth_verify.py` Part 3).

### 5.4 Break-even horizon T_be

`NPV_adv(T) = 0` mixes four exponential rates (`lambda+r−g`, `delta+r`, `r−gamma`, `r`) — **no elementary closed form in general; a 1-D root-find is required and is well-posed**: `NPV_adv(0) = −D < 0`, and for fixed N

```
dNPV_adv/dT = e^(−r·T)·[ p(T)·Q(T) − W_e·e^(gamma·T) − m ] − H·(delta+r)·e^(−(delta+r)·T)     [$/yr]
```

When `lambda > g` the bracket eventually declines monotonically while the salvage-erosion term shrinks, so `NPV_adv(T)` is single-peaked: at most two roots — the first is `T_be` (entry), the second the harvest-window exit. **Verified**: Set A (parameters: `p0=2e−6, lambda=.35, Q0=1e12, g=.30, r=.10, kappa=1.3, s0=900, u=.55, w=1.2, phi=1.35, e0=.11, gamma=.04, mu=.35, h=45000, D=750000, m=400000, delta=.35`; N = 84): bisection gives **T_be = 3.266330 yr**, with `NPV_adv(0.01) ≈ −752,297 ≈ −D`.

**Lambert-W closed-form special case** (`g = 0`, `mu = gamma` with dynamic consolidation so the operating flow is the constant `b = kappa·epsilon0·Q0 + m` $/yr — the one place policy P2 powering is assumed, stated explicitly — plus `r = 0` and no salvage):

```
a·(1 − e^(−lambda·T)) − b·T = c,    a = p0·Q0/lambda [$],  b = kappa·epsilon0·Q0 + m [$/yr],  c = D + H [$]
T_be   = A/B + (1/lambda)·W₋₁( −(lambda/B)·e^(−lambda·A/B) )      (entry)
T_exit = A/B + (1/lambda)·W₀ (  same argument )                    (harvest end)
A = 1 − c/a [–],  B = b/a [/yr];  roots exist iff the W-argument ≥ −1/e
```

**Verified** (`synth_verify.py` Part 4, own Halley-iteration W): with `a = 4,000,000`, `b = 214,791.6667`/yr, `c = 2,132,942.30`, `lambda = 0.35`: `A = 0.466764`, `B = 0.053698`/yr, W-argument `x = −0.311055 ≥ −1/e`; **T_be = 3.846295 yr**, **T_exit = 7.187432 yr**; both satisfy `F(T) = 0` to ≤ 9.3e−10 and match independent bisection to all printed digits — confirming `W₋₁` is the entry branch. The exit root exists because with `r = 0` and a constant post-melt burn, NPV → −∞ as `T → ∞`: the glacier melts and you must stop harvesting.

### 5.5 Sensitivities (fixed integer N except `u`; all FD-verified, `synth_verify.py` Part 5)

`F'(x,T) < 0` always. On Set A (values in $ per unit of the parameter):

| Derivative | Closed form | Sign | Set-A value (analytic = FD, rel ≤ 3.3e−10) | Interpretation |
|---|---|---|---|---|
| `∂NPV_adv/∂lambda` | `p0·Q0·F'(alpha,T)` | **< 0** | −10,835,678 | faster melt destroys the API spend you would have avoided |
| `∂NPV_adv/∂gamma` | `W_e·F'(beta_N,T)` | **< 0** | −895,970 | the upward electricity force vector: inflates the PV of the always-on power bill |
| `∂NPV_adv/∂e0` | `−(W_e/e0)·F(beta_N,T)` | **< 0** | −4,242,113 | electricity price level is a linear tax on every powered hour, busy or idle |
| `∂NPV_adv/∂u` (continuous N ∝ 1/u) | `(1/u)·[H·(1−e^(−(delta+r)T)) + W_e·F(beta_N,T)]` | **> 0** | +6,524,046 | utilization amortizes capex and idle watts; halving `u` doubles the fleet and its power bill; with integer N this becomes a staircase |
| `∂NPV_adv/∂D` | `−1` | < 0 | exact | — |
| `∂NPV_adv/∂m` | `−F(r,T)` | < 0 | exact | — |
| `∂NPV_adv/∂p0` | `+Q0·F(alpha,T)` | > 0 | exact | — |

### 5.6 Limit cases

- `lambda → 0`: melt driven purely by electricity vs efficiency; `t* = ln R0/(gamma−mu)`, finite iff `gamma > mu`.
- `r → 0`: all kernels finite for finite T via `F(0,·)`; only `T → ∞` diverges.
- `T → ∞`: finite perpetuity requires **all** of `lambda + r > g`, `r > gamma`, `r > 0`, `delta + r > 0`; and with `g > mu` the sized-at-T fleet diverges, so the infinite-horizon form is meaningful only for `g ≤ mu`. (Perpetuity check: `C_buy(T=800) = p0·Q0/(lambda+r−g)` to machine precision in Derivation 1, consistent with my Set-A kernels.)
- `u → 0⁺`: `epsilon0 ∝ 1/u → ∞` and `N ∝ 1/u → ∞`, so `C_build → ∞`: BUY always wins — full idle power for a fleet producing almost nothing.

---

## 6. THE GLACIER EQUATIONS

### 6.1 Margin and melt time

```
a(t) = p0·e^(−lambda·t) − kappa·epsilon0·e^((gamma−mu)·t)      [$/token]
```

(the electricity leg carries `e^(gamma·t)` from `e(t)` and `e^(−mu·t)` from `s(t)` in the denominator). Setting `a(t*) = 0` and dividing the legs:

```
p0/(kappa·epsilon0) = e^((lambda+gamma−mu)·t*)   ⇒   t* = ln(R0)/Delta      [– / (/yr) = yr]
```

Melt-rate anatomy: the sun (`lambda`, API cuts) and the warm ground (`gamma`, electricity) melt the glacier; snowfall (`mu`, efficiency gains on owned hardware) rebuilds it. Because `p/(kappa·epsilon)` is monotone in `t`, `a` has at most one zero. **All sign/singularity cases:**

| Case | Condition | t* | Meaning |
|---|---|---|---|
| Generic melt | `Delta > 0, R0 > 1` | `ln R0/Delta > 0` | melt date computable in advance |
| Already melted | `Delta > 0, R0 ≤ 1` | `t* = 0` | `a(0) ≤ 0` and worsening; harvest window empty, G = 0 |
| Never melts | `Delta ≤ 0, R0 > 1` | `+∞` | margin holds or grows; `tau = T` |
| Glacier forms later | `Delta < 0, R0 < 1` | `ln R0/Delta > 0` (neg/neg) | the **same formula** gives the freeze-over date; harvest window is `[min(t*, T), T]` — **empty (G = 0) if t* ≥ T** |
| Knife edge | `Delta = 0` | none | margin sign constant = sign(R0 − 1) for all t |

Robust statement: the harvest window is `W = {t ∈ [0,T] : a(t) > 0}`, always an interval (possibly empty) with endpoint(s) given by `t*`.

### 6.2 Glacier volume and the decision rule

```
G = ∫_{t1}^{t2} a(t)·Q(t)·e^(−r·t) dt = Q0·[ p0·(F(alpha,t2) − F(alpha,t1)) − kappa·epsilon0·(F(beta_Q,t2) − F(beta_Q,t1)) ]   [$]
```

with `[t1, t2] = [0, tau]`, `tau = min(T, t*)` in the melting cases and `[t1, t2] = [min(t*, T), T]` in the forms-later case — **if `t* ≥ T` in the forms-later case the harvest window is empty and `G = 0`**, mirroring the melting case's `tau = min(T, t*)` clamp. The clamp is not optional: applied literally with `t* > T`, the closed form integrates over a reversed interval on which `a(t) < 0` throughout and returns a spurious **positive** G. Verified (`review_fixes.py`): GS6's rates (`lambda=.10, gamma=.05, mu=.45, r=.12, g=.40`) with `R0 = 0.5, T = 2, Q0 = 5e10` give `t_form = 2.310491 > T` and `max a(t) on [0,T] = −8.0e−7 < 0`, yet the unclamped form returns **+10,893** where the truth is 0; at `R0 = 0.2, T = 3, Q0 = 6e11` the spurious value is **+$12.7M**, and at `R0 = 0.1` it is **+$74.3M** — larger than any Toll in this document, enough to flip the `G ≥ Toll` screen from a correct decisive BUY to a spurious BUILD. **Dashboard rule: compute the window as `W = {t ∈ [0,T] : a(t) > 0}` and return `G = 0` when it is empty.** Units: `[tokens/yr]·[$/token]·[yr] = $`. Both `alpha → 0` and `beta_Q → 0` are removable (`F(0,·) = T`, series `F = T − xT²/2 + O(x²)`), evaluated stably as `−expm1(−x·t)/x`.

**Verification by differentiation** (the closed form's own audit): `dG/dtau = Q0·p0·e^(−alpha·tau) − Q0·kappa·epsilon0·e^(−beta_Q·tau) = a(tau)·Q(tau)·e^(−r·tau)` — the integrand. Checked by central FD at interior points on every case below, rel ≤ 1.0e−10 (FD-limited).

**Decision rule (no double counting):**

```
BUILD  ⇔  G ≥ Toll = D + H·(1 − e^(−(r+delta)·T)) + m·F(r,T)
```

where `H·(1 − e^(−(r+delta)T)) = H − V(T)·e^(−rT)` is capex net of discounted salvage — capex enters once, as the t=0 outflow / t=T inflow pair; no amortization appears in G or the Toll (the annualized rent `A_H = H·(1−e^(−(r+delta)T))/F(r,T)` used in Section 7 is *defined* NPV-equivalent to this pair and is a re-expression for yield accounting only). **Status of the rule** (Section 5.1): necessary in general; exact when the fleet is continuously right-sized (`g = mu`) and `T ≤ t*`; the fixed-fleet NPV_adv and the engine are the cash-exact tests.

**Capacity constraint (explicit):** G as written assumes all demand served in-house, which requires `kappa·Q0·e^((g−mu)·t) ≤ N·s0·u·Y` for all `t` in the harvest window `[t1, t2]`. The load ratio is monotone at rate `g − mu`, so **check the window's upper endpoint `t2` (= `tau` in the melting cases, = `T` in the forms-later case) if `g > mu`, else the lower endpoint `t1`** (checking `t = 0` remains conservative). The endpoint matters precisely in the forms-later case, where `tau = min(T, t*)` is the window *start*: at GS6's rates with `g = 0.60 > mu = 0.45` (`R0 = 0.5, T = 5, Q0 = 5e10`) the window is `[2.3105, 5]` and the load ratio is 9.60 at `t_form` but 14.37 at `T` — N = 10 passes a window-start check while the window end needs N = 15, and with N = 10 the closed-form G ($2,021,378) silently counts overflowed demand as harvested: the actually-harvestable value is $1,592,775, a **$428,603 (21.2%) overstatement** that can flip a `G ≥ Toll` screen (verified, `review_fixes2.py`; overflow spans [2.58, 5] of the window). If N is smaller than the endpoint requires, overflow goes to the API at `p(t)` (zero margin) and G must count only the in-house-served fraction — the hybrid of Section 7.4.

### 6.3 Numerical verification (recomputed; `synth_verify.py` Part 6, `synth_verify2.py`, `review_fixes.py`; Simpson n = 20,000; bisection 200 iters)

All parameter sets share `p0=1e−5 $/tok ($10/M), kappa=1.5, w=1.0 kW, phi=1.3, e0=0.10 $/kWh, s0=500 tok/s, u=0.7` (⇒ `epsilon0 = 1.0317e−7 $/tok`), `g=0.40, r=0.12, T=5, Q0=5e10 tok/yr`, varied as marked:

| Case | Variation | R0 | Delta (/yr) | t* closed (yr) | t* bisect | G closed [$] | G Simpson | rel |
|---|---|---|---|---|---|---|---|---|
| GS1 generic melt | `lambda=.693, gamma=.06, mu=.30` | 64.62 | +0.453 | 9.201882 | 9.201882 (rel 3.9e−16; residual a(t*) = −1.3e−23 $/tok) | 1,014,289.82 | same | 7.0e−15 |
| GS2 **alpha = 0 exactly** | `lambda=.5, r=.10, g=.60` | 64.62 | +0.260 | 16.032510 | match (rel 2.2e−16) | 2,420,556.65 | same | 9.2e−15 |
| GS3 **beta_Q = 0 exactly** | `r=.10, mu=.11, gamma=.06, g=.15` | 64.62 | +0.643 | 6.482819 | match (rel 0) | 707,689.51 | same | 5.1e−15 |
| GS4 melt inside horizon (`tau = t* < T`) | `e0=1.0` | 6.46 | +0.453 | 4.118913 | match (rel 2.2e−16) | 643,248.04 | same | 2.9e−15 |
| GS4b already melted | `e0=10` | 0.646 | +0.453 | 0 (a(0) = −5.48e−6 ≤ 0 confirmed) | — | 0 | 0 | exact |
| GS5 never melts | `mu=.9` | 64.62 | −0.147 | ∞; tau = T | min a > 0 | 1,044,142.96 | same | 3.5e−15 |
| GS6 forms later | `lambda=.10, gamma=.05, mu=.45`, e0 scaled so R0 = 0.5 | 0.500 | −0.300 | t_form = 2.310491 | match (rel 0) | over [t*,T]: **879,851.68** (rel 2.0e−15); over [0,t*]: **−585,301.62** (negative, both methods — confirms the window rule) | | |
| GS6b forms later, **beyond horizon** (`t* > T`) | GS6 rates, `T = 2` | 0.500 | −0.300 | t_form = 2.310491 > T | — | **0** (window empty; clamp `[min(t*,T), T]`) | 0 (max a on [0,T] = −8.0e−7 < 0; unclamped literal form would return spurious **+10,893**) | exact |

(*GS1's parameters pin the `gamma/mu` split Derivation 3 left implicit; its reported ≈$1.014M and t* ≈ 9.20 yr are reproduced to the precision its unstated split allows. My fully-pinned values above are canonical.*) A ninth case — GS6 rates with `g = 0.60 > mu`, exercising the forms-later capacity endpoint — is documented in Section 6.2 (verified in `review_fixes2.py`: G-full-demand closed vs Simpson rel 8.5e−15; capped-harvest quadrature $1,592,775.04). GS6 also pins the windowed-vs-literal `Gamma_1` contrast of Sections 1.2/5.2: windowed +1.7597e−5 vs literal single-endpoint −1.1706e−5 $·yr/tok (`review_fixes3.py`, Simpson rel 4.9e−15). The scaleup archetype (Section 10) independently exercises the pipeline at 2026-central parameters, and the discrete engine's Vector A exercises the **double zero-limit** `alpha = beta_Q = 0` (G = 928,800 exactly, Section 8.4).

---

## 7. Force vectors and Token Yield

**Definition.** Token Yield = value realized per dollar of token spend: `yield(t) = v_ref · (reference tokens delivered/yr) / (cost $/yr)` [dimensionless]; the value-per-token constant `v_ref` [$/ref token] drops out of all growth rates.

### 7.1 The two force equations (all FD-verified, `synth_verify.py` Part 7)

**API buyer:** cost per reference token is `p(t)`, so

```
d ln(yield_buy)/dt = +lambda      [/yr]
```

— the buyer's yield compounds upward at the glacier melt rate, for free, with zero capex.

**Self-hoster (fixed fleet, all-in cost):** with `A_H` the NPV-equivalent capital rent (Section 6.2), cost rate `C(t) = A_H + m + E(t)`, `E(t) = N·w·phi·e(t)·Y/3600` [$/yr] growing at `gamma`; output grows at `mu` (capacity-limited). Then:

```
d ln(yield_build)/dt = mu − gamma·sigma_E(t),      sigma_E(t) = E(t)/(A_H + m + E(t))    [/yr]
```

**This is the mission-statement identity: the downward force vector on token yield from electricity = electricity escalation × electricity's share of cost.** General (demand-limited) form, per-token cost `c(t) = (A_H + m)/Q(t) + kappa·epsilon(t)`:

```
d ln(yield_build)/dt = g·(1 − sigma_E) + (mu − gamma)·sigma_E
```

reducing to `mu − gamma·sigma_E` exactly at steady state (`g = mu`). Verified by FD: steady-state rel 2.1e−10, general rel 1.6e−10. Two structural results:

- **The force strengthens with time:** `d sigma_E/dt = gamma·sigma_E·(1 − sigma_E)` (logistic; FD-verified rel 6.5e−11) — as hardware amortizes away, electricity ratchets toward being the whole cost.
- Discrete confirmation (engine Vector B, Section 8.4): observed monthly-annualized drag 0.453%/yr at i=0 vs predicted `gamma·share` 0.452%/yr; 0.515% vs 0.514% at i=34; share drifts 0.0905 → 0.1032 over 36 months.

### 7.2 The electricity paradox, decomposed

Electricity is rising (`gamma ≈ 0.02–0.12/yr`) yet API prices fall at `lambda ≈ 0.45–2.3/yr`. Decompose the provider's price `p(t) = markup(t)·c_provider(t)` with markup compression `chi` and provider full-stack efficiency `mu_provider` (hardware perf/W + models + serving — it cuts energy per token too, so it applies to the whole stack, while `gamma` acts only on the provider's electricity share `sigma_E_prov`):

```
lambda = chi + mu_provider − gamma·sigma_E_prov        [/yr]
```

Illustrative: `mu_provider = 0.65`, `chi = 0.15`, `gamma = 0.06`, `sigma_E_prov = 0.10` ⇒ `lambda ≈ 0.794/yr` (halving time ≈ 0.87 yr); the electricity headwind (0.006/yr) is **two orders of magnitude** smaller than the efficiency-plus-competition tailwind (0.80/yr), because `gamma` multiplies a 5–15% cost share while `mu_provider` multiplies everything. Both facts are simultaneously true; the shares make them compatible. At 2026-central parameters the self-hoster's own drag `gamma·sigma_E ≈ 0.09–0.42 %/yr` — real, but three orders of magnitude below `lambda` (Section 10): **the glacier melts from the top, not the bottom.**

### 7.3 The feedback loop

Write `gamma = gamma_base + theta·L_AI` (`L_AI` = AI-datacenter load growth, `theta` = grid pass-through; PJM's data-center-driven capacity-price spikes are the empirical face of `theta > 0`): token demand heats the ground under its own glacier. Net effect on the melt rate, using 7.2:

```
dDelta/dgamma = 1 − sigma_E_prov ≈ 0.9 > 0
```

— rising electricity **melts the glacier faster on net**: it hits the self-hoster's full electricity exposure directly while slowing API price declines only through the provider's small share. The externality is asymmetric **against BUILD**.

### 7.4 Hybrid / utilization corollary

`epsilon ∝ 1/u` exactly: halving duty cycle doubles electricity per served token, because idle watts are billed but produce nothing. A marginal slot at duty cycle `u_slot` has NPV linear in `u_slot` (revenue leg ∝ `u_slot`; power+capex legs fixed). **There are two utilization thresholds, and they govern different decisions** — an earlier version of this section conflated them by loading a 1/N crew share into the marginal slot, an average-cost number misapplied as a marginal rule:

**(i) Marginal include/shed threshold — governs the per-workload decision.** Under this spec's own model `m` is fixed with respect to `N` (Sections 5.2/7.5 — that fixity is exactly what creates `Q0_min`), so a marginal slot carries **no crew share**:

```
u_min = [ (w·phi·e0·Y/3600)·F(r−gamma, T) + h·(1 − e^(−(r+delta)T)) ]
        / [ (s0·Y·p0/kappa)·F(lambda+r−mu, T) ]        [– : $ / $]
      = 0.1629 at central 2026 parameters
```

**Verified** (`review_fixes2.py`): slot power PV $5,127.79 + capex net of salvage $41,151.64 = **$46,279.42** against revenue **$284,064.02 per unit duty**; `u_min = 0.162919`, and at `u_min` marginal revenue = marginal cost by independent Simpson (rel 6.3e−16). A slot at the archetype's `u = 0.45` clears this threshold 2.76× and contributes **+$81,549** PV toward the fixed toll. **Rule: include every workload slot whose duty cycle clears `u_min`; burst everything spikier to the API — the API is your peaker plant.** Fleet viability is then a *separate, fleet-level* check: `Σ_slots (u_slot·Rev − SlotCost) ≥ D + m·F(r,T)` (= $2,258,778 at central).

**(ii) Average-cost viability metric — never a per-slot cutoff under fixed `m`.** Loading a 1/N crew share (`m_slot = m/11`, crew PV $159,888.92 — 77.6% of the loaded slot cost) gives

```
u_bar = [SlotCost + m_slot·F(r,T)] / Rev = 206,168.35 / 284,064.02 = 0.725781
```

(cost = revenue = $206,168.35 at `u_bar`, Simpson rel 1.5e−14). This is the average duty at which a slot covers power + capex + its crew share; it is a fleet-level diagnostic (an N = 11 fleet whose *average* duty is below `u_bar` cannot clear crew + capex + power, even before `D`), and it is a valid per-slot cutoff **only** if the crew genuinely scales per slot — which contradicts the fixed-`m` treatment of 5.2/7.5 and is not this spec's model.

**The distinction is decision-flipping (verified, `review_fixes2.py`).** Eleven slots at `u = 0.80` give fleet NPV **−$268,088** (non-viable alone). Adding six `u = 0.45` slots — each above `u_min` but below `u_bar` — adds 6 × $81,549 = **+$489,296**, taking the fleet to **+$221,208: a viable BUILD**. The average-cost cutoff, applied per-workload, sheds those six slots and forfeits the build. The corrected reading of the central archetype: a `u = 0.45` peaky-SaaS slot *does* pay its own marginal way at central 2026 parameters; what the 5B tok/month fleet cannot pay is the **fixed crew + dev toll** — the Section 10 failure is at the fleet level, not the slot level. (Formulas assume the slot stays powered to `T`; a post-melt power-off option would lower both thresholds slightly — conservative.)

### 7.5 Minimum-scale corollary

`G = Q0·Gamma_1` (the **windowed** `Gamma_1` of Section 1.2) scales with volume and capacity-sized capex is quasi-variable (`H = Q0·eta`), but `D` and `m` are not ⇒ `NPV(Q0) = Q0·(Gamma_1 − eta_net) − [D + m·F(r,T)]` is linear with a fixed toll intercept, giving the `Q0_min` threshold of Section 5.2 (with its integer-N sawtooth, and — in the forms-later case — with `Gamma_1` and `eta` both evaluated on the window `[min(t*,T), T]`, per 5.2's verified example). The toll gate is what creates the threshold; below it the ice can never repay the toll at any date.

### 7.6 Wait-vs-build-now first-order condition

**Framing (stated explicitly — the FOC's terms depend on it).** Deferring the build to `tau_b` operates the fleet over `[tau_b, tau_end]` with **`tau_end` fixed at the harvest end** (`tau_end = min(T, t*)`) — deferral shortens the operating window from the front, not the back. Under this fixed-exit framing the salvage leg `H·e^(−delta·tau_end)·e^(−r·tau_end)` is invariant to the build date (hardware market value decays on calendar time whether or not you own it yet), so it legitimately drops from the FOC. The MLOps leg does **not** drop: its PV is `(m/r)·(e^(−r·tau_b) − e^(−r·tau_end))`, and deferral shrinks it at rate `+m·e^(−r·tau_b)`. With the open-model gap closing at rate `q` (`kappa(tau_b) = kappa·e^(−q·tau_b)`) and hardware repricing at `delta`, the deferral value is

```
W(tau_b) = ∫_{tau_b}^{tau_end} a(t; tau_b)·Q(t)·e^(−r·t) dt − e^(−r·tau_b)·D − e^(−(r+delta)·tau_b)·H
           − (m/r)·(e^(−r·tau_b) − e^(−r·tau_end))        [+ build-date-invariant salvage]
```

and at `tau_b = 0` (envelope theorem kills the `tau_end = t*` shift when the window ends at the melt date, since `a(t*) = 0`):

```
dW/dtau_b |₀ = − a(0)·Q0  +  r·(D + H)  +  delta·H  +  m  +  q·kappa·epsilon0·Q0·F(beta_Q, tau_end)      [$/yr]
```

**WAIT iff positive**: the fattest slice you would forfeit (`a(0)·Q0` — maximal at t = 0 in the melting case) against interest saved on the toll, hardware price decline, **the MLOps window you never pay for**, and a better open model applied to the whole remaining glacier. At central parameters the `m` term (+$500K/yr) is the single largest toll-side entry — ≈5× the rest of the net FOC combined; an earlier version of this formula omitted it, and in the Step-10 lean corner the omission is result-changing (below). *Alternative framing:* if the operating window is instead a **fixed length T from the build date**, the ops term becomes `+r·m·F(r,T)` (= $263.8K/yr at central — ≈1.9× smaller) and the salvage-invariance argument no longer holds (salvage shifts with the build date); a dashboard must state which framing it implements. This spec uses fixed-exit throughout.

**Verified** (`review_fixes.py`, Richardson FD on the full deferral value W including the ops leg): central scaleup with `q = 0.25`: `−206,761 + 150,900 + 151,800 + 500,000 + 6,758 = +$602,698/yr > 0 ⇒ WAIT` (FD rel 6.9e−12) — consistent with its BUY verdict. Lean corner (Step 10 parameters): `−208,712 + 34,080 + 82,800 + 200,000 + 3,307 = +$111,475/yr ⇒ WAIT` (FD rel 3.0e−11); without the `m` term the same corner reads `−$88,525/yr` (build now) — **the corner's build-timing verdict flips on this term.**

**Scale corollary (corrected — replaces an earlier claim that "well above Q0_min the forfeited slice dominates, build early", which is wrong at central parameters).** Under capacity-scaled capex (`H = Q0·eta`, Sections 5.2/7.5) every Q0-proportional term of the FOC scales together — the pro-WAIT carrying terms `(r+delta)·H` and the q-term scale with `Q0` exactly like the forfeited slice `a(0)·Q0`. Per unit of Q0 the coefficient is

```
c₁ = − a(0) + (r+delta)·eta + q·kappa·epsilon0·F(beta_Q, tau_end)      [$/token]
```

and the scale-free terms are `r·D + m > 0` (both pro-WAIT). **At large Q0 the FOC sign is governed by `a(0)` vs `(r+delta)·eta + q·kappa·epsilon0·F(beta_Q, tau_end)`**: build-early-at-scale holds only when the forfeited margin exceeds the capacity-scaled carrying terms. At central 2026 parameters `c₁ = −3.446e−6 + 3.756e−6 + 1.13e−7 = +4.23e−7 $/tok > 0`, so **WAIT is favored at every scale** — integer-N recomputation at 10×/100×/1000× central Q0 gives FOC = +$831K / +$3.12M / +$25.95M per yr (all WAIT; still +$331K / +$2.62M / +$25.45M even without the m term). In the Step-10 lean corner `c₁ = −1.80e−6 $/tok < 0`, so build-early does re-emerge at scale there — but only above ≈1.2e11 tok/yr (integer-N scan: first crossing 1.18e11, permanently negative above 1.23e11 ≈ 10B tok/month, about 2× the archetype's volume); at the corner's actual `Q0 = 6e10` the scale-free `m` still tips the FOC to WAIT (+$111,475/yr). The scale-free toll terms `r·D + m` are what create the near-`Q0_min` vs far-above-`Q0_min` distinction, and they always push toward WAIT near `Q0_min` — never toward build-early at scale. (All verified in `review_fixes.py`. The FOC ranks build dates only; below `Q0_min` no build date wins.)

---

## 8. Discrete monthly engine specification

### 8.1 Conventions (exact)

Month index `i = 0..M−1`, `M = 12·T`, month length `Delta_m = 1/12` yr; `HOURS_PER_MONTH = 730.5` exactly. Exponentials sampled at **month start** via exact factors `Fg = e^(g/12)`, `Fp = e^(−lambda/12)`, `Fe = e^(gamma/12)`, `Fs = e^(mu/12)`, `Fd = e^(−r/12)`. Single uniform convention — **month-start rate × month volume, month-start discounting — applied identically to both paths and every flow**; salvage is a point cash flow discounted from exactly `t = T`.

**Bias lemma (proved and verified).** For a flow with total exponent `x` [/yr] (all rates plus discounting), discrete/continuous PV = `B(x) = (x·Delta_m)/(e^(x·Delta_m) − 1) = 1 − x·Delta_m/2 + O(x²)`, independent of M — the convention overstates net-declining flows (melting API spend) by ≈ `|x|/24` and understates growing ones; shrinks O(Delta_m) with finer steps. Verified exactly on Vector B: `npvBuy_discrete/continuous = 1.03340982 = B(−0.7931)` to 9 digits (`synth_engine.mjs`). Because both paths share the convention the bias partially cancels in the difference. State it; never mix conventions.

### 8.2 State recurrences (units explicit)

```
disc_i   = Fd^i                                  [–]
q_i      = (Q0/12)·Fg^i                          [ref tok/month]
p_i      = p0·Fp^i                               [$/ref tok]
e_i      = e0·Fe^i                               [$/kWh]
s_i      = s0·Fs^i                               [tok/s/GPU]
eps_i    = w·phi·e_i/(3600·s_i·u)                [$/open tok]      (design utilization)
d_i      = kappa·q_i                             [open tok]
cap_i    = N·s_i·u·(Y/12)                        [open tok]
ovOpen_i = max(0, d_i − cap_i)                   [open tok]        ← compute in OPEN-token space
serve_i  = d_i − ovOpen_i;  ovRef_i = ovOpen_i/kappa               [open tok; ref tok]
kWh_i    = N·w·phi·730.5                         [kWh]             ← ALWAYS full fleet: idle-honest
elec_i   = e_i·kWh_i                             [$]
costBuy_i   = p_i·q_i                            [$]
opBuild_i   = elec_i + m/12 + p_i·ovRef_i        [$]               ← overflow bought from API
discBuy_i   = disc_i·costBuy_i
discBuild_i = disc_i·opBuild_i + (D + H if i=0) − (pvSalvage if i=M−1)
pvSalvage   = H·e^(−delta·T)·e^(−r·T)
breakEvenMonth = min{ i : CumDiscBuy_i − CumDiscBuild_i ≥ 0 }  (null if never)
verdict = BUILD iff npvBuild < npvBuy
```

`D + H` appear once (cash at t = 0); salvage once (at T, booked into row M−1) — a break-even at `i = M−1` is **salvage-dependent** (Vector B demonstrates). **Propagated defect fix:** compute overflow as `max(0, kappa·q_i − cap_i)/kappa`, never as `q_i − serve_i/kappa` (the round-trip through kappa produces ~1e−6-token float noise; observed and rejected in the source verification).

**Sizing rule (robust):** `N = ceil(kappa·q_peak·12/(s0·u·Y))`, `q_peak = max_i q_i`; manual `N_override` (≥ 0) replaces it; `N_override = 0` degenerates BUILD into "pay D and m, buy everything" (guard-tested). **Conservativeness lemma:** since `q_peak ≥ q_i` and `e^(mu·i/12) ≥ 1` for `mu ≥ 0`, zero overflow is guaranteed whenever `mu ≥ 0`. This rule does not credit future `mu` (robust to `mu = 0` materializing); it therefore over-provisions relative to Section 4.1's mu-credited rule when `mu > 0` — on the Section-10 scaleup, N = 76 vs 11 at T = 5 (`synth_verify2.py`). Use the engine rule for committed monthly plans; use the mu-credited rule for the closed-form screens; a staged-purchase extension would dominate both.

**Chart series (never in the NPV):** `unitVarRef_i = kappa·eps_i`; `actualVarRef_i = elec_i/(serve_i/kappa)` (null-guarded — equals `kappa·eps_i·cap_i/serve_i > kappa·eps_i` when under-utilized); `amortMonth = (H + D − pvSalvage)/M`; `allin_i = (elec_i + m/12 + amortMonth)/(serve_i/kappa)` — a levelized-cost view, INTUITION ONLY (Vector A: all-in beats API from month 0, yet break-even is month 13 because `D+H` is cash up front). **Token Yield series:** `yieldBuy_i = v_ref/p_i`; `yieldBuild_i = v_ref/allin_i`; `elecShareAllin_i = elec_i/(elec_i + m/12 + amortMonth)`; `gammaDrag_i = gamma·elecShareAllin_i`. Closed-form readouts use the stable geometric sum `geo(k,M) = expm1(M·k)/expm1(k)`, `geo(0,M) = M` (verified: `geo(1e−14,24) = 24.0000000000028`).

### 8.3 Reference implementation (this exact code was rerun to produce 8.4)

```js
const Y = 31557600, HPM = Y/3600/12;                      // 730.5 h/month
const geo = (k, M) => k === 0 ? M : Math.expm1(M*k)/Math.expm1(k);
function simulate(P) {
  if (!(P.u > 0 && P.u <= 1) || !(P.s0 > 0) || !(P.p0 > 0)) throw new Error('bad params');
  const M = Math.round(12*P.T);
  const dg = P.g/12, dp = -P.lambda/12, de = P.gamma/12, ds = P.mu/12, dd = -P.r/12;
  const q0m = P.Q0/12;
  let qPeak = 0; for (let i = 0; i < M; i++) qPeak = Math.max(qPeak, q0m*Math.exp(dg*i));
  const N_auto = Math.ceil(P.kappa*qPeak*12/(P.s0*P.u*Y));
  const N = P.N_override ?? N_auto;
  const H = N*P.h;
  const salvage = H*Math.exp(-P.delta*P.T);
  const pvSalvage = salvage*Math.exp(-P.r*P.T);
  const amortMonth = (H + P.D - pvSalvage)/M;              // INTUITION ONLY — never in NPV
  const series = []; let cumBuy = 0, cumBuild = 0, breakEvenMonth = null, meltMonth = null;
  for (let i = 0; i < M; i++) {
    const disc = Math.exp(dd*i);
    const q = q0m*Math.exp(dg*i), p = P.p0*Math.exp(dp*i);
    const e = P.e0*Math.exp(de*i), s = P.s0*Math.exp(ds*i);
    const eps = P.w*P.phi*e/(3600*s*P.u);
    const d = P.kappa*q, cap = N*s*P.u*(Y/12);
    const ovOpen = Math.max(0, d - cap);                   // exact-zero overflow when covered
    const serve = d - ovOpen, serveRef = serve/P.kappa, overflowRef = ovOpen/P.kappa;
    const kWh = N*P.w*P.phi*HPM, elec = e*kWh;             // idle-honest: full fleet, always
    const costBuy = p*q, opBuild = elec + P.m/12 + p*overflowRef;
    const discBuy = disc*costBuy;
    let discBuild = disc*opBuild;
    if (i === 0)   discBuild += P.D + H;
    if (i === M-1) discBuild -= pvSalvage;
    cumBuy += discBuy; cumBuild += discBuild;
    if (breakEvenMonth === null && cumBuy - cumBuild >= 0) breakEvenMonth = i;
    if (meltMonth === null && p < P.kappa*eps) meltMonth = i;
    const allin = serveRef > 0 ? (elec + P.m/12 + amortMonth)/serveRef : null;   // zero-guard
    const tot = elec + P.m/12 + amortMonth;
    series.push({ i, q, p, e, s, eps, cap, serve, overflowRef, kWh, elec,
      costBuy, opBuild, discBuy, discBuild, cumBuy, cumBuild,
      unitVarRef: P.kappa*eps, actualVarRef: serveRef > 0 ? elec/serveRef : null, allin,
      yieldBuy: P.v_ref/p, yieldBuild: allin !== null ? P.v_ref/allin : null,
      elecShareAllin: tot > 0 ? elec/tot : null, gammaDrag: tot > 0 ? P.gamma*elec/tot : null });
  }
  return { M, N, N_auto, H, salvage, pvSalvage, amortMonth,
    npvBuy: cumBuy, npvBuild: cumBuild, npvSavings: cumBuy - cumBuild,
    breakEvenMonth, meltMonth, verdict: cumBuild < cumBuy ? 'BUILD' : 'BUY', series };
}
```

### 8.4 Test vectors — rerun independently by the synthesizer (`synth_engine.mjs`, node v22)

**My rerun reproduced Derivation 2's outputs exactly at every reported digit; the values below are my recomputation.** Shared inputs for all vectors: `kappa=1.2, s0=800 tok/s/GPU, u=0.6, w=1.2 kW, phi=1.3, e0=0.12 $/kWh, h=30,000 $/GPU, v_ref=2e−5 $/ref tok`. Derived: per-GPU monthly capacity `s0·u·(Y/12) = 1.26230e9` open tok; `epsilon0 = 1.08333e−7 $/open tok`; `kappa·epsilon0 = 1.30000e−7 $/ref tok`.

**Vector A — constant everything** (`g = lambda = gamma = mu = r = 0`), `T=2 (M=24), Q0=1.2e11 ref tok/yr, p0=4e−6, delta=0.25, D=120,000, m=96,000/yr, N auto`:

| Output | Value | Output | Value |
|---|---|---|---|
| N (auto) / H | 10 / 300,000 | salvage = pvSalvage (r=0) | 181,959 (181,959.198) |
| amortMonth | 9,918.37 | monthly elec / kWh | 1,367.50 / 11,395.8 |
| **npvBuy** | **960,000** (exact) | **npvBuild** | **462,861** (462,860.706) |
| npvSavings | 497,139 | **verdict** | **BUILD** |
| breakEvenMonth | **13** (cum diff i=12: −21,777.4; i=13: +8,855.06) | meltMonth | **null** (t* = ∞) |
| p / kappa·eps (const) | 4.00000e−6 / 1.30000e−7 | allin (const) | 1.92859e−6 |
| actualVarRef | 1.36750e−7 (util 12/12.623 < design u) | yieldBuy / yieldBuild | 5.00000 / 10.3703 |
| closed-form crosscheck | elecPV 32,819.9; mPV 192,000; buy exact; build rel 6.3e−16 | glacier G (double zero-limit `alpha=beta_Q=0`) | **928,800** = (4e−6 − 1.3e−7)·1.2e11·2 exact |

**Vector B — melting glacier**: `lambda=0.6931 (12-mo halving), gamma=0.05, r=0.10, g=mu=0, T=3 (M=36), Q0=1.2e11, p0=4e−6, delta=0.25, D=120,000, m=60,000/yr, N auto → 10`:

| Output | Value | Output | Value |
|---|---|---|---|
| salvage / pvSalvage | 141,710 / 104,981 (104,981.325) | amortMonth | 8,750.52 |
| **npvBuy** | **567,515** (567,514.917) | **npvBuild** | **516,987** (516,987.412) |
| npvSavings | 50,527.5 | **verdict** | **BUILD** (narrow, salvage-dependent) |
| breakEvenMonth | **35** = M−1: cum diff −53,494.5 at i=34 flips to +50,527.5 only when the 104,981 salvage credit lands | meltMonth | **null** (t* = 4.61111 yr → month 56 > horizon) |
| final p / kappa·eps | 5.29804e−7 / 1.50410e−7 | final allin / actualVarRef | 1.53327e−6 / 1.58220e−7 |
| yieldBuy 0→35 | 5.00000 → 37.7498 | yieldBuild 0→35 | 13.2293 → **13.0440** (gamma drag) |
| elec share 0→35 | 0.0904547 → 0.103191 | drag obs vs `gamma·share`, i=0 / i=34 | 0.00453132 vs 0.00452274; 0.00514992 vs 0.00514030 /yr |
| closed-form crosscheck | elecPV 45,810.8; mPV 156,158; both legs rel ≤ 4.1e−16 | bias lemma | discrete/continuous = 1.03340982 = B(−0.7931) exact |

Honest note for the dashboard: by i=33 the discounted *monthly* comparison has inverted (discBuy 4,517.03 < discBuild 4,989.68) — BUILD wins on early harvest plus salvage while bleeding at the margin near the end.

**Vector C — edge case, BUILD never breaks even** (undersized fleet, fast melt, hot electricity): `T=3 (M=36), Q0=1.8e10, p0=1.5e−6, lambda=1.0, gamma=0.15, mu=g=0, r=0.10, delta=0.35, D=200,000, m=60,000/yr, N_override=1` (auto = 2; permanent overflow: cap 1.26230e9 open tok/mo vs demand 1.8e9 ⇒ ovRef = 4.48080e8 ref tok/mo, all 36 months):

| Output | Value | Output | Value |
|---|---|---|---|
| **npvBuy** | **24,740.2** (24,740.1981) | **npvBuild** | **391,071** (391,071.433) |
| npvSavings | **−366,331** | **verdict** | **BUY** |
| breakEvenMonth | **null** (D+H = 230,000 is 9.3× total BUY NPV) | **meltMonth** | **26** = floor(12·t*)+1, t* = 2.12668 yr; engine and closed form agree; a(t*) residual ~1e−23 |
| final p / kappa·eps | 8.11706e−8 / 2.01348e−7 | glacier fully melted month 26: variable cost alone exceeds API price | |
| final allin / yieldBuild | 1.08227e−5 / 1.84796 | yieldBuy final | 246.394 |
| closed-form crosscheck | elecPV 5,300.33; mPV 156,158; ovPV 7,390.39; build rel 6.0e−16 | pvSalvage | 7,777.21 |

**Guards (all passed in my rerun):** sizing with `g=0.4, mu=0.1` on Vector-A inputs → N_auto = 21, **zero** overflow months (conservativeness lemma); `N_override=0` → allin = null (no division by zero), `npvBuild = D + m·T + npvBuy = 1,272,000` exactly; `geo(0,24)=24` exact; overflow computed in open-token space is exactly 0 when covered.

---

## 9. Default parameters (August 2026; **[web]** = web-sourced by Derivation 4 on 2026-08-28, **[KB]** = knowledge-based, verify before boardroom use)

### 9.1 Hardware, power, electricity

| Symbol | Low | Central | High | Sourcing / notes |
|---|---|---|---|---|
| `h` H100 SXM ($/slot all-in) | 28,000 | 36,000 | 45,000 | **[web]** card $25–40K; +server/network/install **[KB]** |
| `h` H200 SXM | 40,000 | **46,000** | 55,000 | **[web]** 8-GPU HGX server $320–420K deployed |
| `h` B200 | 50,000 | 58,000 | 70,000 | **[web]** HGX B200 $400–500K; supply-constrained |
| `w` H100/H200 (kW/slot) | 0.90 | **1.30** | 1.40 | **[web]** DGX max 10.2 kW ÷ 8; low = ~70% sustained **[KB]**; drawn whenever on, independent of u (conservative) |
| `w` B200 | 1.40 | 1.80 | 2.00 | **[web]** DGX B200 ≈ 14.3 kW ÷ 8 |
| `phi` (PUE) | 1.10 | **1.30** | 1.60 | **[KB, verify]** hyperscale ≈1.1–1.2; good colo 1.25–1.4; industry avg ≈1.55 |
| `e0` ($/kWh) | 0.07 | **0.09** | 0.15 | **[web]** US industrial 8.66c mid-2026 (EIA); low TX/PNW; high commercial-rate |
| `gamma` (/yr) | 0.02 | **0.04** | 0.12 | **[web]** long-run US ≈2–3%; 2024–26 retail 4–7%/yr; PJM/Virginia data-center corridors justify the 0.12 high (DC +24.5% Jul-24→Jul-25; PJM capacity auction +833% then +22%) |

Colo capacity fees ($160–380/kW-month **[web]**, ≈ $0.22–0.52/kWh-equivalent at full draw, 730.5 h/month) are a *capacity* charge usually net of metered energy: book as fixed $/yr in `m`/facility line; keep `e0` = metered energy in `epsilon(t)`. Do not double count.

### 9.2 Throughput, utilization, efficiency

Blending convention (must match Q's blended definition): with R input tokens per output token and prefill ≈ 10× decode, blended `s = (1+R)/(1/s_out + R/s_in)`; e.g. s_out = 700, s_in = 7,000, R = 3 ⇒ 2,154 blended tok/s ≈ 3.1× output-only.

| Symbol | Low | Central | High | Sourcing / notes |
|---|---|---|---|---|
| `s0` ~70B dense, H100/H200, vLLM, production latency (blended tok/s/GPU) | 900 | **2,000** | 4,000 | **[web]** benchmarks; production SLOs cut relaxed-latency numbers 40–60% **[KB]**. **This is the central default** consumed by Sections 9.4 and 10 (`epsilon0 = 4.69444e−8`, N = 11) |
| `s0` large MoE (DeepSeek-class), 8-GPU node | 800 | 2,200 | 4,600 | **[web]**; high = expert-parallel serving **[KB, verify]**. **Alternative preset, not the central default** (Section 10 Step 10's lean corner borrows its 2,200) |
| B200 multiplier | 1.8× | 2.5× | 3.0× | **[web]** |
| `u` peaky SaaS | 0.25 | **0.45** | 0.65 | **[web]** production clusters; provision-for-peak forces u below peak |
| `u` batch/offline | 0.60 | 0.80 | 0.90 | **[KB, verify]** |
| `mu` (/yr, fixed hardware) | 0.15 | **0.40** | 0.70 | **[web]** FP8 + speculative decoding ≈3.6× over ~2 yr in 2024–26 wave. **Warning: exponential mu over long T is aggressive — cap or decay beyond ~3 yr** |

### 9.3 BUY side (blended 3:1 in:out; $/M tokens)

Aug-2026 blended prices **[web]**: GPT-5.2 ≈ 2.41; Gemini 2.5 Pro ≈ 3.44; Claude Sonnet 5 ≈ 6.00 (4.00 intro); Claude Haiku 4.5 ≈ 2.00; Claude Opus 5 ≈ 10.00; hosted open: Llama-3.3-70B ≈ 0.155 (DeepInfra), DeepSeek V3 ≈ 0.32, DeepSeek V3.1 ≈ 0.875 (Together).

| Symbol | Low | Central | High | Notes |
|---|---|---|---|---|
| `p0` frontier workhorse ($/M blended) | 2.0 | **3.5** | 10.0 | batch APIs −50% and caching cut effective blended 30–50% — model as a p0 discount, not a new symbol |
| `p0_open` hosted open-weight | 0.15 | **0.55** | 0.90 | **the critical BUY lower bound** — run the model twice: vs frontier `p0` (with kappa, full `D`), and a hosted-open run **denominated in open-model tokens**. Open-token recipe: **first convert the workload, `Q0_open = kappa·Q0`** (the reference workload needs `kappa` open tokens per reference-token outcome whether served by the hosted-open API or your own GPUs), then set `kappa = 1` in every formula — glacier margin AND fleet sizing — with `D` reduced to its infra-only portion (model-integration/eval work is common to both paths and cancels). Equivalently: stay in the ref-token basis with price `kappa·p0_open` and cost `kappa·epsilon0` (`kappa` cancels in `R0`, so `t*` is unchanged) against the same infra-only toll — the two bases give identical dollars and an identical, basis-invariant `Toll/G`, as a pure change of denomination must; dropping the volume conversion understates the open-basis `G` by exactly `kappa` and undersizes the fleet. One basis per run, never mixed; see Step 7. BUILD must beat hosted-open to be defensible |
| `lambda` fixed-capability | 2.3 | 3.9 | 6.8 | **[web]** Epoch: median ≈50×/yr price decline at fixed capability |
| `lambda` tier pricing | ≈0 (flagship) | 0.45 (mid-tier) | 0.63 (economy) | **[web]** flagship near-zero (reasoning premium) |
| **`lambda` recommended** | 0.45 | **0.90** (t_half ≈ 9.2 mo) | 2.3 | a real buyer ratchets capability up (slower than fixed-capability decline) but does not always buy flagship; **the single most sensitivity-critical parameter — always sweep [0.45, 2.3]** |

### 9.4 People, quality, finance, demand

| Symbol | Low | Central | High | Notes |
|---|---|---|---|---|
| `D` ($) | 150K | **500K** | 1.5M | **[web]** loaded ML eng $16–25K/eng-month; 2×3 mo / 4×5 mo / 6×10 mo |
| `m` ($/yr) | 200K | **500K** | 1.2M | 1–3 dedicated FTE + tooling/on-call **[KB]**; **sets a hard volume floor** |
| `kappa` | 1.0 | **1.15** | 1.5 | **[web]** open-weight ~4 months behind frontier; coding near parity (low); agentic chains compound per-step deltas (high) |
| `delta` (/yr) | 0.18 | **0.30** | 0.45 | **[web]** H100 used-market realized ≈0.17–0.22 but accelerating post-2yr; A100's 60–80% retention was a shortage anomaly — do not extrapolate; central ⇒ 3-yr salvage = 41% of H |
| `r` (/yr) | 0.08 | **0.15** | 0.30 | **[KB]** enterprise WACC → growth-stage hurdle (continuous compounding) |
| `g` (/yr) | 0.20 | **0.70** (2×/yr) | 1.60 | **[web]** platform-level ≈1.9/yr is an upper bound (includes new-customer inflow); central = healthy single product doubling yearly |
| `Q0` presets | startup 2.4e9 | **scaleup 6.0e10** | enterprise 6.0e11 tok/yr | = 200M / 5B / 50B tok/month |

**Consistency validation (passes centrally; the electricity-alone failure requires sub-table throughput — labeled).** Central H200/70B-dense/colo slot (`s0 = 2,000`, the central default): $/powered-hour = 1.3·1.3·0.09 = **$0.1521/h**; tokens/h = 3600·2000·0.45 = 3.24M ⇒ `epsilon0 = $0.047/M tok` = **8.5%** of the hosted-open central price ($0.55/M) — electricity is a small share; capex+people dominate. Adding 3-yr straight-line capex (~$0.54/M) reproduces the hosted-open price level almost exactly — the parameters recover observed market prices, the strongest available validation. **Within the documented 9.1/9.2 ranges, electricity alone never exceeds the hosted-open central**: the worst in-table corner (`u = 0.25`, `e0 = 0.15`, PUE 1.6, `w = 1.4` — all table extremes) reaches $0.467/M at the MoE table low `s0 = 800` (85% of $0.55/M) and $0.415/M at the 70B-dense low `s0 = 900` (verified, `review_fixes2.py`). The failure appears only at **`s0 = 600` — below both table lows: a degraded/SLO-throttled deployment, pinned out-of-table deliberately** — where the same corner gives $0.622/M on electricity alone ($0.578/M at central `w = 1.3` — still failing) > hosted-open central: precisely the regime where BUILD should be rejected (low utilization and degraded throughput are the glacier's silent killers). A dashboard whose slider ranges follow 9.2 will not reach this corner — that is a property of the table's ranges, not of the model. **Sensitivity order at central: `lambda ≫ u ≈ s0 > m > delta > kappa > gamma`.**

Sources (as compiled by Derivation 4, searched 2026-08-28): EIA STEO; eco3min US industrial electricity; Utility Dive; Heatmap/IEEFA (PJM); Mercatus (H200/B200 servers); IntuitionLabs and Compute Exchange (GPU pricing); Hashrate Index (used-GPU market); NVIDIA DGX docs; datacenterHawk/Encor (colo); Anthropic/OpenAI/Google pricing pages via BenchLM/pricepertoken/cloudzero; Epoch AI (inference price trends; open-closed gap); a16z (LLMflation; State of AI); arXiv 2511.23455 (tier-pricing half-lives); arXiv 2109.01313 and HPCwire (cluster utilization); Red Hat/Introl (speculative decoding); dzhsurf (DeepSeek 8-GPU benchmarks); Spheron (B200 serving); KORE1/exceeds.ai (ML eng loaded cost); OpenRouter State of AI.

---

## 10. Worked example: the "scaleup" archetype, 5B tokens/month, through the closed forms

All central parameters (Section 9): `Q0 = 6.0e10` ref tok/yr, `g = 0.70`, `p0 = 3.5e−6` $/tok, `lambda = 0.90`, `kappa = 1.15`, `s0 = 2,000` tok/s, `u = 0.45`, `mu = 0.40`, `w = 1.3` kW, `phi = 1.3`, `e0 = 0.09` $/kWh, `gamma = 0.04`, `h = 46,000` $/GPU (H200), `delta = 0.30`, `D = 500,000`, `m = 500,000`/yr, `r = 0.15`, `T = 5` yr. Every number below recomputed end-to-end (`synth_verify.py` Part 10; Step 8 re-verified in `review_fixes.py`; Step 7 re-based in `review_fixes3.py`); Simpson cross-checks in brackets.

**Step 1 — electricity per token.** `epsilon0 = w·phi·e0/(3600·s0·u) = (1.3·1.3·0.09)/(3600·2000·0.45) = 0.15210/3,240,000 = 4.69444e−8 $/tok` (= $0.047/M). `kappa·epsilon0 = 5.39861e−8 $/tok`.

**Step 2 — melt clock.** `R0 = 3.5e−6/5.39861e−8 = 64.8315`; `Delta = 0.90 + 0.04 − 0.40 = 0.54/yr`; `t* = ln(64.8315)/0.54 = 7.72554 yr` (discrete melt month 93). The harvest window is capped by the horizon: `tau = min(5, 7.72554) = 5 yr`.

**Step 3 — glacier volume.** `alpha = 0.90 + 0.15 − 0.70 = +0.35/yr`; `beta_Q = 0.15 + 0.40 − 0.04 − 0.70 = −0.19/yr` (the ε-leg *grows* in PV because demand growth beats discounting). `F(0.35, 5) = 2.360646 yr`; `F(−0.19, 5) = 8.345840 yr`.
`Gamma_1 = 3.5e−6·2.360646 − 5.39861e−8·8.345840 = 8.26226e−6 − 4.50558e−7 = 7.81170e−6 $·yr/tok` (windowed form with `[t1, t2] = [0, tau]` — melting case).
**`G = 6.0e10 · 7.81170e−6 = $468,702`** [Simpson: 468,702.07, rel 4.0e−15]. (This independently confirms Derivation 4's Set-A value.)

**Step 4 — toll gate.** Fleet (mu-credited rule): `N = ceil(1.15·6e10·e^(0.30·5)/(2000·0.45·Y)) = ceil(10.888) = 11` GPUs; `H = $506,000`. Capex net of salvage: `1 − e^(−0.45·5) = 0.894601` ⇒ `H_net = $452,668`. Crew: `m·F(0.15,5) = 500,000·3.517556 = $1,758,778`. **`Toll = 500,000 + 452,668 + 1,758,778 = $2,711,446`** (shares: D 18.4%, hardware 16.7%, people 64.9%).

**Step 5 — decision.** `G/Toll = 0.173` ⇒ **BUY, decisively**. Cash-exact cross-check (fixed always-on fleet): `C_buy = p0·Q0·F(0.35,5) = $495,736`; `PV_elec = W_e·F(0.11,5) = 11·1.3·1.3·8766·0.09·3.845905 = $56,406`; **`NPV_adv = −$2,272,116`** [Simpson rel 4.1e−16]. Even with `D = 0` **and** free hardware, the crew alone (`$1.76M PV`) is 3.75× the entire glacier. `D_max = 500,000 + (−2,272,116) = −$1,772,116 < 0`: no dev budget justifies this build.

**Step 6 — scale threshold.** `eta = h·kappa·e^(1.5)/(s0·u·Y) = 8.34739e−6`; `eta_net = 7.46759e−6`; `Gamma_1 − eta_net = 3.44116e−7 $·yr/tok` ⇒ `Q0_min = 2,258,778/3.44116e−7 = 6.56e12 tok/yr ≈ 547B tok/month` — this archetype is ~109× below threshold. (The sized-at-T conservatism is punitive here: at `T = 3`, `N = 6`, `Toll = $1,912,356`, `G = $376,940`, `G/Toll = 0.197`, `NPV_adv = −$1,542,760`, and `Q0_min = 5.91e11 tok/yr ≈ 49B tok/month` — an order of magnitude lower, because the `e^((g−mu)T)` capex inflation is smaller. Staged purchasing would lower it further; the BUY verdict at 5B tok/month survives every variant.)

**Step 7 — the defensible benchmark: hosted open-weight.** Same weights via API. **Basis rule (one recipe for the dashboard):** this run is denominated in **open-model tokens**, per 9.3 — **first convert the workload, `Q0_open = kappa·Q0 = 1.15·6e10 = 6.9e10` open tok/yr** (the open model needs `kappa` tokens per reference-token outcome whether the tokens come from the hosted-open API or your own GPUs — the conversion applies to BOTH legs of the comparison), then `kappa = 1` in every formula, with `D` cut to its infra-only portion (model-integration/eval work is common to both paths and cancels; here `D_infra ≈ 0`). With `p0_open = 5.5e−7 $/open tok`: `R0 = 11.716` (`kappa` cancels), `t* = 4.55732 yr < T` ⇒ `tau = 4.55732`; `Gamma_open = 9.1234e−7 $·yr/open tok` ⇒ **`G_open = 6.9e10·9.1234e−7 = $62,951`** [Simpson rel 4.3e−15]. The toll is sized on the same converted volume: `Q0_open·e^(1.5)/(2000·0.45·Y) = 10.888` ⇒ `N = 11`, `H = $506,000` — necessarily the frontier run's physical fleet, since it serves the same open-token load (an N = 10 fleet would violate the Section-4.1 capacity constraint near `T`) ⇒ **`Toll_open = 0 + 506,000·0.894601 + 1,758,778 = $2,211,446`** — shortfall **35.1×** (`review_fixes3.py`). Because `Toll/G` is dimensionless, a genuine change of denomination cannot move it — and it doesn't: the ref-token basis (price `kappa·p0_open`, cost `kappa·epsilon0`; `kappa` cancels in `R0` so `t*` is unchanged) gives `G = kappa·$54,740 = $62,951` against the same `D_infra`-only toll — **35.1× identically** (equality verified to rel 2e−16). (Three earlier printed ratios are retired: "50×" mixed the bases outright; "39.6×" kept the numeral 6e10 as the open-token volume, understating `G_open` by exactly `kappa` and undersizing the fleet at N = 10; "43.1×" paired the correct `G = $62,951` with the frontier run's full-`D` toll that the same paragraph's argument says cancels.) Infrastructure economics alone cannot carry this build; the frontier-vs-open quality premium was doing most of the work in Step 3, and even that was insufficient.

**Step 8 — wait or build?** With the open-model gap closing at `q = 0.25/yr`, under the fixed-exit framing of Section 7.6: `dW/dtau_b|0 = −a(0)·Q0 + r(D+H) + delta·H + m + q·kappa·epsilon0·Q0·F(beta_Q, 5) = −206,761 + 150,900 + 151,800 + 500,000 + 6,758 = +$602,698/yr > 0 ⇒ WAIT` [Richardson FD on the full deferral value including the ops leg, rel 6.9e−12] — the MLOps-window term `m` is the single largest pro-WAIT entry; consistent with the BUY verdict; below `Q0_min`, no build date wins, and the FOC says even the ranking favors later.

**Step 9 — force vectors at these parameters.** Buyer: `d ln yield/dt = +lambda = +90%/yr`. Builder (all-in, N = 11): electricity $14,666/yr, capital rent `A_H = 452,668/3.517556 = $128,688/yr`, `m = $500,000/yr` ⇒ `sigma_E = 0.0228`; electricity drag `gamma·sigma_E = 0.091%/yr` against snowfall `mu = +40%/yr`. The downward electricity force vector is real, grows logistically as hardware amortizes, and reaches ~0.4%/yr at PJM-corridor `gamma = 0.12` — but it is three orders of magnitude below `lambda`. **The glacier melts from the top.** And since `a(t)` is variable-cost-only, `t* = 7.7 yr` is generous to BUILD — the binding economics run through `m`, `D`, `u`, `delta`, not through `epsilon`.

**Step 10 — what flips it.** A lean-BUILD corner (`lambda = 0.45` slow melt, `u = 0.80` batch, `s0 = 2,200` (the MoE preset's central, above the 2,000 central default), `m = $200K`, `D = $150K`, `e0 = 0.07`, `r = 0.08`) flips the same 5B tok/month to **BUILD**: `G = $1.64M` vs `Toll = $1.21M` (`G/Toll = 1.36`, fixed-fleet `NPV_adv = +$418K`). (Timing note: the corner's wait-FOC is `−208,712 + 34,080 + 82,800 + 200,000 + 3,307 = +$111,475/yr ⇒ WAIT` — without the `m` term it would read `−$88,525/yr` (build now); the corner's build-*timing* conclusion depends on the MLOps-window term (Section 7.6), while its BUILD-vs-BUY verdict `G > Toll` is unaffected.) The enterprise preset (50B tok/month) is still BUY at central (`G/Toll = 0.695`, `NPV_adv = −$2.35M` — the m-floor again) but decisive BUILD in the lean corner (`G/Toll = 5.19`, `NPV_adv = +$13.1M`). The decision is a coin balanced on `lambda`, `u`, and `m` — which is exactly what the sensitivity ordering (9.4) predicts.

---

## 11. Limitations and what would change the answer

1. **Constant exponential rates.** `lambda` has regime structure (fixed-capability ~3.9/yr vs flagship-tier ~0; the 0.90 central is a modeling compromise) and `mu` saturates; both should be swept, and any T > 3 result with `mu ≥ 0.4` treated as BUILD-optimistic. A regime-switching `p(t)` is the single highest-value model extension.
2. **Staged purchase and shutdown options are excluded.** Buying the horizon-peak fleet at t = 0 (Assumption 5) and never powering down (Assumption 8) both penalize BUILD; the `T = 3` vs `T = 5` gap in Section 10 Step 6 (Q0_min differing 11×) measures how much. A real-options engine (stage capex, abandon at `t*`, salvage early) strictly improves BUILD and would compress that gap.
3. **The salvage market is assumed liquid and `delta` stationary.** Vector B's win exists only because of the terminal salvage credit; a Blackwell/Rubin-driven step-devaluation or a frozen secondary market flips such marginal builds. Stress `delta` to 0.45 and to a zero-salvage floor.
4. **`kappa` is static and scalar.** Agentic workloads compound per-step quality deltas (effective `kappa` well above 1.5), and the gap trend (`q`-term) is the most uncertain input to the wait option. If open models reach durable parity on your task (`kappa → 1` with `D` small), the hosted-open benchmark (Step 7, run per 9.3's open-token recipe — `Q0_open = kappa·Q0`, then `kappa = 1`; the conversion becomes trivial precisely in this `kappa → 1` regime) becomes the binding BUY comparison and the build case must be re-argued from infrastructure economics alone.
5. **Taxes, financing, and accounting are out of scope** (Assumption 11): depreciation shields, GPU leasing/financing (converts H into an m-like flow and changes the toll's shape), and colo-vs-owned-facility structure all move the threshold; none change the glacier calculus itself.
6. **Single-workload aggregation.** One `(Q0, g, u, kappa)` tuple hides the portfolio structure; the hybrid corollary is the right decomposition, applied per-workload before any fleet is sized — with the **marginal** threshold `u_min = 0.163` (crew excluded; Section 7.4-i), never the average-cost `u_bar = 0.726`: include every slot whose duty clears `u_min`, then test the summed slot contributions against the fixed toll `D + m·F(r,T)` at the fleet level. Applying the average-cost figure per-workload sheds contribution-positive slots — the Section 7.4 example forfeits $489K of contribution and flips a viable BUILD to BUY.
7. **The feedback loop is stylized.** `gamma = gamma_base + theta·L_AI` with `dDelta/dgamma = 1 − sigma_E_prov > 0` is directionally robust (the externality is asymmetric against BUILD) but `theta` is grid-specific: siting in PJM/Virginia vs TX/PNW moves `gamma` by 6–10 points/yr — a location decision inside the build decision.
8. **What would most change the verdict**, in order: (i) `lambda` falling to the flagship-tier ~0.45 regime (slow melt — the lean-BUILD flip in Step 10); (ii) sustained `u ≥ 0.7` (batch/queue-fed workloads); (iii) `m` engineered below ~$200K/yr (shared ops, managed clusters); (iv) `Q0` at or above the 10^12 tok/yr scale with `g ≤ mu`; (v) hard non-price constraints — data governance, latency, sovereignty — which sit outside this model entirely and can dominate it.

**Verification summary.** Every closed form in this document was checked against independent numerical integration (Simpson, n = 20,000–40,000) or bisection/FD at 3+ parameter sets including exact singular manifolds (`alpha = 0`, `beta_N = 0`, `beta_Q = 0`, `r = 0`, `t* = 0`, `t* = ∞`, forms-later — including forms-later beyond the horizon (`t* > T`, GS6b) — and the engine's double zero-limit), with relative errors at machine precision (≤ 1e−14) for all quadrature identities and at the FD floor (≤ 1e−8) for all derivative identities; the discrete engine's three test vectors and five guard cases were rerun independently in node and reproduced the source derivation exactly. The first-round hostile-review fixes — the colo kWh-equivalence, the corner w-pinning, the wait-FOC's `m` term and corrected scale corollary, and the forms-later window clamp — were re-verified in `review_fixes.py` (Richardson FD on the full deferral value, rel ≤ 3.1e−11; integer-N FOC scans at 1–1000× Q0; spurious unclamped-G reproductions at three parameter points). The second-round fixes were re-verified in `review_fixes2.py`: the marginal utilization threshold (`u_min = 0.162919`, Simpson break-even rel 6.3e−16) and the $489K average-vs-marginal decision flip; the hosted-open basis unification (whose printed ratios were themselves superseded in the third round); the forms-later capacity-endpoint example (N = 10 vs 15; harvestable-G overstatement $428,603 = 21.2%, capped quadrature vs closed form); and the in-table vs sub-table 9.4 corner values ($0.415/$0.467/M vs $0.622/M). The third-round fixes were re-verified in `review_fixes3.py`: the hosted-open volume conversion (`Q0_open = kappa·Q0 = 6.9e10`; `G_open = $62,951`, Simpson rel 4.3e−15, equal to `kappa·$54,740` and to the ref-basis value at rel 2.3e−16; sized load 10.888 ⇒ N = 11, an N = 10 fleet failing the 4.1 check; `Toll_open = $2,211,446`; basis-invariant shortfall 35.1× in both bases), and the windowed `Gamma_1` (GS6 literal −1.1706e−5 → G = −$585,302 vs windowed +1.7597e−5 → G = +$879,852, Simpson rel 4.9e−15; growth `Q0_min = 1.6973e11 tok/yr`, integer-N screen pass at 3e11 / fail at 1e11). Scripts: `synth_verify.py`, `synth_verify2.py`, `synth_sawtooth.py`, `synth_engine.mjs`, `review_fixes.py`, `review_fixes2.py`, `review_fixes3.py` in `/tmp/claude-0/-home-user-token-yield/535ccb12-a57d-5b29-b0fa-867446c85da9/scratchpad/`.

---

## Review responses

**First panel (eight findings, merged to six fixes): all accepted; none rejected.** Duplicate filings were merged: the colo kWh-equivalence findings (two filings) are one fix, and the $0.62/M corner findings (three filings) are one fix. Every touched number was re-verified numerically in `review_fixes.py`:

1. **Colo capacity-fee equivalence** (Assumption 13, Section 9.1 — minor, two filings). $160–380/kW-month ÷ 730.5 h/month = $0.219–0.520/kWh-equivalent; both locations now quote **$0.22–0.52/kWh-equivalent** and anchor the previously quoted ≈$0.26 to its actual source (~$190/kW-month, bottom of the range).
2. **Section 9.4 corner failure** (minor, three filings). The $0.62/M figure required the unstated high `w = 1.4`: 1.4·1.6·0.15/(3600·600·0.25) = $0.622/M, verified; central `w = 1.3` gives $0.578/M. The corner now pins `w = 1.4 (high)` in its stated parameter list and also reports the $0.58/M central-w value (the qualitative conclusion holds under both). *(Superseded in part by second-panel finding 10, which additionally pins `s0 = 600` as out-of-table.)*
3. **Section 7.6 scale corollary** (major). The old "well above Q0_min — build early" claim is wrong at central parameters and has been replaced by the correct scale-free condition. Verified: central per-Q0 coefficient `c₁ = +4.2295e−7 > 0` (WAIT at every scale; integer-N FOC at 10×/100×/1000× Q0 = +$831K/+$3.12M/+$25.95M per yr with the m term, +$331K/+$2.62M/+$25.45M without — all WAIT either way). One sub-number of the panel's filing was itself corrected on recomputation: the lean-corner coefficient is **−1.80e−6** (= −3.4785e−6 + 1.6221e−6 + 5.51e−8), not the panel's −1.7e−6 — sign and conclusion unchanged; build-early re-emerges there only above ≈1.2e11 tok/yr (integer-N scan: first crossing 1.18e11, permanent above 1.23e11).
4. **Section 7.6 FOC missing m term** (major). Added `+m` under the now-explicit fixed-exit framing (with the salvage-invariance argument stated, and the alternative fixed-length framing's `+r·m·F(r,T)` = $263.8K/yr at central noted as ≈1.9× smaller). Richardson FD on the full deferral value including the ops leg reproduces the analytic FOC to rel 6.9e−12 at central (+$602,698/yr, WAIT — Step 8 rerun, verdict unchanged and stronger) and rel 3.0e−11 at the lean corner (+$111,475/yr WAIT vs −$88,525 without m — the timing flip the panel identified, now documented in Step 10).
5. **Sections 6.1/6.2 forms-later clamp** (major). Window is now `[min(t*, T), T]` with G = 0 on an empty window, mirroring the melting clamp; the robust rule `W = {t ∈ [0,T] : a(t) > 0}`, G = 0 if empty, is stated as the dashboard implementation. The panel's spurious-positive examples all reproduced exactly: +10,893 (GS6 rates, R0 = 0.5, T = 2, Q0 = 5e10; max a on [0,T] = −7.99e−7 < 0), +$12.74M (R0 = 0.2, T = 3, Q0 = 6e11), +$74.28M (R0 = 0.1, T = 3, Q0 = 6e11); true G = 0 in all three. A GS6b verification row was added to 6.3.
6. **s0 central-default marking** (minor). 2,000 is now the bolded central default in the 70B-dense row (it alone reproduces `epsilon0 = 4.69444e−8` and N = 11 as used by Sections 9.4 and 10; s0 = 2,200 would give 4.27e−8 and N = 10); the MoE row's 2,200 is un-bolded and labeled an alternative preset; the 9.4 validation label now reads "Central H200/70B-dense/colo slot"; Step 10's lean corner notes it borrows the MoE preset's 2,200.

**Second panel (four findings): all accepted; none rejected.** Every filed number reproduced exactly on recomputation; fixes verified in `review_fixes2.py`:

7. **Section 7.4 average-vs-marginal u_min** (major). The 0.726 "break-even duty cycle" loaded a 1/11 crew share (PV $159,889 — 77.6% of the $206,168 loaded slot cost) into a *marginal*-slot break-even, contradicting the spec's own fixed-`m` treatment (Sections 5.2/7.5, the very structure that creates `Q0_min`). Section 7.4 now states two thresholds with the decision each governs: the **marginal** `u_min = 0.162919` (slot power+capex PV $46,279.42 vs revenue $284,064.02 per unit duty; Simpson break-even rel 6.3e−16) as the per-workload include/shed rule, with fleet viability checked separately as Σ slot contributions ≥ `D + m·F(r,T)`; and the fully-loaded 0.725781 relabeled an average-cost viability metric, valid per-slot only if crew genuinely scales with slots. The panel's decision-flip example reproduced exactly: 11 slots @ u = 0.80 → fleet NPV **−$268,088**; adding six u = 0.45 slots (each contributing **+$81,549**) → **+$221,208** — the average-cost cutoff forfeits $489,296 and flips a viable BUILD to BUY. The old headline ("a peaky-SaaS slot cannot pay for itself") was an average-cost reading and is corrected to the fleet-level statement: the u = 0.45 slot pays its marginal way 2.76×; the fleet fails on the fixed crew+dev toll. Limitation 6 rewritten accordingly. (The panel located "u_min = 0.726 citations in 9.4/10"; on inspection the only propagated citation was Limitation 6 — no 9.4/10 text carried the figure — so no further edits were needed there.)
8. **Step 7 / 9.3 hosted-open basis mixing** (minor). Step 7 previously divided an open-token-basis `G_open` ($54,740, kappa = 1 on the variable legs) by the ref-token-basis toll ($2,711,446, N sized with kappa = 1.15, full D) — printing 49.5× ("50×") from incompatible halves. The round-2 fix unified each run onto a single basis: kappa = 1 on every leg including fleet sizing (N = 10, H = $460,000), D reduced to its infra-only portion, giving `Toll_open = $2,170,295` and shortfall **39.6×**, with a ref-token cross-check (kappa on both hosted-open legs vs the full-D toll $2,711,446 = **43.1×**); all three round-2 ratios verified as computed (39.647 / 43.072 / 49.533). *(Superseded by third-panel finding 11: the round-2 recipe itself still dropped the `kappa` volume conversion — its "kappa = 1 on every leg" kept the numeral 6e10 as the open-token volume — and its ref-basis check re-inserted the full `D` the same paragraph argued cancels, which is why 39.6× ≠ 43.1×. The corrected, basis-invariant figures are `Q0_open = 6.9e10`, N = 11, `Toll_open = $2,211,446`, shortfall **35.1×** in both bases.)*
9. **Sections 6.2/5.2 capacity-check endpoint** (minor). "Check t = tau if g > mu" identified the binding point only for the melting window `[0, tau]`; in the forms-later case `tau = min(T, t*)` is the window *start* and the load binds at `T`. Restated as the window-endpoint rule (check `t2` if g > mu, else `t1`; t = 0 remains conservative), mirrored in 5.2's growth version (`eta` now carries `e^(max(g−mu,0)·t2)`, with the forms-later fleet sized for demand at `T`). The panel's quantified example reproduced exactly: GS6 rates with g = 0.60 > mu — load ratio 9.603 at `t_form = 2.310491` vs 14.375 at T (N = 10 passes the old check, window end needs N = 15); with N = 10, overflow spans [2.581, 5] and the closed-form G ($2,021,378.40, Simpson rel 8.5e−15) overstates the capped-harvest quadrature ($1,592,775.04) by **$428,603 (21.2%)**. Section 10 Step 6's `eta` is unaffected (melting case, t2 = tau = T there).
10. **Section 9.4 corner s0 = 600 labeling** (minor). `s0 = 600` sits below both table lows (900 dense, 800 MoE) and was the only unlabeled corner factor. Recomputation confirms the panel's claim: no corner inside the documented ranges reproduces the electricity-alone failure — the worst in-table corner gives $0.467/M (s0 = 800) and $0.415/M (s0 = 900), both below the $0.55/M hosted-open central. The validation now states the in-table truth (electricity alone never exceeds hosted-open central within the documented box; worst corner = 85% of it) and pins s0 = 600 explicitly as "below both table lows — a degraded/SLO-throttled deployment", with a note that a dashboard whose sliders follow 9.2 cannot reach the failing corner. The printed arithmetic ($0.622/M; $0.578/M at central w) was already correct and is unchanged.

**Third panel (three findings, merged to two fixes): all accepted; none rejected.** The two hosted-open filings are duplicates of one defect (the dropped `kappa` volume conversion) and are handled as one fix. Every filed number reproduced exactly on recomputation; fixes verified in `review_fixes3.py`:

11. **Sections 9.3 / 10 Step 7 hosted-open volume conversion** (minor, two filings). The round-2 open-token recipe set `kappa = 1` on every leg but kept the numeral `Q0 = 6e10` as the open-token volume — yet `Q0` is *defined* in reference-quality tokens, and the workload requires `kappa·Q0 = 6.9e10` open tokens/yr on both the hosted-open BUY path and the BUILD path, regardless of denomination. Verified consequences, all reproduced: (i) `G_open` was understated by exactly `kappa` ($54,740 vs the correct $62,951 = kappa·54,740 — the very number the spec's own ref-basis check produced); (ii) the open-basis fleet was sized N = 10 for the physically identical build the frontier run sizes at N = 11 — the true open-token load at `T` is 10.888, so the N = 10 fleet violates the Section-4.1 capacity constraint for the very workload the glacier counts as harvested; (iii) the two printed "consistent" ratios, 39.6× and 43.1×, differed from each other and from the basis-invariant value — `Toll/G` is dimensionless, so a genuine change of denomination cannot move it; (iv) the ref-basis "equivalent check" re-inserted the full `D = $500K` into the toll, contradicting the same paragraph's argument that integration/eval `D` is common to both paths and cancels. The corrected recipe — `Q0_open = kappa·Q0`, then `kappa = 1` in every formula; equivalently the ref basis with price `kappa·p0_open` and cost `kappa·epsilon0` (`kappa` cancels in `R0`, so `t* = 4.55732` is unchanged) against the same infra-only toll — gives the unique basis-invariant shortfall `$2,211,446 / $62,951 = 35.1×`, identical in both bases (rel 2.3e−16). The BUY verdict at central parameters is unchanged (decisive at ~35×), and the error vanishes as `kappa → 1` — the regime where Limitation 4 says this screen becomes binding — but the recipe as previously written understated the open-basis `G` by `kappa` (15% at central, 50% at the in-table `kappa = 1.5`) and undersized the fleet, a net pro-BUY bias on `Toll/G` (39.6 > 35.1) that could flip a near-threshold hosted-open screen. Fixed in 9.3's recipe, Step 7 (republished: `G_open = $62,951`, N = 11, `H = $506,000`, `Toll_open = $2,211,446`, 35.1×), Limitation 4, the Verification summary, and item 8 above; the 39.6× and 43.1× figures are retired.
12. **Sections 1.2 / 5.2 / 7.5 `Gamma_1` forms-later window** (minor). The 1.2 identity `G = Q0·Gamma_1` with the single-endpoint kernel `Gamma_1 = p0·F(alpha,tau) − kappa·epsilon0·F(beta_Q,tau)`, `tau = min(T, t*)`, is wrong in the forms-later case (`Delta < 0, R0 < 1`), where `tau` is the harvest window's *start*: the literal formula integrates the negative-margin interval `[0, t*]` instead of `[t*, T]`. Verified on the spec's own GS6 case (T = 5): literal `Gamma_1 = −1.1706e−5` $·yr/tok (G = −$585,302 at Q0 = 5e10 — precisely 6.3's "over [0,t*]" control row) vs the true windowed value +1.7597e−5 (G = +$879,852, the 6.3 table value; Simpson rel 4.9e−15). Section 5.2's growth `Q0_min` inherited the defect — its round-2 `t2 = T` clause fixed `eta` but left `Gamma_1` on the single-endpoint kernel, so the formula's two halves used inconsistent windows: with ordinary toll parameters (`h = 30K, delta = 0.30, D = 500K, m = 500K`) the literal screen returns `Gamma_1 − eta_net = −1.53e−5 ≤ 0` → a categorically wrong "never build at any scale", while the true threshold is finite — `Q0_min = 1.70e11 tok/yr ≈ 14B tok/month`, confirmed by the integer-N `G ≥ Toll` screen passing at `Q0 = 3e11` (G $5.28M vs Toll $3.35M window-sized / $3.46M at conservative t = 0 sizing) and failing at `1e11` (G $1.76M vs Toll $2.72M). Fixed by generalizing `Gamma_1` to the two-endpoint window form of 6.2 in the 1.2 table (with the melting-case reduction stated and the forms-later prohibition on the single-endpoint form made explicit), and by having 5.2's growth `Q0_min` and 7.5 reference the windowed `Gamma_1` — 5.2's `t2` note now applies to `Gamma_1` and `eta` consistently. The binding NPV/engine tests and 6.2's general `G` were never affected.

---

## Appendix: unapplied round-4 review findings (verbatim, unadjudicated by the loop)

The round-4 fixer was cut off by a spend limit. Three lenses returned findings that
are therefore NOT folded into the text above. Summarized:

1. **[minor, §7.6]** The envelope-theorem parenthetical is incomplete: `a(t*) = 0`
   kills only the harvest-integral's endpoint shift; under a melt-tracking exit the
   MLOps leg contributes a first-order term `−m·e^(−r·t*)·(q/Δ)` the envelope does
   not kill. (Numerically confirmed by the reviewer: fixed-exit FOC +610,174/yr vs
   melt-tracking-exit FD +537,523/yr at central parameters, T=10.)
2. **[major, §7.6 + §10 Steps 8/10]** The deferral value holds H fixed while its own
   sizing rule makes N ∝ κ(τ_b); deferring shrinks capex and salvage, adding
   `+q·H·(1−e^(−(r+δ)·τ_end))` to the FOC; the salvage-invariance claim holds only
   at q = 0. The wait-vs-build FOC as printed overstates the value of building now
   when the open-model gap is closing.
3. **[minor, §10 Step 7]** The hosted-open toll should size the fleet at the harvest
   window's end (N = 10, shortfall 34.5×), not the full horizon (N = 11, 35.1×), by
   the spec's own §5.2/§6.2 window rule.
4. **[minor, §8.3]** The reference engine's `meltMonth` diagnostic mislabels the
   forms-later corner (reports 0 instead of null + a formation month). The dashboard
   engine in this repository does not share this defect.

Treat §7.6's quantitative FOC as directional pending these corrections; the core
decision rule (Gates 1–2, §§3–6, §8) passed all lenses that examined it in round 4.
