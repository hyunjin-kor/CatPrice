# T02 offline performance baseline

Command: `python scripts/measure_autonomous_baseline.py`.

| Measurement | Wall time |
|---|---:|
| `/api/calculate`, 20 requests, median after one warmup | 0.00415135 s |
| `/api/uncertainty`, 1,000 simulations | 0.300885 s |
| `/api/uncertainty`, 10,000 simulations | 2.8119324 s |
| `scripts/run_all_families.py`, 30 families / 116 candidates | 1.6968663 s |

The JSON alongside this note records every calculation timing, the full input,
Monte Carlo summaries, interpreter/platform, archived history SHA-256, and the
family script's command output. Timings use in-process FastAPI TestClient and a
temporary SQLite database. Startup collection is replaced with the same offline
stub as `backend/tests/conftest.py`. They include API serialization but exclude
TCP/browser/network latency. Timing measurements are local observations, not
cross-machine performance guarantees. Root's baseline test/build processes may
have been running concurrently.

No committed July 2026 IMF reference snapshot was present. The committed
`docs/paper/price_history_2026-09-02.json` contains Johnson Matthey, Yahoo Finance,
and Westmetall history, including partial September observations. For this timing
fixture only, observations were averaged by calendar month, September was
excluded, and `latest_common_month` selected **2026-08**. The source labels were
preserved. This proxy is not claimed as the paper's IMF reference basis.

The initial measurement runner required one local correction: disposing the
SQLite engine before TemporaryDirectory cleanup on Windows. No application code
was changed during the baseline measurements. The corrected run above also
explicitly seeded the temporary reference table from the frozen monthly inputs.

Before T04 the uncertainty endpoint hardcoded `seed=42`, despite the core already
accepting optional seeds. The timing payload explicitly requests 42 so the later
performance comparison can use exactly the same draws after that defect is fixed.

`docs/gpt-handoff.md` was absent from the starting checkout. No contents were
inferred from the missing file.
