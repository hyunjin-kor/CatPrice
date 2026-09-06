# T13 backend coverage — 2026-09-06

The clean final coverage run passed 625 tests in 347.52 seconds. `backend/core` statement coverage is 1600/1707 (93.7317%, displayed as 94%); every module exceeds 80%. The lowest is `cost_engine.py` at 89%. The initial complete run passed 605 tests in 370.75 seconds and measured 82% overall, with `price_fetcher.py` the only module below 80% (48%).

Twenty focused provider tests use `httpx.MockTransport` or patched provider functions. They exercise unit conversions, missing credentials, malformed responses, request parameters, monthly alignment, timeouts, and partial or total provider failures. Synthetic test prices never enter the application data or paper snapshots. The clean final report measures `price_fetcher.py` at 90% and `uncertainty.py` at 94%.

Neither available system Python had the coverage plugin. A temporary Python 3.14 virtual environment with system site packages was created at `%TEMP%/comet-coverage-20260906`; pytest-cov 7.1.0 and coverage 7.16.0 were installed there. No repository dependency or lock file was changed for coverage.

The final command was run with the temporary environment's Python and a separate `COVERAGE_FILE`:

```powershell
python -m pytest backend/tests -q --cov=backend/core --cov-report=json:docs/audit/coverage-2026-09-06.json --cov-report=term-missing
```

Evidence: `t13-coverage-before.json`, `t13-coverage-before.log`, `coverage-2026-09-06.json`, and `t13-coverage-final.log`. The live-snapshot classification tests were added after the clean run started; their separate 16-test pipeline/classification run passed, and the final standard pytest gate covers the combined repository state.
