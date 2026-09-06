# T09–T10 source selection and support linkage — 2026-09-06

## T09 — live source selection

The prepared policy selects Johnson Matthey before Yahoo for Pt/Pd and Westmetall before Yahoo for Cu/Al. Copper and aluminium use the verified Westmetall `LME_Cu_cash` and `LME_Al_cash` tables. The existing per-tonne-to-pound conversion remains unchanged. Yahoo-only polls preserve a primary source already selected by a full refresh; a subsequent full refresh can select Yahoo when that primary feed fails. The frontend polling interval is tracked in the central run log.

This is the exact fallback order in the current selector, including unchanged metal-specific behavior. A starred provider requires an existing configured key and was not contacted by this audit.

| Metals | First available source, in priority order |
| --- | --- |
| Pt, Pd | Johnson Matthey → Yahoo Finance → Metals.Dev* → Kitco → MetalpriceAPI* → indexed CatCost anchor |
| Cu, Al | Westmetall → Yahoo Finance → Metals.Dev* → indexed CatCost anchor |
| Au, Ag | Yahoo Finance → Metals.Dev* → Kitco → MetalpriceAPI* → indexed CatCost anchor |
| Rh | Kitco → Metals.Dev* → Johnson Matthey → indexed CatCost anchor |
| Ru, Ir | Johnson Matthey → Metals.Dev* → indexed CatCost anchor |
| Ni | Metals.Dev* → Markets Insider → Westmetall → indexed CatCost anchor |
| Zn, Sn | Westmetall → USGS annual anchor |
| Co, Mo, W | Metals.Dev* → USGS annual anchor |
| V, Re | USGS annual anchor |
| Fe | Indexed CatCost anchor |

Read-only public collection returned 6 Yahoo, 5 Johnson Matthey, 5 Westmetall, 5 Kitco and 1 Markets Insider quotes. [The complete observed responses](t09-live-source-check-2026-09-06.json) preserve source timestamps. Replaying those observations through the current `fetch_all_prices()` selector yields [the new policy live snapshot](t09-live-basis-2026-09-06.json): 18 metals, comprising 12 live selections and six unchanged anchors. It records the response-file SHA-256. No DB writes or key-based requests were made. The original paper live snapshot remains available as earlier evidence.

| Metal | Previous selector | Prepared selector | Unit | Reason |
| --- | ---: | ---: | --- | --- |
| Pt | 1,826.0 | 1,820.0 | USD/troy oz | Yahoo futures screen → Johnson Matthey supplier board |
| Pd | 1,403.9 | 1,418.0 | USD/troy oz | Yahoo futures screen → Johnson Matthey supplier board |
| Cu | 6.6825 | 6.5131 | USD/lb | Yahoo futures screen → Westmetall LME cash settlement |
| Al | 1.5754 | 1.4982 | USD/lb | Yahoo futures screen → Westmetall LME cash settlement |

These are simultaneous source-selection comparisons from the same collection, not measured changes through time. The Westmetall parser currently timestamps collection time, while Johnson Matthey and Yahoo retain source quote times; that pre-existing convention is preserved and noted in the snapshot. No formula, recovery assumption, hourly equipment rate, or anchor price changed.

Validation: `python -m pytest backend/tests/test_live_source_priority.py backend/tests/test_price_fetcher.py backend/tests/test_price_scheduler_guard.py -q` → **27 passed in 0.44 s**. Ruff passed on the changed fetcher, scheduler and test module.

## T10 — explicit reference-series mapping

**38 of 83 support component entries** across 17 benchmark JSON files now carry `pricing.reference_series`. The added fields do not alter their original fixed prices, source notes, or compositions. A matching stored reference quote overrides the fixed price only for `basis="reference"`, with an explicit USD/kg or USD/lb unit; missing series and incompatible units retain the fixed value. Live calculations retain the original fixed prices. Evidence labels identify the reference override as an all-grade import unit value, not a catalyst-grade quotation.

| Exact support name | Series | Linked component entries |
| --- | --- | ---: |
| Al2O3 | HS281820 | 23 |
| MgO | HS251990 | 4 |
| TiO2 | HS282300 | 4 |
| SiO2 | HS281122 | 4 |
| Activated carbon | HS380210 | 2 |
| Cr2O3 | HS281990 | 1 |

All mappings use existing entries in `backend/data/support_series.json`. Even these pure chemical identities remain broad trade proxies, with all grades and partners combined; they do not preserve a specialty catalyst-grade premium. No new HS codes or support time-series observations were added. The current frozen paper reference basis contains no HS observations, so this linkage alone does not change that paper's numeric results.

The remaining **45 entries are unlinked**. The exhaustive family/candidate/support mapping and fixed fallback values are recorded in [the support audit JSON](t10-support-series-2026-09-06.json). The following reasons apply to every unlinked name:

| Support names | Conservative reason for leaving unlinked |
| --- | --- |
| Carbon; N-doped carbon; Carbon nanotubes; C2N nitrogenated framework | Generic, graphitized, doped or structured carbon cannot be assigned to activated-carbon or carbon-black HS series without a verified material match. |
| alpha-Al2O3 | The alpha phase does not identify artificial corundum versus calcined alumina production; the existing note compares both trade categories. |
| CeO2 | The available cerium-compound series combines oxide, carbonate and chloride; its catalog note explicitly keeps it beside the oxide anchor. |
| MnOx | Oxidation state is not uniquely specified; do not silently turn the component into pure MnO2. |
| Zeolite; SSZ-13 zeolite; H-ZSM-5; Mesoporous zeolite (silicalite-1) | Generic origin or templated catalyst-grade formulation is not identified by the broad synthetic-aluminosilicate unit value; existing fixed proxies are preserved. |
| SiO2 (mesoporous); TiO2 (anatase) | The explicitly selected specialty grade has a premium that a generic trade series does not resolve. |
| Mg-Al layered double hydroxide; Al-Mg composite oxide; SiO2-Al2O3; Calcium aluminate carrier | Mixed materials cannot be assigned a single pure-component series. |
| CaFH hydride-fluoride support; Na2Ti3O7; ZrO2; In2O3; Bi; ZnO; MOF host; MOF host (ED-MIL-101) | No unambiguous matching series exists in the current eleven-entry support catalog. |

## T10 numerical and ranking regression

The test uses **synthetic regression inputs, not market observations**: all metals are fixed at USD 10/lb, then only HS281820 is introduced at USD 25/kg. This deliberately large support stress makes a rank change observable. It is not a Comtrade observation, forecast, or paper input. The complete 90 family/profile comparisons and all candidate costs/scores are in the support audit JSON. Under that fixture, 25 rankings and 12 first-place selections change; those counts describe test behavior only.

For the CO2-methanation family, the alumina-supported Ni candidate moves from USD **5.8273/lb** to **17.9535/lb** while the unchanged ceria candidate retains its cost. The alumina support moves from its fixed proxy to the normalized USD 25/kg fixture; the original Step Method processes that new material input. All three named profiles place Ni/alumina last after the change. Balanced and cost-first retain the layered-titanate route ahead of the MnOx route, while evidence-first reverses those two. This reflects both the changed cost spread used in economics scoring and the contribution-weighted source-evidence score. Unit conversion, absent-series fallback, incompatible-unit fallback, and live/reference separation have dedicated assertions.

Validation: `python -m pytest backend/tests/test_benchmark_support_series.py backend/tests/test_reference_basis.py -q` → **20 passed in 0.66 s**. Ruff passed. The provenance audit was rerun with `--reuse-checks` to update the modified JSON hashes; all 317 DOI registrations and 467 URL outcomes retain the recorded checks.

## Table 6.2 regression

`python scripts/reproduce_catcost_table62.py` reproduced the unchanged outputs:

| Case | COMET USD/lb | Published USD/lb | Residual |
| --- | ---: | ---: | ---: |
| Pt/C | 27.3695 | 27.37 | Matches to the cent |
| Ni/Al2O3 | 19.2206 | 20.59 | −6.65% |
| FCC with footnote-b 67 t/day | 2.4380 | 2.41 | +1.16% |

The script also prints the nominal FCC 150 t/day result (1.6090 USD/lb, −33.24%) as the documented comparison; the 67 t/day case is the acceptance basis. No methodological result changed in T09 or T10.
