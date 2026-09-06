# Free-data update goal — 2026-09-06

User authorization: use the goal feature to update COMET, with zero data expenditure. No purchases, paid subscriptions or billable API calls. Started from `f4f9bdd` on the isolated `autonomous/2026-09-06` worktree; continuing the existing open PR112. Previous application baseline: 636 tests passed, frontend/desktop1.4.0/Table6.2 verified. The initial frozen paper run remains unchanged.

| ID | Status | Evidence / acceptance | Commit |
|---|---|---|---|
| D01 | Complete | Active goal and free-only policy confirmed; persisted local state initialized | `601ce9b` |
| D02 | Complete | Free Comtrade responses/terms; 8 LCA sources, 4 exact pairs; 8 benchmark candidates; reproducible small-scale422 | Current validated batch |
| D03 | Partial | Implementation and 3 alumina observations verified; other10 definitions blocked by provider429, no retry | Current validated batch |
| D04 | Complete | B01–B11 applied; 18 focused tests; same-price full analysis JSON byte-identical. Four LCA pairs documented with no generic aliases | Tested update batch |
| D05 | Complete | Before422; after5 browser scenarios pass, cold20t outputs unchanged; Node10 and focused backend6 pass | Current validated batch |
| D06 | Complete | June combined basis; 6 figures; 37 code/81 data/27 output hashes agree; generated replay command produces identical scientific JSON | Tested update batch |
| D07 | In progress | 679 pytest passed in386.99s; new module coverage93%; frontend/Node/ruff/desktop passed; PR CI pending | Local verification complete |

## Scope and decisions

- Search the highest-value free evidence first: support prices, carbon/silica/zeolite LCA, and source fidelity for CO2-to-methanol and hydrogen-evolution candidates.
- A generic material label does not authorize substitution of a grade-specific or synthesis-specific factor. GWP and CED must each have evidence; missing metrics stay missing.
- Free API responses must be checked for requested reporter, flow, period, HS code, aggregation level, weight/value validity and completeness. No paid endpoint or authentication change is authorized.
- New results will use a separate run directory so the initial manuscript snapshots and hashes remain reviewable. No tag, release, merge, deployment or license change.
- Runtime goal state is local under `.autonomy`; this audit is the committed human-readable record.

## Research and implementation evidence

- Free support acquisition and exact retained responses: `docs/sources/free-comtrade-evidence-2026-09-06.md`; `backend/data/support_price_history.json`. April/May/June alumina0.5782/0.6728/0.5558USD/kg; July missing. HTTP429 stopped the collection. No key or paid endpoint used.
- LCA: `docs/sources/free-lca-evidence-2026-09-06.md` and JSON. Four source-specific GWP/CED pairs retained in the evidence register; no generic carbon/silica/zeolite mapping. Original LCA factors and coverage remain unchanged.
- Two-family source audit: `docs/sources/free-benchmark-validation-2026-09-06.md`. Source identity, actual reaction, nominal versus measured loading, precursor molar versus mass ratio, and laboratory versus assembly assumptions are distinguished.
- Startup regression: `docs/audit/free-data-stability-2026-09-06.md`, before/after JSON and8 screenshots. Original uncaptured first-run422 remains unidentified; the newly reproduced delayed scale-fitting422 has concrete request/response evidence.
- Independent snapshot review found boolean quantities, forged request status/source and dropped declared-series integrity gaps. All three were corrected with regression coverage before integration.
- Focused checks:37 snapshot/pipeline tests pass; frontend784translation calls/825Korean keys/0missing, lint/build pass, Node10pass. Full-suite and paper/desktop verification follow.

## Controlled support-price effect

`python scripts/audit_free_support_impact.py --history docs/paper/price_history_2026-09-06.json --support-history backend/data/support_price_history.json --out docs/audit/free-data-impact-2026-09-06.json` runs both sides with identical June metal prices, compositions, score weights, engine and LCA factors.23of116candidate costs across15families change, from−0.0011%to−8.6778%. Two profile winners change: ammonia-cracking/performance-zero changes Co-MgO-La2O3→Ni/alumina; CO2-methanation/balanced changes Ni/ceria→Ni/alumina. Price-evidence scores also respond to changed source/cost shares, so these are not claimed to be price-only composite-score effects. All LCA values and coverage are identical. Full per-candidate before/after prices and both price maps are in the JSON.

Actual UI testing additionally found that a reference support override inherited a live-price banner and the original2024library quote metadata. The override metadata/display is being corrected and rechecked; the price itself was already correct at0.5558USD/kg.

## Final local verification

- Full backend: **679 passed in 386.99 seconds**,43 more than the previous636-test baseline.
- New strict snapshot module: **93% coverage**,33 focused tests in0.93s, using the already-existing temporary coverage venv. No dependency was added.
- Ruff across backend/scripts passed. Frontend check:i18n/lint/build and Node10 passed;787 translation calls,829 Korean keys, no missing/untranslated UI labels within the scanner scope.
- Windows package1.4.0 built and desktop smoke passed in204.08s combined: one window, prices200, calculate200. No optional API keys were configured.
- Five real-browser loading scenarios passed after support integration. The reference evidence panel shows observation month2026-06 and the verified monthly request URL, with the original2024library price/link separately identified. Display fixes do not change computed results.
- Table6.2 remains Pt27.3695→27.37 USD/lb, Ni19.2206(−6.65%), FCC2.4380(+1.16%) with footnote-b67short tons/day. No method formula or uncosted-process rate changed.
- Separate paper run: `docs/paper/free-data-2026-09-06/`. Seed20260906, June2026,30families/116candidates,90historical states. The generated replay command was actually executed; reference/live all-family JSON and paper summary were byte-identical. Raw metal/support hashes and all37code/81data/27output hashes verified.
- Detailed evidence: `docs/audit/free-data-checks-2026-09-06.json`, `free-data-replay-check-2026-09-06.json`, source audits and browser records.

The original July manuscript, SI, numerical artifacts and their snapshot bytes remain unchanged. The June run is an explicit supplementary analysis; a change in publication month is separated from the controlled support-only comparison.
