# Electrode material defaults — 2026-09-06

The calculator first requests materials for the selected application (including
the library's `general` rows), then orders each material category by the rules
below. These are the existing UI defaults, now extracted unchanged into
`frontend/src/lib/electrode-defaults.ts` and tested with Node's built-in test
runner. The API resolves explicitly supplied material keys; it does not choose
these four defaults on the user's behalf.

| Application | Preparation template | Catalyst powder priority | Ionomer and membrane priority | Substrate priority |
|---|---|---|---|---|
| Fuel cell | `pem_fuel_cell_ccm` | Pt → PtRu → other | PFSA/Aquivion → AEM/Piperion/Sustainion/PDT → other | carbon → titanium/PTL → nickel → other |
| Fuel cell | `aem_fuel_cell_ccm` | exact application → general → other | exact application → general → other | exact application → general → other |
| Direct methanol fuel cell | `dmfc_gde_route` | PtRu → Pt → other | PFSA/Aquivion → AEM/Piperion/Sustainion/PDT → other | carbon → titanium/PTL → nickel → other |
| Electrolyzer | `pem_electrolyzer_ccm` | Ir → Ru → PtIr → other | PFSA/Aquivion → AEM/Piperion/Sustainion/PDT → other | titanium/PTL → carbon → nickel → other |
| Electrolyzer | `alkaline_electrolyzer_gde` | Ni → Ag → Ir/Ru → other | AEM/Piperion/Sustainion/PDT → PFSA/Aquivion → other | nickel → carbon → titanium/PTL → other |
| General | PEM fuel-cell or DMFC template | same corresponding template rules above | same corresponding template rules above | same corresponding template rules above |
| General | other templates | exact general application → other | exact general application → other | exact general application → other |

Within an equal first priority, source scope sorts as `literature_high_volume`
→ `historical_bulk` → `vendor_lab` → other, followed by lower stored numerical
quote price and then material name. Prices from different pack units are not
normalised in this UI tie break. Existing selections that rank after the current
preferred row are replaced by the current selection effect. These two existing
behaviours are documented, not silently changed in this run.

The AEM fuel-cell route currently has no membrane-chemistry-specific preference;
it uses application-family priority. No new chemical selection policy was inferred
for it. A future change needs an explicit, source-backed material compatibility
rule and should update this table and its tests together.

The result's headline, cost ledger, shares and chart now all use the electrode
assembly's `breakdown[].cost_usd / active_area_cm2`. Thermal campaign days,
selling margin, production-scale chips and recovery credits are excluded from
the electrode result. The separately labelled per-mass powder estimate remains
available as context. No cost equations or material-price values changed.

Verification:

- `node --test scripts/test_calculator_rules.mjs`: 9 passed; application/template
  defaults, source/price/name ties, repeated operation counts, explicit selected
  template identity at both equipment scales, and electrode totals immune to
  unrelated thermal cost fields.
- `python -m pytest backend/tests/test_template_identity.py -q`: 1 passed in
  0.64 s; the test loops over 28 thermal cards at all three scales (84 calculator
  requests), checking `route_summary.template_id`, result name, and card/result
  processing-cost equality.
- Frontend `npm run lint` and `npm run build` both passed after the UI changes.
  The build retains the existing Tailwind sourcemap warning.
- Browser screenshots and end-to-end results are recorded by the main T02/T08
  audit; these command checks alone are not claimed as browser validation.
