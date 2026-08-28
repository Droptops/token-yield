# Audit of the companion papers

*Independent verification of every checkable numerical claim in
[Two Gates and a Half-Life](https://claude.ai/code/artifact/aaa96ee8-841e-450f-90a1-52865e584372),
[When Open Source Gets Cheap Enough](https://claude.ai/code/artifact/40c001e6-97f2-4796-bf2f-a538cfdf8142),
and the [Melt Rate](https://claude.ai/code/artifact/569e7a6d-2292-4403-90e8-c522772700af)
interactive. Reproduce with:* `node dashboard/audit-twogates.mjs`

## Verdict

**17 of 17 checkable claims reproduce** from the stated calibration
(F=$2M/yr, k=$1.5M/yr, δ₀=0.9, γ=2, p_f=$3/Mtok; upstream: $7,500 chip production cost,
75% vendor margin, 5yr × 8,760h amortization, 0.91 kW delivered, $0.07/kWh):

| Claim | Paper | Reproduced |
|---|---|---|
| σ* at V = 10¹² / 10¹³ / 10¹⁴ tok/yr | 0.255 / 0.764 / 0.926 | 0.2546 / 0.7643 / 0.9255 |
| Participation at 10¹² / 10¹³ | fail / pass | fail / pass |
| Yield lift at 10¹³ / 10¹⁴ | +23.6% / +40.6% | +23.64% / +40.56% |
| Two-gate threshold V* | 3.44×10¹² | 3.4425×10¹² |
| Single-gate threshold (σ=0.5) | 1.48×10¹² | 1.4815×10¹² |
| 30% frontier cut pushes back (at V=10¹³) | 4.6 pp | 4.60 pp |
| Frontier half-life | 3.96 yr | 3.9608 yr |
| Half-life under defensive pricing (φ=2, G=0.5) | 5.94 yr | 5.9413 yr |
| Electricity share of unit compute s_e | 0.085 ("about 9%") | 0.0851 |
| Capacity/price channel ratio at ε = 0.5 / 1 | 23.5× / 11.8× | 23.50× / 11.75× |
| Vendor-margin vs power-price leverage | "roughly thirty times" | 32.3× |
| Power price doubling → serving cost | "about 8%" | +8.51% |

The Melt Rate dashboard's embedded model was also read line-by-line: `Dcum`, `sigStar`,
`saving`, `parts`, `breakeven`, `floorCost`, and the melt/feedback curves all implement the
paper's propositions faithfully (including the σ=0 discontinuity of F, drawn as a step,
and the corner cases of Proposition 1).

## Defects found and corrected (republished in place, same URLs)

1. **Plain paper, break-even box** — said *"at a $2M setup and $1.5M ongoing."* In the
   model both F and k are **annual** flows (`L(σ) = 1{σ>0}·(F + kσ)` per firm **per
   period**; the plain text itself describes F as a standing team of 4–5 engineers).
   "Setup" reads as one-time and would make a reader's payback arithmetic wrong by
   roughly the horizon length. Now reads: *"with the team costing $2M a year and up to
   $1.5M a year more as you widen the stack."*
2. **Melt Rate, Gate-1 chip** — labeled `V·p_f·δ₀` (≈$27M/yr at defaults) as the
   *"first token"*. That quantity is the saving rate on the first **unit of routed
   share**; the first *token* saves p_f·δ₀ ≈ $2.7×10⁻⁶. Dimensionally off by a factor
   of V. Now reads *"first slice of workload: $…/yr vs $…/yr."*

## Not independently verifiable (flagged, not defects)

- The dispersion-vs-melt-rate peak table (§5) is from a stated simulation (N=4×10⁵);
  qualitative claim (dispersion peaks before melt rate, gap widens with sd(ln V)) is
  consistent with the model's structure but was not re-simulated here.
- The 8-firm empirical panel lives in the unpublished companion repo; both papers
  already flag that it does not survive growth/scale controls — honest as stated.
- γ (substitutability falloff) is picked, not observed — both papers say so explicitly.

## Consistency with this repo's cash-flow model

The two models agree where they overlap: electricity is a small share of serving cost
(s_e ≈ 0.085 provider-side; 3.7–8.5% of build cost firm-side here), power **capacity**
dominates power **price** as the electricity channel, frontier price cuts shrink the
prize (∂G/∂p₀ > 0 here; ∂τ/∂ln p_f = +1 there), and the participation gate — not the
marginal margin — is what actually blocks mid-size deployments.
