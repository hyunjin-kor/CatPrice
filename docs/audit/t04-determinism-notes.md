# T04 determinism verification

`python -m pytest backend/tests/test_reproducibility.py backend/tests/test_decision_engine_prices.py -q`
passed **7 tests in 4.77 s**. Coverage includes legacy and structured uncertainty
requests, same-seed equality, different-seed means, the omitted-seed default,
negative-seed validation, deliberately tied candidate scores/costs in reversed
catalog order, and two complete 30-family subprocess runs whose output bytes
must match.

`/api/uncertainty` previously ignored client seeds and always passed 42. It now
passes the optional request seed; omission or null means nondeterministic draws,
as specified by decision J. This changes unseeded Monte Carlo summaries, not the
sampling distributions or cost equations. Benchmark ties now use ascending
candidate slug after descending score and ascending cost, independent of catalog
row order. The same tie break is used on the paper weight-simplex grid.

For frozen input, `run_all_families.py` writes `generated_at: null` unless
`SOURCE_DATE_EPOCH` explicitly supplies a deterministic timestamp. Its source
identifier is a filename rather than a machine-specific absolute directory.
`--basis-type reference` is forwarded to component evaluation; `--price-basis`
continues to identify the input JSON path.

`python scripts/reproduce_catcost_table62.py` was run after these changes:

| Case | COMET $/lb | Published $/lb | Residual |
|---|---:|---:|---:|
| Pt/C | 27.3695 | 27.37 | rounds to 0.00% |
| Ni/Al2O3 | 19.2206 | 20.59 | -6.65% |
| FCC, footnote-b 67 t/day | 2.4380 | 2.41 | +1.16% |

The script also reports the intentionally different nominal FCC throughput
result (1.6090 $/lb at 150 t/day); the acceptance comparison uses footnote b.
No CatCost cost formula or material input changed in T04.
