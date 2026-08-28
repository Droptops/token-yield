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

  // Default parameters: "scaleup" archetype; knowledge-based Aug-2026 values,
  // sources and low/central/high ranges in docs/glacier-math.md §9.
  const DEFAULTS = {
    Tyears: 3,        // decision horizon (yr)
    r: 0.12,          // continuous discount rate (/yr)
    Q0m: 5000,        // reference demand at t=0 (Mtok/month)
    g: 0.40,          // demand growth (/yr, continuous)
    p0: 5.0,          // frontier API blended price ($/Mtok reference)
    lambda: 0.693,    // frontier price decline (/yr) = 12-month halving
    pOpen0: 0.50,     // hosted open-weight price ($/Mtok OPEN tokens)
    lambdaOpen: 0.693,// hosted open-weight price decline (/yr)
    kappa: 1.15,      // open-model quality multiplier (open tokens per reference token)
    comparator: 'frontier',  // 'frontier' | 'hostedOpen'
    fleetMode: 'staged',     // 'staged' | 'upfront' | 'manual'
    N: 8,             // GPU count when fleetMode='manual'
    h: 32000,         // all-in $ per GPU slot (card + server share + install)
    s0: 600,          // effective output tok/s per GPU at t=0
    mu: 0.25,         // serving+model efficiency gain on owned hardware (/yr)
    u: 0.50,          // utilization (busy fraction of powered time)
    wKw: 1.3,         // server kW per GPU slot (powered whenever on)
    pue: 1.3,         // power usage effectiveness
    e0: 0.11,         // electricity price ($/kWh)
    gamma: 0.06,      // electricity escalation (/yr)
    D: 250000,        // one-time dev/integration cost ($)
    mYr: 240000,      // ongoing MLOps + maintenance ($/yr)
    delta: 0.45,      // hardware value decay (/yr)
    vRef: 20,         // value realized per reference Mtok ($/Mtok), Token Yield view
  };

  // ---- core simulation -------------------------------------------------
  function simulate(P) {
    const M = Math.max(1, Math.round(P.Tyears * 12));
    const secPerMonth = SECONDS_PER_YEAR / 12;
    const hrsPerMonth = HOURS_PER_YEAR / 12;   // 730.5
    const tAt = i => i / 12;

    // demand & prices per month
    const q = [], pF = [], pO = [], eKwh = [], disc = [];
    for (let i = 0; i < M; i++) {
      const t = tAt(i);
      q.push(P.Q0m * Math.exp(P.g * t));                 // reference Mtok
      pF.push(P.p0 * Math.exp(-P.lambda * t));           // $/Mtok reference
      pO.push(P.pOpen0 * Math.exp(-P.lambdaOpen * t));   // $/Mtok OPEN
      eKwh.push(P.e0 * Math.exp(P.gamma * t));           // $/kWh
      disc.push(Math.exp(-P.r * t));
    }
    // comparator price per REFERENCE Mtok (hosted-open serves kappa x tokens)
    const comp = q.map((_, i) => P.comparator === 'hostedOpen' ? pO[i] * P.kappa : pF[i]);

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
    let npvBuy = 0, npvBuildOps = 0;
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
      cumBuy += disc[i] * buyCost;
      cumBuild += disc[i] * (buildOps + capexAt[i]);
      let cumBuildShown = cumBuild;
      if (i === M - 1) cumBuildShown -= salvagePV;  // salvage credited at end
      if (breakEvenMonth === null && cumBuy >= cumBuildShown) breakEvenMonth = i;

      rows.push({
        i, t, q: q[i], pF: pF[i], pO: pO[i], comp: comp[i], N,
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

    return { P: { ...P }, M, Nfinal: Nseq[M - 1], Hnominal, capexPV, salvage, salvagePV,
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
    const c0 = P.comparator === 'hostedOpen' ? P.pOpen0 * P.kappa : P.p0;
    const lam = P.comparator === 'hostedOpen' ? P.lambdaOpen : P.lambda;
    const k = lam + P.gamma - P.mu;          // net melt rate (/yr)
    const ratio = c0 / (P.kappa * eps0);
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
      if (a > 0) G += Math.exp(-P.r * rw.t) * a * rw.q;
    }
    return G;
  }

  // Minimum viable scale: log-bisect Q0m to zero NPV advantage (integer fleets
  // make this a step function; result reported ~2 sig figs)
  function minViableScale(P) {
    const adv = Q0m => simulate({ ...P, Q0m }).npvAdvantage;
    let lo = 1, hi = 1e8;
    if (adv(hi) <= 0) return Infinity;
    if (adv(lo) > 0) return 0;
    for (let it = 0; it < 60; it++) {
      const mid = Math.sqrt(lo * hi);
      if (adv(mid) > 0) hi = mid; else lo = mid;
    }
    return hi;
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
    const KEYS = [
      ['lambda', 'API price melt rate λ'],
      ['e0', 'Electricity price e₀'],
      ['gamma', 'Electricity escalation γ'],
      ['u', 'Utilization u'],
      ['s0', 'GPU throughput s₀'],
      ['kappa', 'Quality gap κ'],
      ['D', 'Dev cost D'],
      ['h', 'GPU price h'],
      ['mYr', 'MLOps cost m'],
    ];
    return KEYS.map(([key, label]) => {
      const up = simulate({ ...P, [key]: P[key] * 1.3 }).npvAdvantage - base.npvAdvantage;
      const dn = simulate({ ...P, [key]: P[key] * 0.7 }).npvAdvantage - base.npvAdvantage;
      return { key, label, up, dn };
    });
  }

  return { DEFAULTS, simulate, epsilon0, meltTime, glacierValue,
           minViableScale, maxDevCost, elecShare, tornado,
           SECONDS_PER_YEAR, HOURS_PER_YEAR };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = GLACIER;
