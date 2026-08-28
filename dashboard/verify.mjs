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

console.log(fails === 0 ? '\nALL CHECKS PASS' : `\n${fails} CHECKS FAILED`);
process.exit(fails === 0 ? 0 : 1);
