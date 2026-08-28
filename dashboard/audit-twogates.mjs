// Reproduces every checkable numerical claim in the companion papers
// "Two Gates and a Half-Life" and "When Open Source Gets Cheap Enough"
// from their stated calibration. Run: node dashboard/audit-twogates.mjs
'use strict';

// Calibration (paper §7): F, k in $M/yr; pf in $M per token; V in tokens/yr
const F = 2, k = 1.5, d0 = 0.9, gam = 2, pf = 3e-12;

const Dcum = s => d0 * (1 - Math.pow(1 - s, gam + 1)) / (gam + 1);
const sigStar = V => { const x = k / (V * pf * d0); return x >= 1 ? 0 : 1 - Math.pow(x, 1 / gam); };
const net = V => { const s = sigStar(V); return V * pf * Dcum(s) - k * s; };
const participates = V => sigStar(V) > 0 && net(V) > F;
const lift = V => { const s = sigStar(V); const c0 = V * pf, c1 = V * pf * (1 - Dcum(s)) + F + k * s; return c0 / c1 - 1; };

let fails = 0;
const check = (name, got, want, tol) => {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: got ${got}  want ${want}`);
};

// --- Proposition 1 table (paper §7)
check('sigma* @ 1e12', sigStar(1e12), 0.255, 0.001);
check('sigma* @ 1e13', sigStar(1e13), 0.764, 0.001);
check('sigma* @ 1e14', sigStar(1e14), 0.926, 0.001);
// --- Proposition 2
check('participates @ 1e12 (no)', participates(1e12) ? 1 : 0, 0, 0);
check('participates @ 1e13 (yes)', participates(1e13) ? 1 : 0, 1, 0);
// --- Yield lifts
check('yield lift @ 1e13', lift(1e13) * 100, 23.6, 0.15);
check('yield lift @ 1e14', lift(1e14) * 100, 40.6, 0.15);
// --- V* threshold (two-gate) vs single-gate
let lo = 1e10, hi = 1e16;
for (let i = 0; i < 200; i++) { const mid = Math.sqrt(lo * hi); if (participates(mid)) hi = mid; else lo = mid; }
check('V* two-gate', hi / 1e12, 3.44, 0.02);
check('V* single-gate (L/(pf*sigma*delta), sigma=0.5)', 2e6 / (3e-6 * 0.5 * 0.9) / 1e12, 1.48, 0.01);
// --- 30% frontier cut: workload pushed back at V=1e13
const dSig = sigStar(1e13) - (() => { const x = k / (1e13 * pf * 0.7 * d0); return 1 - Math.pow(x, 1 / gam); })();
check('30% cut pushes back (pp) @1e13', dSig * 100, 4.6, 0.1);
// --- Melt law half-life and feedback
const m = 0.35, phi = 2, G0 = 0.5;
check('half-life', gam * Math.LN2 / m, 3.96, 0.01);
check('half-life w/ feedback', gam * Math.LN2 / (m / (1 + phi * G0 / gam)), 5.94, 0.01);
// --- Upstream floor: s_e and the "thirty times" claim
const CPROD = 7500, TY = 5, HOURS = 8760, ETA = 0.700 * 1.3, ce = 0.07, mu = 0.75;
const cg = CPROD / (1 - mu), cap = cg / (TY * HOURS), en = ETA * ce, tot = cap + en;
const se = en / tot, sg = cap / tot;
check('s_e electricity share', se, 0.085, 0.001);
check('capacity/price ratio @eps=1', (1 / 1) / se, 11.8, 0.1);
check('capacity/price ratio @eps=0.5', 2 / se, 23.5, 0.2);
// margin elasticity vs power price elasticity ("roughly thirty times")
const dlnT_dlnmu = sg * (mu / (1 - mu));       // = s_g * 3
check('margin-vs-power leverage (~30x)', dlnT_dlnmu / se, 32.3, 0.5);
// "power price doubles => serving cost +~8%"
check('power doubling => cost +%', (en * 2 + cap) / tot * 100 - 100, 8.5, 0.3);

console.log(fails === 0 ? '\nALL PAPER CLAIMS REPRODUCE' : `\n${fails} CLAIMS FAILED`);
process.exit(fails ? 1 : 0);
