# Contributing

Token Yield is an analytical model. Changes should preserve reproducibility between the dashboard, derivations, calibration data, and verification scripts.

## Before opening a pull request

Run the verification suite:

```bash
node dashboard/verify.mjs
```

If your change touches the two-gate derivation or a companion-paper claim, also run the relevant audit script under `dashboard/`.

## Data and assumptions

- Prefer primary sources for hardware specifications, power, and provider pricing.
- Date every market-price or rate-card snapshot.
- Separate measured values from assumptions and scenario parameters.
- Do not silently replace a historical calibration with a current quote; preserve the date and document the change.
- Do not commit private drafting links, credentials, API keys, or locally generated secrets.

## Model changes

A change to a formula, unit conversion, default, or decision gate should include a corresponding verification case. Keep `index.html`, `dashboard/engine.dev.js`, and `docs/canonical-spec.md` consistent where the same logic is represented in more than one place.
