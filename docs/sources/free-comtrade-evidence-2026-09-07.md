# Free Comtrade resumption evidence — 2026-09-07

This date uses Asia/Seoul; the acquisition occurred on September6 UTC. The user's explicit resume request reopened the partially collected support task. No account, key, subscription, purchase or billable endpoint was used.

The [official API guide](https://uncomtrade.org/docs/un-comtrade-api/) was rechecked and identifies the public preview as keyless access with record and rate limits. The [use and re-dissemination policy](https://uncomtrade.org/docs/policy-on-use-and-re-dissemination/) returned HTTP200 at `2026-09-06T15:25:55.018628+00:00`. It permits free analytical use and small-record redistribution with attribution; this eleven-row source evidence is retained for the derived unit-value analysis. UN Comtrade retains rights to the source data; COMET's code license does not relicense it. Full papers, restricted inventories and paid datasets were not acquired or redistributed.

## Bounded acquisition and quality decisions

```bash
python scripts/fetch_support_history.py --start 2026-06 --end 2026-06 --out support-history-resume-2026-09-07.json
```

The existing collector queried each of eleven definitions once, with twelve seconds between requests and no retries. All eleven HTTP responses were 200; nine passed the unchanged validation rules. The collector exited 1 because two responses failed data validation, not because HTTP access failed. No 429 occurred in this resumption. No July/August publication claim is made: June was the previously verified shared month, selected to complete the missing cross-section with a bounded number of requests.

Endpoint: `https://comtradeapi.un.org/public/v1/preview/C/M/HS`. Filters are United States reporter842, importsM, world partner0, partner2=0, customsC00, transport0 and one exact six-digit HS code for period202606. The validator requires one exact aggregate row and positive, finite, non-estimated net weight. Accepted price = `round(primaryValue / netWgt, 4)` in USD/kg. All grades and partners are combined; these are bulk import indicators, not catalyst-grade quotations.

| HS | Material scope | June2026 USD/kg | Decision |
|---|---|---:|---|
| 281820 | Non-corundum alumina | 0.5558 | Accepted; identical to previous June observation |
| 281810 | Artificial corundum | — | Rejected: `isNetWgtEstimated=true` |
| 282300 | Titanium oxides | 3.3905 | Accepted |
| 281122 | Silicon dioxide, combined grades | 2.1895 | Accepted |
| 380210 | Activated carbon, combined grades | 3.7154 | Accepted |
| 280300 | Carbon black | — | Rejected: `netWgt=null`; `qty=0` is not a substitute |
| 284210 | Synthetic zeolites and aluminosilicates | 4.5579 | Accepted; broad generic proxy only |
| 251990 | Magnesia, predominantly refractory grades | 0.6434 | Accepted |
| 284610 | Cerium compounds, mixed chemical forms | 17.6330 | Accepted market series; remains unlinked to CeO2 prices |
| 282010 | Manganese dioxide, combined grades | 2.7147 | Accepted |
| 281990 | Chromium oxides and hydroxides | 4.5274 | Accepted; broader than pure Cr2O3 |

The rejected corundum response has net weight14253233.97 and value13951027.0 but both quantity and net weight are flagged as estimated. The rejected carbon-black response has value32139286.0 but no net weight. Neither response becomes an accepted quote, a zero price or an inferred value. Raw records retain the literal collector status `unverified` and the validator's reason.

## Frozen evidence and integration

- All eleven resumed responses: [`comtrade-preview-2026-09-07.json`](comtrade-preview-2026-09-07.json), SHA-256 `fb14f7fe7203dbe34e32cf544f46d2f500195ed58c363716755eeb9d69149cfc`.
- Previous three observations and five request outcomes: [`support_history_2026-09-06.json`](../paper/free-data-2026-09-06/support_history_2026-09-06.json), SHA-256 `4d0dccdf351ea3ecbebca9233da5cd6a97d5a790ecab313749fcd9b6c8af5896`.
- Merged shipped snapshot: `backend/data/support_price_history.json`, SHA-256 `e6ce5251b911026a80d94c516ac919150f711417fdc660ba0d5fb2f58020dfe3`; its frozen paper copy is [`support_history_2026-09-07.json`](../paper/free-data-2026-09-07/support_history_2026-09-07.json).

The merge retains the previous April–June alumina points and all previous request outcomes, verifies the re-queried June point is identical, and adds only eight newly accepted series. It records both input snapshot hashes. The result is nine series and eleven observations; there is no duplicate symbol/month. `validate_support_snapshot` rebuilds every accepted price from retained HTTP evidence. Existing grade notes, library mappings and benchmark `reference_series` links are unchanged. In particular, cerium compounds and artificial corundum do not acquire new material links, and synthetic-zeolite data are not applied to specific ZSM-5/SSZ-13/USY candidates.

The shipped seed regression now checks every available series, repeat-start idempotence and exclusion from the live basis. Independent review confirmed the exact union of accepted old/new points and all three snapshot hashes. Numerical impact, actual browser evidence, full checks and the separate dated paper replay are recorded in [`free-data-resume-2026-09-07.md`](../audit/free-data-resume-2026-09-07.md).
