# Free support-history extension — 2026-09-07

The user requested multiple months of free support observations. The existing keyless collector queried April and May2026 once per definition, spacing requests by twelve seconds. All22 responses were HTTP200; nineteen passed the unchanged strict weight/value/filter validation and three were rejected. No retry,429,account,key,paid endpoint or purchase was used. The date in this filename is Asia/Seoul; retained collection timestamps use UTC.

```bash
python scripts/fetch_support_history.py --start 2026-04 --end 2026-05 --out support-history-apr-may-2026-09-07.json
```

All outcomes and full small-record response evidence are retained in [the raw acquisition snapshot](comtrade-preview-april-may-2026-09-07.json). The [previous acquisition evidence](free-comtrade-evidence-2026-09-07.md) records the exact public API, query scope and verified UN Comtrade use policy. Attribution and source-data rights remain with UN Comtrade; COMET's code license is unchanged.

| Observation | Decision |
|---|---|
| April/May non-corundum alumina | Accepted and equal to the two previously stored points; deduplicated |
| April/May artificial corundum | Accepted; these months have non-estimated net weight, unlike the rejected June response |
| April silicon dioxide | Rejected: estimated net weight |
| April carbon black | Rejected: estimated net weight |
| May carbon black | Rejected: missing net weight |
| Remaining April/May observations | Accepted positive finite value/weight, exact requested import aggregate |

The collector exits1 because of data-quality rejections. Neither that status nor HTTP200 is treated as proof that a price is valid. No quantity estimate or zero price fills a missing observation. Previous June corundum and carbon-black rejections remain unadopted.

The merge adds **17 unique observations** to the previous11. The shipped history contains **10 series and28 observations**: eight series have April–June, silicon dioxide has May–June, and artificial corundum has April–May. Carbon black has no accepted observations. Existing library and benchmark mappings are unchanged; artificial corundum and cerium compounds do not gain a new direct material mapping merely because observations exist.

Every old point is preserved exactly. The raw previous9-series snapshot is frozen at `docs/paper/free-data-2026-09-07/support_history_2026-09-07.json`. The new shipped file records both input snapshot hashes and can be rebuilt from the union of accepted, deduplicated symbol/month responses. All values and merge checks are in [support-history-extension-2026-09-07.json](../audit/support-history-extension-2026-09-07.json).

| Input/output | SHA-256 |
|---|---|
| Previous9-series snapshot | `e6ce5251b911026a80d94c516ac919150f711417fdc660ba0d5fb2f58020dfe3` |
| New22-response acquisition | `a677ac16014ec9f69bf2de3c6d962b07150f74d9c654c7822c9fca047333d19b` |
| Merged10-series shipped history | `b6ac7e3f3309d73c8cfe6c0a61547c576e68d522d5f25e94312a6d992a01fa29` |

The existing `latest_common_month` intersection returns **2026-05** when all retained support series and the frozen metal history are included. Alpha alumina has no usable June observation, so choosing June for that combined dataset would silently omit a series. The method has not been changed to force a later month. This is the common month of these frozen inputs, not a claim that no later data have been published anywhere. Valid June observations are retained in the raw history but excluded from the common May paper basis. April lacks an acceptable silica point; the provided combined history therefore has only one all-series common month. The short support history does not establish a long-run volatility model and is held at the stated baseline in the historical metal replay.
