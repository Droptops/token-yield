// Extracts the engine from index.html (single source of truth) and cross-checks
// the discrete simulation against exact closed forms.
import { readFileSync } from 'fs';
import { createRequire } from 'module';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const m = html.match(/<script id="glacier-engine">([\s\S]*?)<\/script>/);
if (!m) { console.error('FAIL: engine block not found'); process.exit(1); }
const mod = { exports: {} };
new Function('module', 'exports', m[1])(mod, mod.exports);
const G = mod.exports;

let fails = 0;
const devEngine = readFileSync(new URL('./engine.dev.js', import.meta.url), 'utf8').trim();
const embeddedEngine = m[1].trim();
const engineParity = devEngine === embeddedEngine;
console.log(`${engineParity ? 'PASS' : 'FAIL'}  embedded engine matches dashboard/engine.dev.js`);
if (!engineParity) fails++;

const check = (name, got, want, tol) => {
  const ok = Math.abs(got - want) <= tol * Math.max(1, Math.abs(want));
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: got ${got}  want ${want}`);
};

// ---- Vector A: constant world (g=lambda=gamma=mu=r=0), upfront fleet — closed form is exact
{
  const P = { ...G.DEFAULTS, Tyears: 2, r: 0, g: 0, lambda: 0, lambdaOpen: 0, gamma: 0, mu: 0,
              fleetMode: 'upfront', comparator: 'frontier' };
  const s = G.simulate(P);
  const M = 24;
  const secPerMonth = G.SECONDS_PER_YEAR / 12, hrsPerMonth = G.HOURS_PER_YEAR / 12;
  const N = Math.ceil(P.Q0m * P.kappa / (P.s0 * P.u * secPerMonth / 1e6));
  const npvBuyWant = M * P.p0 * P.Q0m;
  const elecMonth = N * P.wKw * P.pue * hrsPerMonth * P.e0;
  const npvBuildWant = P.D + N * P.h + M * (elecMonth + P.mYr / 12) - N * P.h * Math.exp(-P.delta * 2);
  check('A npvBuy', s.npvBuy, npvBuyWant, 1e-12);
  check('A npvBuild', s.npvBuild, npvBuildWant, 1e-12);
  check('A N', s.Nfinal, N, 0);
}

// ---- Vector B: exponential world — exact geometric-sum closed forms (discrete convention)
{
  const P = { ...G.DEFAULTS, Tyears: 3, r: 0.10, g: 0.20, lambda: 0.6931, gamma: 0.05, mu: 0,
              fleetMode: 'upfront', comparator: 'frontier' };
  const s = G.simulate(P);
  const M = 36;
  const geo = x => { const rho = Math.exp(x / 12); return Math.abs(x) < 1e-12 ? M : (1 - Math.pow(rho, M)) / (1 - rho); };
  const npvBuyWant = P.p0 * P.Q0m * geo(P.g - P.lambda - P.r);
  check('B npvBuy', s.npvBuy, npvBuyWant, 1e-12);
  const secPerMonth = G.SECONDS_PER_YEAR / 12, hrsPerMonth = G.HOURS_PER_YEAR / 12;
  const qPeak = P.Q0m * Math.exp(P.g * 35 / 12) * P.kappa;
  const N = Math.ceil(qPeak / (P.s0 * P.u * secPerMonth / 1e6));
  const elecPV = N * P.wKw * P.pue * hrsPerMonth * P.e0 * geo(P.gamma - P.r);
  const mPV = (P.mYr / 12) * geo(-P.r);
  const npvBuildWant = P.D + N * P.h + elecPV + mPV - N * P.h * Math.exp(-(P.delta + P.r) * 3);
  check('B npvBuild (no overflow)', s.npvBuild, npvBuildWant, 1e-12);
  const anyOverflow = s.rows.some(r => r.overflowRef > 1e-9);
  console.log(`${anyOverflow ? 'FAIL' : 'PASS'}  B no overflow with upfront sizing`);
  if (anyOverflow) fails++;
}

// ---- Vector C: melt-time closed form vs numeric margin sign change
{
  const P = { ...G.DEFAULTS, Tyears: 8 };
  const melt = G.meltTime(P);
  const eps0 = G.epsilon0(P);
  const a = t => P.p0 * Math.exp(-P.lambda * t) - P.kappa * eps0 * Math.exp((P.gamma - P.mu) * t);
  // numeric root by bisection
  let lo = 0, hi = 50;
  for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (a(mid) > 0) lo = mid; else hi = mid; }
  check('C tStar', melt.tStar, (lo + hi) / 2, 1e-6);
  // sanity: a(t*) ~ 0
  check('C a(tStar)≈0', a(melt.tStar), 0, 1e-9);
}

// ---- Vector D: glacier value numeric vs independent trapezoid-free monthly sum
{
  const P = { ...G.DEFAULTS };
  const s = G.simulate(P);
  const eps0 = G.epsilon0(P);
  let want = 0;
  for (let i = 0; i < s.M; i++) {
    const t = i / 12;
    const c = P.p0 * Math.exp(-P.lambda * t);
    const eps = eps0 * Math.exp((P.gamma - P.mu) * t);
    const aMargin = c - P.kappa * eps;
    const q = P.Q0m * Math.exp(P.g * t);
    if (aMargin > 0) want += Math.exp(-P.r * t) * aMargin * q;
  }
  check('D glacierValue', G.glacierValue(P, s), want, 1e-12);
}

// ---- Vector E: D enters additively — maxDevCost identity
{
  const P = { ...G.DEFAULTS, Q0m: 50000 };
  const s = G.simulate(P);
  const dMax = G.maxDevCost(P, s);
  const s2 = G.simulate({ ...P, D: dMax });
  check('E advantage at Dmax = 0', s2.npvAdvantage, 0, 1e-9);
}

// ---- Vector F: staged fleet never exceeds upfront cost, capacity always covers demand
{
  const P = { ...G.DEFAULTS, Q0m: 50000 };
  const st = G.simulate({ ...P, fleetMode: 'staged' });
  const up = G.simulate({ ...P, fleetMode: 'upfront' });
  console.log(`${st.npvBuild <= up.npvBuild + 1e-6 ? 'PASS' : 'FAIL'}  F staged <= upfront build NPV (${Math.round(st.npvBuild)} vs ${Math.round(up.npvBuild)})`);
  if (!(st.npvBuild <= up.npvBuild + 1e-6)) fails++;
  const noOv = st.rows.every(r => r.overflowRef < 1e-9);
  console.log(`${noOv ? 'PASS' : 'FAIL'}  F staged fleet covers demand`);
  if (!noOv) fails++;
}

// ---- Vector G: sigma is a pure volume share — sigma=0.5 equals half the demand
{
  const a = G.simulate({ ...G.DEFAULTS, sigma: 0.5 });
  const b = G.simulate({ ...G.DEFAULTS, Q0m: G.DEFAULTS.Q0m * 0.5 });
  check('G sigma equivalence', a.npvAdvantage, b.npvAdvantage, 1e-12);
}

// ---- Vectors H: cross-check against the adversarially reviewed canonical spec
// (docs/canonical-spec.md §8.4) — computed by an independent reference
// implementation and verified through the hostile-review loop.
{
  const BASE = { ...G.DEFAULTS, kappa: 1.2, s0: 800, u: 0.6, wKw: 1.2, pue: 1.3, e0: 0.12,
    h: 30000, sigma: 1, comparator: 'frontier', fleetMode: 'upfront', lambdaOpen: 0 };
  const A = G.simulate({ ...BASE, Tyears: 2, r: 0, Q0m: 10000, g: 0, p0: 4, lambda: 0,
    gamma: 0, mu: 0, delta: 0.25, D: 120000, mYr: 96000 });
  check('H-A npvBuy', A.npvBuy, 960000, 1e-12);
  check('H-A npvBuild', A.npvBuild, 462860.706, 1e-8);
  check('H-A breakEven', A.breakEvenMonth, 13, 0);
  const B = G.simulate({ ...BASE, Tyears: 3, r: 0.10, Q0m: 10000, g: 0, p0: 4,
    lambda: 0.6931, gamma: 0.05, mu: 0, delta: 0.25, D: 120000, mYr: 60000 });
  check('H-B npvBuy', B.npvBuy, 567514.917, 1e-8);
  check('H-B npvBuild', B.npvBuild, 516987.412, 1e-8);
  check('H-B breakEven', B.breakEvenMonth, 35, 0);
  const CP = { ...BASE, Tyears: 3, r: 0.10, Q0m: 1500, g: 0, p0: 1.5, lambda: 1.0,
    gamma: 0.15, mu: 0, delta: 0.35, D: 200000, mYr: 60000, fleetMode: 'manual', N: 1 };
  const C = G.simulate(CP);
  check('H-C npvBuy', C.npvBuy, 24740.1981, 1e-8);
  check('H-C npvBuild', C.npvBuild, 391071.433, 1e-8);
  check('H-C tStar', G.meltTime(CP).tStar, 2.12668, 1e-5);
  check('H-C overflow ref tok/mo', C.rows[0].overflowRef * 1e6, 4.48080e8, 1e-5);
}

// ---- Vector I: same-model inference-provider basket arithmetic
{
  const P = { ...G.DEFAULTS };
  const b = G.providerBasket(P);
  const byKey = Object.fromEntries(b.providers.map(row => [row.key, row]));
  // theta=.25 output, chi=.25 cached input, d=0.
  check('I Fireworks blended quote', byKey.fireworks.blended, 1.74075, 1e-12);
  check('I Baseten blended quote', byKey.baseten.blended, 1.75725, 1e-12);
  check('I DeepInfra blended quote', byKey.deepinfra.blended, 1.4, 1e-12);
  check('I equal-weight provider basket', b.blended, 1.6326666666666667, 1e-12);
  check('I provider low', b.low, 1.4, 1e-12);
  check('I provider high', b.high, 1.75725, 1e-12);
  check('I provider curve at year 2', G.providerPriceAt(P, 2), b.blended * Math.exp(-2 * P.lambdaProvider), 1e-12);

  const uncached = G.providerBasket({ ...P, providerCacheHit: 0 });
  const cached = G.providerBasket({ ...P, providerCacheHit: 0.5 });
  console.log(`${cached.blended < uncached.blended ? 'PASS' : 'FAIL'}  I cache hits lower provider price`);
  if (!(cached.blended < uncached.blended)) fails++;
  const discounted = G.providerBasket({ ...P, providerDiscount: 0.2 });
  check('I contract discount is linear', discounted.blended, 0.8 * b.blended, 1e-12);
}

// ---- Vector J: provider comparator matches the geometric BUY closed form
// and the same analytic melt clock used by the other exponential comparators.
{
  const P = { ...G.DEFAULTS, Tyears: 2, r: 0.10, g: 0.20, lambdaProvider: 0.40,
              comparator: 'inferenceCloud', fleetMode: 'upfront' };
  const s = G.simulate(P);
  const M = 24;
  const rho = Math.exp((P.g - P.lambdaProvider - P.r) / 12);
  const geo = (1 - Math.pow(rho, M)) / (1 - rho);
  const c0 = P.kappa * G.providerBasket(P).blended;
  check('J provider npvBuy', s.npvBuy, c0 * P.Q0m * P.sigma * geo, 1e-12);
  const eps0 = G.epsilon0(P);
  const tWant = Math.log(c0 / (P.kappa * eps0)) / (P.lambdaProvider + P.gamma - P.mu);
  check('J provider melt time', G.meltTime(P).tStar, tWant, 1e-12);
  check('J provider row basis', s.rows[0].comp, P.kappa * s.rows[0].pProvider, 1e-12);
}

// ---- Vector K: first viable scale must respect the integer-fleet sawtooth.
// A global bisection used to return ~18049.3M; the true first crossing is a
// narrow feasible interval near 18032.95M followed immediately by another GPU jump.
{
  const P = { ...G.DEFAULTS, comparator: 'frontier' };
  const q = G.minViableScale(P);
  check('K first viable scale', q, 18032.947381127375, 1e-10);
  const before = G.simulate({ ...P, Q0m: q - 0.01 }).npvAdvantage;
  const inside = G.simulate({ ...P, Q0m: q + 0.01 }).npvAdvantage;
  const afterJump = G.simulate({ ...P, Q0m: q + 1 }).npvAdvantage;
  console.log(`${before < 0 ? 'PASS' : 'FAIL'}  K scale just below first crossing is infeasible`);
  if (!(before < 0)) fails++;
  console.log(`${inside > 0 ? 'PASS' : 'FAIL'}  K first fixed-fleet band becomes feasible`);
  if (!(inside > 0)) fails++;
  console.log(`${afterJump < 0 ? 'PASS' : 'FAIL'}  K next GPU jump exposes sawtooth dip`);
  if (!(afterJump < 0)) fails++;
  const hosted = G.minViableScale({ ...G.DEFAULTS, comparator: 'hostedOpen' });
  console.log(`${hosted === Infinity ? 'PASS' : 'FAIL'}  K fractional-fleet bound proves hosted-open has no viable scale`);
  if (hosted !== Infinity) fails++;
}

// ---- Vector L: overflow cannot earn glacier margin, and a zero-price
// comparator cannot "open later" merely because both exponentials decay.
{
  const P = { ...G.DEFAULTS, comparator: 'inferenceCloud', fleetMode: 'manual', N: 1,
              Q0m: 10000, Tyears: 1 };
  const s = G.simulate(P);
  const eps0 = G.epsilon0(P);
  let capped = 0, uncapped = 0;
  for (const row of s.rows) {
    const eps = eps0 * Math.exp((P.gamma - P.mu) * row.t);
    const margin = row.comp - P.kappa * eps;
    if (margin <= 0) continue;
    const disc = Math.exp(-P.r * row.t);
    capped += disc * margin * Math.min(row.q, row.selfServed / P.kappa);
    uncapped += disc * margin * row.q;
  }
  check('L overflow-capped glacier', G.glacierValue(P, s), capped, 1e-12);
  console.log(`${capped < uncapped ? 'PASS' : 'FAIL'}  L overflow earns no glacier margin`);
  if (!(capped < uncapped)) fails++;
  const free = { ...P, providerDiscount: 1, mu: 1, gamma: 0 };
  const melt = G.meltTime(free);
  console.log(`${melt.mode === 'alreadyMelted' && melt.tStar === 0 ? 'PASS' : 'FAIL'}  L zero-price comparator stays already melted`);
  if (!(melt.mode === 'alreadyMelted' && melt.tStar === 0)) fails++;
}

// ---- Vector M: a negative arbitrary upper bound cannot prove there is no
// viable scale. Here 100T ref tok/mo lands just after a two-GPU jump and loses,
// while the nearly-full one-GPU band below it is profitable.
{
  const capM = 60000000;
  const P = {
    ...G.DEFAULTS,
    Tyears: 1 / 12,
    r: 0,
    g: 0,
    p0: 0.018,
    lambda: 0,
    comparator: 'frontier',
    fleetMode: 'upfront',
    kappa: 1,
    sigma: 1,
    h: 1000000,
    s0: capM * 1e6 / (G.SECONDS_PER_YEAR / 12),
    mu: 0,
    u: 1,
    wKw: 0,
    pue: 1,
    e0: 0,
    gamma: 0,
    D: 0,
    mYr: 0,
    delta: 1000,
  };
  const upperAdv = G.simulate({ ...P, Q0m: 1e8 }).npvAdvantage;
  console.log(`${upperAdv < 0 ? 'PASS' : 'FAIL'}  M arbitrary upper bound is infeasible`);
  if (!(upperAdv < 0)) fails++;
  const q = G.minViableScale(P);
  check('M earlier viable band is found', q, 1000000 / 0.018, 1e-10);
  console.log(`${Number.isFinite(q) ? 'PASS' : 'FAIL'}  M negative upper bound does not mask an earlier crossing`);
  if (!Number.isFinite(q)) fails++;
}

// ---- Vector N: local-AI ownership ladder metadata, fit gate, roofline,
// output-token rate-card conversion, and discounted ownership arithmetic.
{
  const byKey = Object.fromEntries(G.LOCAL_HARDWARE_PROFILES.map(row => [row.key, row]));
  check('N DGX Spark public price', byKey.dgxSpark.price, 4699, 0);
  check('N M6 base memory bandwidth', byKey.macMiniM6.bandwidthGBs, 153, 0);
  check('N M5 Ultra base memory', byKey.macStudioM5Ultra.memoryGB, 96, 0);
  check('N M5 Ultra maximum memory ceiling', byKey.macStudioM5Ultra.maxMemoryGB, 512, 0);

  const base = { ...G.DEFAULTS, localModelGB: 12, localMemoryHeadroom: 0.20,
                 localBandwidthEfficiency: 0.55 };
  console.log(`${G.localModelFits(byKey.macMiniM6, base) ? 'PASS' : 'FAIL'}  N 12GB model fits M6 starting memory with headroom`);
  if (!G.localModelFits(byKey.macMiniM6, base)) fails++;
  console.log(`${!G.localModelFits(byKey.macMiniM6, { ...base, localModelGB: 13 }) ? 'PASS' : 'FAIL'}  N fit gate rejects model above usable M6 memory`);
  if (G.localModelFits(byKey.macMiniM6, { ...base, localModelGB: 13 })) fails++;
  check('N M5 Pro roofline throughput', G.localRooflineThroughput(byKey.macMiniM5Pro, base), 0.55 * 307 / 12, 1e-12);

  const oneMonth = { ...base, Tyears: 1 / 12, r: 0, mu: 0, lambdaProvider: 0,
                     lambdaOpen: 0, kappa: 1.2, providerOutputShare: 0.25 };
  const cloud = G.localCloudCurves(oneMonth);
  check('N provider price converted to reference output basis', cloud.rows[0].providerLevelizedRef,
    1.2 * G.providerBasket(oneMonth).blended / 0.25, 1e-12);

  const synthetic = { key: 'synthetic', name: 'Synthetic', maker: 'test', price: 1000,
                      memoryGB: 32, maxMemoryGB: 32, bandwidthGBs: 100, powerKw: 0.2 };
  const constant = {
    ...G.DEFAULTS, Tyears: 1, r: 0, mu: 0, gamma: 0, e0: 0.10, delta: 0,
    kappa: 1.2, localModelGB: 10, localMemoryHeadroom: 0,
    localBandwidthEfficiency: 0.5, localActiveHours: 24,
    localActivePowerShare: 1, localIdlePowerShare: 0,
  };
  const own = G.localOwnership(constant, synthetic);
  check('N synthetic roofline throughput', own.s0, 5, 1e-12);
  check('N no-depreciation ownership equals electricity floor', own.levelizedRef,
    constant.kappa * synthetic.powerKw * constant.e0 / (3600 * own.s0) * 1e6, 1e-12);
  check('N zero depreciation preserves nominal resale', own.rows.at(-1).resale, synthetic.price, 1e-12);
}

console.log(fails === 0 ? '\nALL CHECKS PASS' : `\n${fails} CHECKS FAILED`);
process.exit(fails === 0 ? 0 : 1);
