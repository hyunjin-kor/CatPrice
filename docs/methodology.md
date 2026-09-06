# Methodology

COMET implements the catalyst cost estimation methodology from the CatCost framework (Baddour et al. 2018, Van Allsburg et al. 2022).

## Current Scope

The shipped product has four research-facing layers:

1. `materials and live price basis`
   Material rows can resolve against live feeds, indexed references, literature rows, or vendor rows.
2. `preparation-step costing`
   The Step Method remains the core plant-style processing estimate.
3. `electrocatalyst layer costing`
   Electrocatalyst workflows can add area-based catalyst, ionomer, membrane, and substrate costs.
4. `spent catalyst recovery proxy`
   Thermocatalyst workflows can optionally include end-of-life recovery value as a screening adjustment.

## Price basis

Two tiers, kept apart on purpose.

The live tier is what the desktop app shows. Direct Johnson Matthey base prices take priority for platinum and palladium, and Westmetall LME settlements for copper and aluminium. Yahoo futures remain their fallback and the first source for gold and silver. Every price carries its source, quote time and evidence tier.

The selector tries the following fallbacks in order. An asterisk marks an optional configured API key. Yahoo-only polling preserves a stored primary JM/Westmetall quote; a full refresh can choose the fallback when the primary is unavailable. Both in-page polling intervals are five minutes (Yahoo increased from one minute); reference history is collected at most daily.

| Metals | Live source order |
|---|---|
| Pt, Pd | Johnson Matthey → Yahoo → Metals.Dev* → Kitco → MetalpriceAPI* → CatCost anchor |
| Cu, Al | Westmetall → Yahoo → Metals.Dev* → CatCost anchor |
| Au, Ag | Yahoo → Metals.Dev* → Kitco → MetalpriceAPI* → CatCost anchor |
| Rh | Kitco → Metals.Dev* → Johnson Matthey → CatCost anchor |
| Ru, Ir | Johnson Matthey → Metals.Dev* → CatCost anchor |
| Ni | Metals.Dev* → Markets Insider → Westmetall → CatCost anchor |
| Zn, Sn | Westmetall → USGS anchor |
| Co, Mo, W | Metals.Dev* → USGS anchor |
| V, Re | USGS anchor |
| Fe | CatCost anchor |

The [source-priority audit](audit/t09-t10-notes.md) records actual public-feed responses and offline fallback tests. Missing sources retain the documented anchor; no additional rate is inferred.

COMET uses library prices for supports on the live basis (USGS annual averages, public trade unit values and supplier quotes, escalated with ChemPPI). On the reference basis, eleven support definitions (calcined and alpha alumina, titania, silica, activated carbon, carbon black, synthetic zeolites, magnesia, cerium compounds, manganese dioxide, chromium oxide) can take monthly U.S. import unit values for the HS codes in `backend/data/support_series.json`. Verified observations shipped in `backend/data/support_price_history.json` are loaded offline at startup, without an API key; definitions with no observation retain their library prices. A unit value is customs value over net weight with every grade and partner combined, so it is a bulk market level, not a catalyst-grade quote; the evidence tier says so.

The free public preview permits one period per request. `scripts/fetch_support_history.py --start 2026-04 --end 2026-07 --out support_history.json` requests at most twelve completed months per definition, uses no credentials, spaces requests by twelve seconds and stops on HTTP429. It retains every request outcome and rejects mismatched filters, duplicate/truncated rows, non-finite values, missing weights and estimated weights. A zero-row response means no published observation, never a zero price. The September6 acquisition accepted three alumina months (April–June), found no July row and stopped at the provider's rate limit. The September7 (Korea time) resumption queried June once for each definition: nine passed, including the unchanged alumina observation, while alpha alumina had estimated weight and carbon black lacked net weight. The shipped snapshot therefore contains nine series and eleven observations. Existing grade limitations and material links are unchanged; cerium compounds remain an unlinked market indicator. See `docs/sources/free-comtrade-evidence-2026-09-07.md` for the retained responses and policy check.

To include a validated support snapshot in the paper, add `--support-history backend/data/support_price_history.json` to `scripts/reproduce_paper.py`. The latest common month then includes support publication dates; requesting July with the shipped April–June observations fails explicitly. The manifest preserves both raw input hashes. The original July metal-only run is retained; the separate free-data run uses June. Short support series are held at the June basis in the long historical replay and are identified as incomplete series, rather than interpolated through missing years.

The reference tier is the academic basis. The sidebar switch moves the whole app between the two: on the academic basis the price screen, the calculator and the benchmark rankings all price from the latest published month. The paper analysis prices from the same tier. Monthly averages from the IMF Primary Commodity Price System (aluminium, copper, nickel, zinc, tin, cobalt, molybdenum, gold, silver) and Johnson Matthey base prices averaged by month (platinum, palladium, rhodium, ruthenium, iridium), cut at the latest month both publish. Tungsten, rhenium, vanadium and iron have no published series and keep their USGS or CatCost anchors. `scripts/fetch_price_history.py` freezes the series, `scripts/build_reference_basis.py` turns one month into a price map, and the analysis scripts take that map through `--price-basis`. Every number in the paper then re-costs from a committed file rather than from whatever the app fetched that day.

## Step Method (Chapter 6)

### Reproducing the paper

From the repository root, with the project's Python packages and Matplotlib available:

```bash
python scripts/reproduce_paper.py --price-basis reference --month 2026-07 --seed 20260906
```

Omit `--month` to choose the latest common completed publication month. The command collects institutional history, freezes the reference basis, evaluates the library, replays price states, sweeps break-even prices and draws six figures. It records input SHA-256 hashes, exact commands, the Python/package environment and source failures in `docs/paper/reproduction_manifest_2026-09-06.json`. The deterministic analyses enumerate states; the seed controls the execution environment and is retained for reproducibility. The uncertainty API separately accepts an optional `seed`; omitting it requests independent samples.

To repeat the committed evidence without collecting new quotes:

```bash
python scripts/reproduce_paper.py --price-basis reference --month 2026-07 --seed 20260906 --history docs/paper/price_history_2026-09-06.json --live-basis docs/paper/live_basis_2026-09-06.json
```

If collection fails, the pipeline preserves the existing archived input and records that fallback. Historical daily observations in an older archive are converted only into a separately labelled monthly derivative; they are never described as IMF observations. Support prices remain library values when no Comtrade quote exists. The published-month freshness check compares monthly metal rows with the latest stored publication month; annual anchors keep their evidence score without a false daily-age warning. Only live-source review uses a seven-day age limit. The more detailed source-specific age status remains visible in the inspector.

The Step Method estimates catalyst selling price by summing:

1. **Materials Cost** - Raw material prices (metals, supports, solvents)
2. **Processing Cost** - Hourly equipment costs for each manufacturing step
3. **G&A Overhead** - General & Administrative (default 5%)
4. **SARD** - Sales, Admin, R&D (default 5%)
5. **Selling Margin** - Scale-dependent margin (Figure 6.3 correlation)

### Scale Classification

| Scale | Order Size | Production Rate |
|-------|-----------|----------------|
| Small | 1-5 tons | 1 ton/day |
| Medium | 5-70 tons | 10 tons/day |
| Large | 70-1000 tons | 150 tons/day |

### Selling Margin Correlation

```
margin% = 39.192 * Q^(-0.23360)
```

where Q is order size in tons.

### Campaign length

CatCost's term for one production run. In the app this appears as the production scale (order size in tons, which sets the Small, Medium or Large equipment basis) and the production time in days. Campaign days = order size ÷ production rate + cleaning time (0.5 d Small, 1 d Medium/Large). The nominal rates are 1 / 10 / 150 t/d. `calculate_step_method` accepts `production_rate_ton_per_day` to override the nominal rate for routes whose effective throughput is lower — CatCost Table 6.2 footnote b applies 67 t/d to the zeolite FCC campaign for ramp-up and ramp-down.

### Reproduction of CatCost Table 6.2

`scripts/reproduce_catcost_table62.py` feeds the published Table 6.2 inputs (mid-2017 basis) through the Step Method and prints each intermediate next to the table's value. Hourly step cost, campaign length, processing cost, subtotal, G&A and SARD match to the cent on all three cases; Pt/C reproduces the published $27.37/lb exactly. Two residuals remain and both trace to the table rather than the implementation:

| Case | COMET | Table 6.2 | Residual | Cause |
|------|------:|----------:|---------:|-------|
| 2 wt% Pt/C, 2 t | $27.37 | $27.37 | 0.00% | — |
| 21 wt% Ni/Al₂O₃, 20 t | $19.22 | $20.59 | −6.65% | Footnote f applies 33% of pre-margin; the Figure 6.3 correlation gives 24% at 20 t |
| USY-FCC, 200 t, 67 t/d | $2.44 | $2.41 | +1.16% | Footnote b effective rate; nominal 150 t/d would land 33% low |

### Preparation methods

The calculator's Preparation Method step offers 28 named thermal methods on top of the unit operations: impregnation (incipient wetness and excess solution), co-precipitation, deposition-precipitation, sol-gel, hydrothermal synthesis, ion exchange, oxide-melt fusion, solid-state and mechanochemical synthesis, colloidal nanoparticle deposition, solution combustion, zeolite and FCC routes, shaping into extrudates and pellets, washcoating on monoliths, sulfidation and gas-phase reduction. The catalog also contains one empty custom route and five electrode routes. Each `process_templates/*.json` file maps its method to Step Library operations. Modern entries carry source links; some legacy entries have only a source label and no public permalink. The method cards show the processing cost of the route alone at the current production scale, from `GET /api/templates/costs`. The [catalog audit](audit/manufacturing-catalog-2026-09-06.md) records every thermal route's steps, source fields, uncosted operations and processing costs at 2, 20 and 200 tons. Selecting a card preserves its ID and repeated operations, including when its equipment is refitted to another scale. The [electrode default rules](audit/electrode-defaults-2026-09-06.md) document material selection by application and template.

Two rules keep those costs honest. Steps are fitted to the production scale before pricing: Table 6.1 lists batch equipment at Small only and continuous equipment at Medium and Large only, so a batch kiln stands in for the continuous kiln at 2 tons and the reverse at 20 and 200 tons (`SCALE_EQUIVALENTS` in `backend/core/step_method.py`). And an operation the Step Library has no rate for (a pressure autoclave, a fusion furnace, a washcoat coating line, a hydrogen reduction furnace, gas-phase sulfiding) is either costed at the nearest listed rate and named as such, or left out and listed under `uncosted_operations`; the card shows a "partly costed" flag either way. No hourly rate is invented for them.

## CapEx/OpEx Factors Method (Chapter 7)

For detailed capital and operating cost estimation using factored approaches.

### Capital Cost Factors (Peters & Timmerhaus)

Equipment cost scaling uses the six-tenths rule:

```
Cost_target = Cost_base * (Size_target / Size_base)^0.6
```

## Price Escalation

Costs are adjusted between years using:

- **ChemPPI** - Chemical Producer Price Index (operating costs)
- **CEPCI** - Chemical Engineering Plant Cost Index (capital costs)

## Spent Catalyst Recovery (Chapter 9)

Net reclaimed value accounts for:

- Metal losses during use (varies by support and reactor type)
- Metal losses during refining
- Recovery processing costs (thermal oxidation, incoming inspection, refining charges)

In the COMET UI this is exposed as an optional `recovery scenario` for thermocatalyst cases. It is intended for early screening only.

## Life Cycle Assessment

The LCA block reports GWP (kg CO₂-eq) and CED (MJ) per kg of finished catalyst as two terms with separate provenance, and states its `system_boundary` in every result.

**Materials term** — wt%-weighted sum of per-element cradle-to-gate factors from Nuss & Eckelman (2014, PLOS ONE, CC BY). Oxide supports map to their dominant element; supports without a verified factor (silica, carbons, zeolites) are reported as `data_gap_pct`, never estimated.

**Process term** — added when the Step Method route is known. Each step is converted to fuel or electricity per kg of catalyst and then to impact with public factors (`backend/data/process_energy_factors.json`):

- Calcination: sensible heat of the dry solid from ambient to the kiln temperature (default 500 °C, cp 0.95 kJ/kg·K), divided by a 0.40 kiln thermal efficiency, as natural gas.
- Drying: latent plus sensible heat of the water load (0.7 kg/kg for impregnated supports, 1.7 kg/kg for spray-dried slurries), divided by a 0.55 dryer efficiency, as natural gas.
- Mechanical steps (mixing, milling, filtration, extrusion): order-of-magnitude specific energies from Perry's, as grid electricity.
- Emission factors: EPA GHG Emission Factors Hub (Jan 2025) — natural gas 53.06 kg CO₂/mmBtu, US-average grid 771.5 lb CO₂/MWh (eGRID2023), AR5 GWP100.
- Electrocatalyst coating-line steps are area-based and listed as `unmodeled_steps` rather than estimated.

Not in the boundary: precursor decomposition enthalpy, NOx and flare process emissions, solvent and water supply, wastewater, and equipment embodied impacts. Each occurrence of a step in a route is counted in full.

For a 21 wt% Ni/Al₂O₃ impregnation route the process term is 0.24 kg CO₂-eq/kg against 7.84 for materials (3%). Across the 54 benchmark candidates with at least 50% materials coverage the route share is 2.4% (median), 5.5% (p90) and 15.2% (max), consistent with the CatCost paper's observation that raw materials dominate catalyst manufacturing GHG (`docs/paper/results_2026-09-02.md`). The two terms are kept separate in the output so that finding can be checked per candidate rather than assumed. Lab-scale catalyst LCIs in the literature (muffle furnaces, kWh per gram) were not used as inputs because they overstate industrial energy intensity by orders of magnitude.

## Error budget and screening limits

These contributions are reported separately. COMET does not combine them into a validated total error bar: several are correlated, and missing process/impact models cannot be represented by a small symmetric uncertainty band.

| Contribution | Quantitative basis and effect | Evidence / interpretation |
|---|---|---|
| Metal and support prices | Structured Monte Carlo defaults use active-component factors 0.70–1.30, promoter/support 0.80–1.20, electrode-adjunct 0.85–1.15 and order-size 0.80–1.20. All are uniform scenario bounds, not fitted confidence intervals. | `backend/core/uncertainty.py`; observed monthly ranges and ranking transitions are in `docs/paper/monthly_history_2026-09-06.json` and `price_volatility_2026-09-06.json`. Comtrade unit values mix grades and partners; no support series means the fixed library price remains. |
| Inflation indices | The operating-rate basis starts in 2017; escalation is exactly target-index / base-index. Unsupported years raise an error. Selecting a newer target year is not proof that a final annual index has been published. | `backend/data/chemppi.json`, `backend/data/cepci.json`, `backend/core/price_escalation.py`. The reproduction manifest hashes the exact indices used. |
| Scale and effective throughput | Nominal Small/Medium/Large rates are 1/10/150 tons/day; the FCC acceptance case uses 67 tons/day. Nominal FCC gives 1.6090 USD/lb versus 2.4380 at the effective rate, showing that throughput assumptions can dominate the residual. | `docs/audit/baseline-table62.txt`, `docs/paper/table62_reproduction_2026-09-06.json`; the 28-method, three-scale audit records every equipment substitution and rate. |
| Recovery value | The recovered-metal multiplier is (1 − use loss) × (1 − refining loss). For missing support/metal mappings, existing defaults are 5% metal-use loss, 2% support loss and 10% refining loss; these are screening assumptions, not measured recovery guarantees. | `backend/core/spent_catalyst.py`, `backend/core/constants.py`, `backend/data/spent_catalyst.json`. Iron uses a scrap basis; recovery is optional and is excluded from electrode assembly output. |
| Materials LCA coverage | Coverage is reported by matched mass, with unmatched mass retained as a gap. The library has 47 candidates below 50% materials coverage; the route-share analysis includes only the eligible 54 candidates. | `docs/paper/paper_summary_2026-09-06.json:lca` and `all_families_2026-09-06.json`. No new carbon, silica or zeolite factors were supplied. Low coverage cannot support an overall environmental ranking. |
| Uncosted operations and process energy | There is no new price for autoclaves, reduction furnaces, centrifugation, sieving, coaters, freeze-drying, CVD or ALD. Per-route omissions and modelled rates remain explicit. Electrode coating steps have no inferred process-energy model. | `docs/audit/manufacturing-catalog-2026-09-06.md`, `docs/paper/manufacturing_costs_2026-09-06.json`, `backend/data/process_energy_factors.json`; omitted rates make route prices partial screening estimates, not complete quotations. |

The Table 6.2 residuals test reproduction of the published method. They do not bound the error of a new catalyst's source prices, throughput, chemistry or omitted operations. The 7% Ni and 2% FCC acceptance tolerances are software regression limits, not predictive accuracy claims.

## Research Extensions Already Implemented

- Distinct `Thermocatalyst` and `Electrocatalyst` workflows
- Source-linked material normalization in the result screen
- Monte Carlo uncertainty analysis
- ChemPPI / CEPCI escalation
- Electrode stack costing for PEMFC / electrolyzer style workflows

## Research Extensions Not Yet Implemented

The repository does **not** currently claim the following as complete:

- chemical structure editor integration such as Ketcher or JSME
- RDKit or ChemPy-backed structure / stoichiometry validation
- SCScore-style synthesis complexity penalties
- explicit catalyst deactivation kinetics
- regeneration-cycle and reuse loop economics

Those are valid next-stage research features, but they remain roadmap items until the engine and tests support them directly.
