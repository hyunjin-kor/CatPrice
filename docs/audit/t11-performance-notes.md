# T11 performance verification — 2026-09-06

The optimization reuses parsed ChemPPI/CEPCI files until their modification time or size changes, batches the existing five Monte Carlo random factors in the same row-major order, and copies only the flat fields that Monte Carlo changes. Cost formulas, intermediate rounding, scale classification, and failed-sample behavior remain unchanged.

| Measurement | T02 baseline (s) | T11 before (s) | T11 after (s) | T11 speed ratio |
|---|---:|---:|---:|---:|
| `/api/calculate`, 20-request median | 0.004151 | 0.003823 | 0.003078 | 1.24× |
| `/api/uncertainty`, 1,000 samples | 0.300885 | 0.258440 | 0.062746 | 4.12× |
| `/api/uncertainty`, 10,000 samples | 2.811932 | 2.411898 | 0.418777 | 5.76× |
| `run_all_families.py` | 1.696866 | 1.396452 | 1.172229 | 1.19× |

Source files: `t02-performance-baseline.json`, `t11-performance-before.json`, `t11-performance-final.json`. The intermediate `t11-performance-after.json` is retained as audit evidence; the final run also converts each batched factor row back to Python floats to preserve scalar arithmetic. Each run uses `scripts/measure_autonomous_baseline.py`, one warm-up calculation, in-process FastAPI TestClient, a new temporary SQLite DB, startup collection disabled, and the same archived price inputs. Timings include response serialization and Python startup for the family script. These are local measurements, not latency guarantees; the few-millisecond calculate change is less informative than the Monte Carlo change.

The T11 before/after requests both use seed 42. Their complete Monte Carlo result JSONs are **exactly equal** at both 1,000 and 10,000 samples, which is stronger evidence than merely similar distributions. The T02 API did not yet accept an explicit seed, so its random result values are not the equivalence comparison. The calculation selling price is also unchanged. Family counts remain 30 and 116 candidates.

`backend/tests/test_performance_equivalence.py` checks every batched draw against the scalar RNG sequence, verifies that the input context remains unchanged, and verifies that changed index files invalidate cached results. The focused equivalence/escalation/reproducibility run passed 18 tests. `scripts/reproduce_catcost_table62.py --json docs/audit/t11-table62.json` retained Pt/C 27.3695 USD/lb, Ni/Al2O3 19.2206 USD/lb, and FCC at the published effective rate 2.4380 USD/lb (+1.16%).

No dependencies were added to the project, and no new cost formula was introduced.
