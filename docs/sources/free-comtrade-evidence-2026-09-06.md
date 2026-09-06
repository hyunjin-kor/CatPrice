# Free Comtrade support evidence — 2026-09-06

No account, key, purchase, subscription or billable endpoint was used. The [official API guide](https://uncomtrade.org/docs/un-comtrade-api/) identifies `public/v1/preview` as keyless access with record/rate limits. The guide was retrieved successfully earlier in the session and via search; a later web-tool fetch timed out. Direct HTTP200 confirmed the [use and re-dissemination policy](https://uncomtrade.org/docs/policy-on-use-and-re-dissemination/) on September6. It requires UN Comtrade attribution and distinguishes free small-record/analytical use from paid redistribution. The small derived unit-value table and its three supporting trade rows are retained as free analytical evidence; the UN retains rights to its source data. COMET's code license does not relicense these data.

## Actual request results

Endpoint: `https://comtradeapi.un.org/public/v1/preview/C/M/HS`. Reporter842 (United States), import flowM, partner0/world, second partner0, customsC00, transport0, exact HS281820. Price = primary customs value in USD / net weight in kg; all grades and partners are combined. These values are bulk import indicators, not quotations for catalyst-grade gamma alumina.

| Month | HTTP | Observation | USD/kg |
|---|---|---|---:|
| 2026-04 | 200 | Accepted; positive, finite, non-estimated net weight | 0.5782 |
| 2026-05 | 200 | Accepted; positive, finite, non-estimated net weight | 0.6728 |
| 2026-06 | 200 | Accepted; positive, finite, non-estimated net weight | 0.5558 |
| 2026-07 | 200 | count0; no observation | — |
| HS281810, 2026-04 | 429 | Collection stopped immediately; no retry | — |

The other ten support definitions have no newly accepted observations. July absence is verified for HS281820 only; it is not a claim about every support. An exploratory twelve-period request returned HTTP400, “Maximum number of periods for preview is 1”; the production collector therefore uses one month per request. The initial collection used1.2-second spacing and hit the rate limit; the committed script uses12-second spacing, still stops on429 and makes no promise of quota availability. Future use can resume manually after the provider permits access; no paid fallback exists in this script.

Raw successful responses, URLs, query filters and all five acquisition outcomes are in `backend/data/support_price_history.json`. SHA-256: `4d0dccdf351ea3ecbebca9233da5cd6a97d5a790ecab313749fcd9b6c8af5896`. The retained `isAggregate=true` refers to the requested world/all-transport aggregate; preview returns null HS-level descriptors, so exact six-digit `cmdCode` is checked and a contradictory level is rejected. Neither estimated weights nor duplicate rows are accepted. Boolean/non-finite quantities, wrong filters, mismatched counts, missing response evidence, foreign endpoints and forged HTTP statuses are rejected. Source labels are rebuilt from the checked catalog rather than trusted from a supplied file.

## Integration and limits

The app seeds these verified historical reference rows offline at startup, deduplicated by symbol/month. Live support prices remain the library quotes. The paper's explicit `--support-history` option validates the raw response evidence again, includes support dates in `latest_common_month` and records a separate snapshot hash. It does not interpolate missing months. The current combined basis is June2026; the original July manuscript inputs are retained unchanged. In the long metal replay the short support history is held at baseline and identified as incomplete, so three months do not become an invented multiyear price history.

Verification: `python -m pytest backend/tests/test_comtrade_snapshot.py backend/tests/test_reproduce_paper.py backend/tests/test_reference_basis.py -q`. Full run evidence and numerical effects are recorded in `docs/audit/free-data-update-2026-09-06.md`.
