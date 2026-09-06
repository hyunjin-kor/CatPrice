# External cost validation audit — 7 September 2026

**Partial completion:** independently sourced market evidence was collected, but no fully matched observed catalyst manufacturing-cost case was established. Ten candidate cases include three verified public 1 g catalog offers and one signed industrial contract price schedule. There are **zero matched full-cost cases**, so empirical MAPE is `null`, not zero.

The [source report](../sources/external-cost-evidence-2026-09-07.md) explains each case and its exclusions. The [registry](../sources/external-cost-evidence-2026-09-07.json) records the acquisition evidence. No model formula, library price, LCA coefficient or original CatCost input was changed for this work.

```powershell
python scripts/reproduce_external_cost_cases.py --out docs/audit/external-cost-validation-2026-09-07.json
python -m pytest backend/tests/test_external_cost_cases.py -q
python -m ruff check scripts/reproduce_external_cost_cases.py backend/tests/test_external_cost_cases.py
```

Observed local results: **11 tests passed in 0.29 s**; Ruff passed. The [generated audit JSON](external-cost-validation-2026-09-07.json) includes the exact registry SHA-256. The unit checks reject missing currency or unverified selected packs, non-finite/non-positive pack mass, omitted comparison dimensions, unregistered sources and attempts to promote a newly matched case without an independent COMET calculation.

| Measurement | Result | Interpretation |
|---|---:|---|
| Screened primary-source cases | 10 | Bounded search; not an exhaustive global inventory |
| Public retail pack prices | 3 | Pt 5%, Pt 10%, Ni 20%; pack selection verified in real Chrome |
| Signed industrial contract schedules | 1 | AXENS STR 111; June 2007 base price, not a settled invoice |
| Matched full manufacturing-cost observations | 0 | Exact recipe/grade, campaign scale, date or boundary remains missing |
| Empirical MAPE | Not established (`null`) | No comparison was manufactured by assuming missing inputs |
| Paid acquisitions / purchases performed | 0 / 0 | Free public source reading only |

The three retail prices normalize arithmetically to USD 129,000/kg, 140,000/kg and 145,000/kg. These figures describe **one-gram retail packs**, not kilogram orders or industrial production cost. They are not compared with a COMET large-batch selling price. The commercial contract's EUR 16.50/kg base is retained in its original currency and historical index basis, without an invented 2026 conversion.

The useful outcome is a reproducible boundary between observed offers, contract terms, supplier inputs and modeled forecasts. Independent manufacturing prediction accuracy remains an open evidence requirement. No author or supplier message was sent, and no unpaid source was replaced by a paid alternative.
