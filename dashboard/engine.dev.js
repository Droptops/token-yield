/* ============================================================
   GLACIER ENGINE — build-vs-buy economics for LLM inference
   Pure functions, no DOM. Runs in browser and Node unchanged.

   Conventions (must match docs/glacier-math.md):
   - time t in YEARS; month index i has t_i = i/12 (month-start)
   - month-start prices x month token volume, discounted at e^(-r*t_i)
   - token volumes in Mtok (millions of reference-quality tokens)
   - prices in $/Mtok; power kW; electricity $/kWh
   - "open" tokens = reference tokens x kappa (quality multiplier)
   - idle power is paid: owned fleet draws N*w*PUE kW every hour
   - overflow above capacity is bought at the comparator price
   - fleetMode 'staged': tranches bought when demand arrives; each
     tranche salvages at h*e^(-delta*(T - t_buy))
   - fleetMode 'upfront': N fixed at t=0, sized to horizon peak at
     t=0 capability (the closed-form / test-vector convention)
   - salvage credited at the final month, discounted at e^(-r*T)
   ============================================================ */
'use strict';

const GLACIER = (() => {
  const SECONDS_PER_YEAR = 31557600;   // 365.25 * 86400
  const HOURS_PER_YEAR   = 8766;       // 365.25 * 24

  // Same-model public serverless quotes captured 2026-09-01. Keeping the
  // rate card in the engine makes the provider curve reproducible rather
  // than hiding a pre-blended sticker price in a default.
  const PROVIDER_RATE_CARD = Object.freeze([
    Object.freeze({ key: 'fireworks', name: 'Fireworks AI', model: 'DeepSeek V4 Pro 0813', input: 1.32, cachedInput: 0.044, output: 3.96, weight: 1 / 3 }),
    Object.freeze({ key: 'baseten', name: 'Baseten', model: 'DeepSeek V4 Pro 0813', input: 1.32, cachedInput: 0.132, output: 3.96, weight: 1 / 3 }),
    Object.freeze({ key: 'deepinfra', name: 'DeepInfra', model: 'DeepSeek V4 Pro 0813', input: 1.30, cachedInput: 0.10, output: 2.60, weight: 1 / 3 }),
  ]);
  const PROVIDER_RATE_CARD_AS_OF = '2026-09-01';

  const clamp01 = x => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));

  // theta = output share of all billed tokens; chi = cached share of input.
  // b_j = (1-d)[(1-theta)((1-chi)I_j + chi C_j) + theta O_j]
  function providerBasket(P) {
    const theta = clamp01(P.providerOutputShare == null ? 0.25 : P.providerOutputShare);
    const chi = clamp01(P.providerCacheHit == null ? 0.25 : P.providerCacheHit);
    const discount = clamp01(P.providerDiscount == null ? 0 : P.providerDiscount);
    const providers = PROVIDER_RATE_CARD.map(row => {
      const effectiveInput = (1 - chi) * row.input + chi * row.cachedInput;
      const blended = (1 - discount) * ((1 - theta) * effectiveInput + theta * row.output);
      return { ...row, effectiveInput, blended };
    });
    const weightTotal = providers.reduce((s, row) => s + row.weight, 0);
    const blended = providers.reduce((s, row) => s + row.weight * row.blended, 0) / weightTotal;
    return {
      asOf: PROVIDER_RATE_CARD_AS_OF,
      model: PROVIDER_RATE_CARD[0].model,
      outputShare: theta,
      cacheHit: chi,
      discount,
      providers,
      blended,
      low: Math.min(...providers.map(row => row.blended)),
      high: Math.max(...providers.map(row => row.blended)),
    };
  }

  function providerPriceAt(P, t) {
    return providerBasket(P).blended * Math.exp(-P.lambdaProvider * t);
  }

  function comparatorMeltRate(P) {
    if (P.comparator === 'hostedOpen') return P.lambdaOpen;
    if (P.comparator === 'inferenceCloud') return P.lambdaProvider;
    return P.lambda;
  }

  // Default parameters: "scaleup" archetype; knowledge-based Aug-2026 values,
  // sources and low/central/high ranges in docs/glacier-math.md §9.
  const DEFAULTS = {
    Tyears: 3,        // decision horizon (yr)
    r: 0.12,          // continuous discount rate (/yr)
    Q0m: 5000,        // reference demand at t=0 (Mtok/month)
    sigma: 1.0,       // movable share of the workload (open models can handle it)
    g: 0.40,          // demand growth (/yr, continuous)
    p0: 4.25,         // frontier workhorse-tier blended price ($/Mtok reference)
    lambda: 0.462,    // frontier list-price decline (/yr) = 18-month halving
    pOpen0: 0.30,     // hosted open-weight commodity tier ($/Mtok OPEN tokens)
    lambdaOpen: 0.462,// hosted open-weight price decline (/yr)
    lambdaProvider: 0.462, // managed inference basket price decline (/yr)
    providerOutputShare: 0.25, // output / (input + output) billed tokens
    providerCacheHit: 0.25,    // cached fraction of input tokens
    providerDiscount: 0.00,    // negotiated discount to public rate cards
    kappa: 1.15,      // open-model quality multiplier (open tokens per reference token)
    comparator: 'frontier',  // 'frontier' | 'hostedOpen' | 'inferenceCloud'
    fleetMode: 'staged',     // 'staged' | 'upfront' | 'manual'
    N: 8,             // GPU count when fleetMode='manual'
    h: 45000,         // all-in $ per GPU slot (server share + fabric + integration)
    s0: 1000,         // effective output tok/s per GPU at t=0 (chat-SLO, 2026 stack)
    mu: 0.25,         // serving+model efficiency gain on owned hardware (/yr)
    u: 0.50,          // utilization (busy fraction of powered time)
    wKw: 1.3,         // server kW per GPU slot (powered whenever on)
    pue: 1.3,         // power usage effectiveness
    e0: 0.11,         // electricity price ($/kWh)
    gamma: 0.06,      // electricity escalation (/yr)
    D: 250000,        // one-time dev/integration cost ($)
    mYr: 450000,      // ongoing MLOps + maintenance ($/yr, ~1 loaded FTE)
    delta: 0.30,      // hardware value decay (/yr; 0.45 = stress branch)
    vRef: 20,         // value realized per reference Mtok ($/Mtok), Token Yield view
  };

  // ---- core simulation -------------------------------------------------
  function simulate(P) {
    const M = Math.max(1, Math.round(P.Tyears * 12));
    const secPerMonth = SECONDS_PER_YEAR / 12;
    const hrsPerMonth = HOURS_PER_YEAR / 12;   // 730.5
    const tAt = i => i / 12;

    // demand & prices per month; only the movable share is in play —
    // tokens open models can't handle are bought on both paths and cancel
    const Qbase = P.Q0m * (P.sigma == null ? 1 : P.sigma);
    const provider = providerBasket(P);
    const q = [], pF = [], pO = [], pProvider = [], pProviderLow = [], pProviderHigh = [], eKwh = [], disc = [];
    for (let i = 0; i < M; i++) {
      const t = tAt(i);
      q.push(Qbase * Math.exp(P.g * t));                 // movable reference Mtok
      pF.push(P.p0 * Math.exp(-P.lambda * t));           // $/Mtok reference
      pO.push(P.pOpen0 * Math.exp(-P.lambdaOpen * t));   // $/Mtok OPEN
      pProvider.push(provider.blended * Math.exp(-P.lambdaProvider * t)); // $/Mtok OPEN
      pProviderLow.push(provider.low * Math.exp(-P.lambdaProvider * t));
      pProviderHigh.push(provider.high * Math.exp(-P.lambdaProvider * t));
      eKwh.push(P.e0 * Math.exp(P.gamma * t));           // $/kWh
      disc.push(Math.exp(-P.r * t));
    }
    // Comparator price per REFERENCE Mtok. Both open-model buy paths need
    // kappa open tokens for one reference-token-equivalent outcome.
    const comp = q.map((_, i) => {
      if (P.comparator === 'hostedOpen') return pO[i] * P.kappa;
      if (P.comparator === 'inferenceCloud') return pProvider[i] * P.kappa;
      return pF[i];
    });

    const capPerGpuAt = t => P.s0 * Math.exp(P.mu * t) * P.u * secPerMonth / 1e6; // Mtok open/GPU/mo

    // fleet plan: N per month + capex outlays
    const Nseq = new Array(M).fill(0);
    const capexAt = new Array(M).fill(0);        // $ spent on GPUs in month i
    const tranches = [];                          // {n, t} for salvage
    if (P.fleetMode === 'manual') {
      const N0 = Math.max(1, Math.round(P.N));
      Nseq.fill(N0); capexAt[0] = N0 * P.h; tranches.push({ n: N0, t: 0 });
    } else if (P.fleetMode === 'upfront') {
      const qOpenPeak = Math.max(...q) * P.kappa;
      const N0 = Math.max(1, Math.ceil(qOpenPeak / capPerGpuAt(0)));
      Nseq.fill(N0); capexAt[0] = N0 * P.h; tranches.push({ n: N0, t: 0 });
    } else { // staged: buy when demand arrives, at current capability
      let Ncur = 0;
      for (let i = 0; i < M; i++) {
        const t = tAt(i);
        const need = Math.ceil(q[i] * P.kappa / capPerGpuAt(t));
        if (need > Ncur) {
          const add = need - Ncur;
          capexAt[i] += add * P.h;
          tranches.push({ n: add, t });
          Ncur = need;
        }
        Nseq[i] = Math.max(1, Ncur);
      }
      if (tranches.length === 0) { tranches.push({ n: 1, t: 0 }); capexAt[0] = P.h; Nseq.fill(1); }
    }

    // salvage: each tranche decays from its purchase date to T
    const salvage = tranches.reduce((s, tr) => s + tr.n * P.h * Math.exp(-P.delta * (P.Tyears - tr.t)), 0);
    const salvagePV = salvage * Math.exp(-P.r * P.Tyears);
    const capexPV = capexAt.reduce((s, c, i) => s + c * disc[i], 0);
    const Hnominal = tranches.reduce((s, tr) => s + tr.n * P.h, 0);

    // monthly flows
    const rows = [];
    let cumBuy = 0, cumBuild = P.D;
    let npvBuy = 0, npvBuildOps = 0, mlopsPV = 0;
    let breakEvenMonth = null;
    for (let i = 0; i < M; i++) {
      const t = tAt(i);
      const N = Nseq[i];
      const capOpen = N * capPerGpuAt(t);                            // Mtok open
      const qOpen = q[i] * P.kappa;
      const selfServed = Math.min(qOpen, capOpen);
      const overflowRef = Math.max(0, qOpen - capOpen) / P.kappa;    // reference Mtok
      const buyCost = comp[i] * q[i];
      const elec = N * P.wKw * P.pue * hrsPerMonth * eKwh[i];
      const mlops = P.mYr / 12;
      const overflowCost = comp[i] * overflowRef;
      const buildOps = elec + mlops + overflowCost;

      npvBuy += disc[i] * buyCost;
      npvBuildOps += disc[i] * buildOps;
      mlopsPV += disc[i] * mlops;
      cumBuy += disc[i] * buyCost;
      cumBuild += disc[i] * (buildOps + capexAt[i]);
      let cumBuildShown = cumBuild;
      if (i === M - 1) cumBuildShown -= salvagePV;  // salvage credited at end
      if (breakEvenMonth === null && cumBuy >= cumBuildShown) breakEvenMonth = i;

      rows.push({
        i, t, q: q[i], pF: pF[i], pO: pO[i],
        pProvider: pProvider[i], pProviderLow: pProviderLow[i], pProviderHigh: pProviderHigh[i],
        comp: comp[i], N,
        capOpen, selfServed, overflowRef,
        buyCost, elec, mlops, overflowCost, buildOps, capex: capexAt[i],
        eKwh: eKwh[i],
        cumBuy, cumBuild: cumBuildShown,
      });
    }
    const npvBuild = P.D + capexPV + npvBuildOps - salvagePV;
    const npvAdvantage = npvBuy - npvBuild;   // >0 => BUILD wins vs comparator

    // per-Mtok views (reference basis); amortized view is intuition-only
    const amortMonthly = (P.D + capexPV - salvagePV) / M;
    for (const rw of rows) {
      rw.buildVarElec = rw.elec / rw.q;                        // electricity $/ref Mtok (fleet basis, incl idle)
      rw.buildAllIn = (rw.buildOps + amortMonthly) / rw.q;     // $/ref Mtok, amortized view
      rw.yieldBuy = P.vRef / rw.comp;
      rw.yieldBuild = P.vRef / rw.buildAllIn;
    }

    return { P: { ...P }, provider, M, Nfinal: Nseq[M - 1], Hnominal, capexPV, salvage, salvagePV, mlopsPV,
             rows, npvBuy, npvBuild, npvAdvantage, breakEvenMonth, amortMonthly };
  }

  // ---- glacier analytics ----------------------------------------------
  // epsilon0: electricity $ per OPEN Mtok at t=0 (marginal per-token basis)
  function epsilon0(P) {
    return P.wKw * P.pue * P.e0 / (3600 * P.s0 * P.u) * 1e6;
  }

  // Per-reference-token glacier margin a(t) = c(t) - kappa*eps(t).
  // mode: 'melts' | 'never' | 'alreadyMelted' | 'opens'
  function meltTime(P) {
    const eps0 = epsilon0(P);
    const c0 = P.comparator === 'hostedOpen'
      ? P.pOpen0 * P.kappa
      : P.comparator === 'inferenceCloud'
        ? providerBasket(P).blended * P.kappa
        : P.p0;
    const lam = comparatorMeltRate(P);
    const k = lam + P.gamma - P.mu;          // net melt rate (/yr)
    const ratio = c0 / (P.kappa * eps0);
    if (!(ratio > 0)) return { tStar: 0, mode: 'alreadyMelted' };
    if (ratio <= 1) {
      if (k < 0) return { tStar: Math.log(ratio) / k, mode: 'opens' };
      return { tStar: 0, mode: 'alreadyMelted' };
    }
    if (k <= 0) return { tStar: Infinity, mode: 'never' };
    return { tStar: Math.log(ratio) / k, mode: 'melts' };
  }

  // Discounted glacier value: positive-margin months only (numeric; closed form in docs)
  function glacierValue(P, sim) {
    const eps0 = epsilon0(P);
    let G = 0;
    for (const rw of sim.rows) {
      const eps = eps0 * Math.exp((P.gamma - P.mu) * rw.t);
      const a = rw.comp - P.kappa * eps;      // $/ref Mtok
      // Overflow is bought on both paths and produces no glacier margin.
      const selfServedRef = Math.min(rw.q, rw.selfServed / P.kappa);
      if (a > 0) G += Math.exp(-P.r * rw.t) * a * selfServedRef;
    }
    return G;
  }

  // Minimum viable scale: find the FIRST feasible crossing. Integer GPU ceilings
  // make NPV a sawtooth, so a global bisection is invalid and can return a later
  // crossing. Between fleet breakpoints NPV is linear/increasing in Q0; inspect
  // the left side of every breakpoint, then bisect only inside that fixed-fleet band.
  function minViableScale(P) {
    const adv = Q0m => simulate({ ...P, Q0m }).npvAdvantage;
    const loBound = 1, hiBound = 1e8;
    if (adv(loBound) > 0) return 0;

    const M = Math.max(1, Math.round(P.Tyears * 12));
    const secPerMonth = SECONDS_PER_YEAR / 12;
    const sigma = P.sigma == null ? 1 : P.sigma;
    const capPerGpuAt = t => P.s0 * Math.exp(P.mu * t) * P.u * secPerMonth / 1e6;

    // A fractional fleet is a cost lower bound on an integer fleet when rates,
    // costs, discounting, and depreciation are nonnegative. Its NPV advantage is
    // therefore an upper bound on the attainable integer-fleet advantage. Use it
    // to skip regions that provably cannot contain the first crossing and to prove
    // no scale can work when even perfectly divisible hardware has nonpositive slope.
    function relaxedStart() {
      if (P.fleetMode === 'manual') return loBound;
      const lam = comparatorMeltRate(P);
      const c0 = P.comparator === 'hostedOpen'
        ? P.pOpen0 * P.kappa
        : P.comparator === 'inferenceCloud'
          ? providerBasket(P).blended * P.kappa
          : P.p0;
      const valid = [P.Tyears, P.r, P.g, lam, c0, P.kappa, P.s0, P.u, P.mu,
        P.h, P.wKw, P.pue, P.e0, P.gamma, P.D, P.mYr, P.delta, sigma]
        .every(Number.isFinite)
        && P.Tyears >= 0 && P.r >= 0 && c0 >= 0 && P.kappa > 0
        && P.s0 > 0 && P.u > 0 && P.h >= 0 && P.wKw >= 0
        && P.pue >= 0 && P.e0 >= 0 && P.D >= 0 && P.mYr >= 0
        && P.delta >= 0 && sigma >= 0;
      if (!valid) return loBound;

      const hrsPerMonth = HOURS_PER_YEAR / 12;
      const qFactor = [], discount = [], powerPerGpu = [];
      let buyPVPerQ = 0, fixedPV = P.D;
      for (let i = 0; i < M; i++) {
        const t = i / 12;
        const qf = sigma * Math.exp(P.g * t);
        const di = Math.exp(-P.r * t);
        qFactor.push(qf); discount.push(di);
        powerPerGpu.push(P.wKw * P.pue * hrsPerMonth * P.e0 * Math.exp(P.gamma * t));
        buyPVPerQ += di * c0 * Math.exp(-lam * t) * qf;
        fixedPV += di * P.mYr / 12;
      }

      let capexPVPerQ = 0, salvagePVPerQ = 0, elecPVPerQ = 0;
      if (P.fleetMode === 'upfront') {
        const nPerQ = P.kappa * Math.max(...qFactor) / capPerGpuAt(0);
        capexPVPerQ = nPerQ * P.h;
        salvagePVPerQ = nPerQ * P.h * Math.exp(-P.delta * P.Tyears) * Math.exp(-P.r * P.Tyears);
        for (let i = 0; i < M; i++) elecPVPerQ += discount[i] * nPerQ * powerPerGpu[i];
      } else {
        let nCur = 0;
        for (let i = 0; i < M; i++) {
          const t = i / 12;
          const need = P.kappa * qFactor[i] / capPerGpuAt(t);
          if (need > nCur) {
            const add = need - nCur;
            capexPVPerQ += discount[i] * add * P.h;
            salvagePVPerQ += add * P.h * Math.exp(-P.delta * (P.Tyears - t)) * Math.exp(-P.r * P.Tyears);
            nCur = need;
          }
          elecPVPerQ += discount[i] * nCur * powerPerGpu[i];
        }
      }

      const slope = buyPVPerQ - capexPVPerQ - elecPVPerQ + salvagePVPerQ;
      if (!(slope > 0)) return Infinity;
      // Start infinitesimally below the relaxed crossing so the discrete search
      // retains the boundary that could coincide with it despite float rounding.
      return Math.max(loBound, fixedPV / slope * (1 - 1e-10));
    }

    function nextBreakpoint(q0) {
      if (P.fleetMode === 'manual' || sigma <= 0) return Infinity;
      let next = Infinity;
      if (P.fleetMode === 'upfront') {
        let peakFactor = 0;
        for (let i = 0; i < M; i++) peakFactor = Math.max(peakFactor, Math.exp(P.g * i / 12));
        const a = sigma * P.kappa * peakFactor / capPerGpuAt(0);
        if (!(a > 0)) return Infinity;
        let n = Math.ceil(q0 * a);
        let boundary = n / a;
        if (boundary <= q0 * (1 + 1e-12)) boundary = (n + 1) / a;
        return boundary;
      }
      // Staged mode: every monthly ceil() is a potential tranche boundary.
      // Some are redundant after the running max, but including them is safe.
      for (let i = 0; i < M; i++) {
        const t = i / 12;
        const a = sigma * P.kappa * Math.exp(P.g * t) / capPerGpuAt(t);
        if (!(a > 0)) continue;
        let n = Math.ceil(q0 * a);
        let boundary = n / a;
        if (boundary <= q0 * (1 + 1e-12)) boundary = (n + 1) / a;
        if (boundary < next) next = boundary;
      }
      return next;
    }

    let q = relaxedStart();
    if (!isFinite(q) || q > hiBound) return Infinity;
    for (let bands = 0; q < hiBound && bands < 250000; bands++) {
      const bp = Math.min(hiBound, nextBreakpoint(q));
      // Stay on the pre-jump fleet. At an exact mathematical boundary ceil(n)=n;
      // the tiny inward offset avoids floating multiplication landing just above n.
      const right = isFinite(bp) && bp < hiBound ? Math.max(q, bp * (1 - 1e-11)) : hiBound;
      if (adv(right) >= 0) {
        let lo = q, hi = right;
        for (let it = 0; it < 70; it++) {
          const mid = (lo + hi) / 2;
          if (adv(mid) >= 0) hi = mid; else lo = mid;
        }
        return hi;
      }
      if (!isFinite(bp) || bp >= hiBound) break;
      q = bp * (1 + 1e-11); // post-jump side of the next fleet band
      if (adv(q) >= 0) return q;
    }

    // Pathological very-high-scale fallback after the breakpoint budget. It is
    // deliberately labeled approximate by the UI's two-significant-figure display.
    let prevQ = q, prevA = adv(prevQ);
    const ratio = Math.pow(hiBound / Math.max(prevQ, 1), 1 / 8192);
    for (let i = 0; i < 8192 && prevQ < hiBound; i++) {
      const nextQ = Math.min(hiBound, prevQ * ratio);
      const nextA = adv(nextQ);
      if (prevA < 0 && nextA >= 0) {
        let lo = prevQ, hi = nextQ;
        for (let it = 0; it < 70; it++) {
          const mid = (lo + hi) / 2;
          if (adv(mid) >= 0) hi = mid; else lo = mid;
        }
        return hi;
      }
      prevQ = nextQ; prevA = nextA;
    }
    return Infinity;
  }

  // Max dev cost that still breaks even (D enters the NPV additively)
  function maxDevCost(P, sim) { return P.D + sim.npvAdvantage; }

  // Electricity share of discounted build cost
  function elecShare(P, sim) {
    let elecPV = 0;
    for (const rw of sim.rows) elecPV += Math.exp(-P.r * rw.t) * rw.elec;
    return elecPV / sim.npvBuild;
  }

  // Tornado: +/-30% one-at-a-time; NPV-advantage deltas
  function tornado(P, base) {
    const priceKeys = P.comparator === 'inferenceCloud'
      ? [
          ['lambdaProvider', 'Provider price melt rate λᵖ'],
          ['providerOutputShare', 'Provider output share θ'],
          ['providerCacheHit', 'Provider input cache-hit χ'],
        ]
      : P.comparator === 'hostedOpen'
        ? [['lambdaOpen', 'Hosted-open melt rate λᵒ']]
        : [['lambda', 'Frontier price melt rate λ']];
    const KEYS = [
      ...priceKeys,
      ['e0', 'Electricity price e₀'],
      ['gamma', 'Electricity escalation γ'],
      ['sigma', 'Movable workload share σ'],
      ['u', 'Utilization u'],
      ['s0', 'GPU throughput s₀'],
      ['kappa', 'Quality gap κ'],
      ['D', 'Dev cost D'],
      ['h', 'GPU price h'],
      ['mYr', 'MLOps cost m'],
    ];
    return KEYS.map(([key, label]) => {
      const bounded = key === 'providerOutputShare' || key === 'providerCacheHit' || key === 'sigma';
      const upValue = bounded ? clamp01(P[key] * 1.3) : P[key] * 1.3;
      const dnValue = bounded ? clamp01(P[key] * 0.7) : P[key] * 0.7;
      const up = simulate({ ...P, [key]: upValue }).npvAdvantage - base.npvAdvantage;
      const dn = simulate({ ...P, [key]: dnValue }).npvAdvantage - base.npvAdvantage;
      return { key, label, up, dn };
    });
  }

  return { DEFAULTS, PROVIDER_RATE_CARD, PROVIDER_RATE_CARD_AS_OF,
           providerBasket, providerPriceAt, comparatorMeltRate,
           simulate, epsilon0, meltTime, glacierValue,
           minViableScale, maxDevCost, elecShare, tornado,
           SECONDS_PER_YEAR, HOURS_PER_YEAR };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = GLACIER;
