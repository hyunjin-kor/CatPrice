# Free-data update goal — 2026-09-06

User authorization: use the goal feature to update COMET, with zero data expenditure. No purchases, paid subscriptions or billable API calls. Started from `f4f9bdd` on the isolated `autonomous/2026-09-06` worktree; continuing the existing open PR112. Previous application baseline: 636 tests passed, frontend/desktop1.4.0/Table6.2 verified. The initial frozen paper run remains unchanged.

| ID | Status | Evidence / acceptance | Commit |
|---|---|---|---|
| D01 | Complete | Active goal and free-only policy confirmed; persisted local state initialized | Initial goal log |
| D02 | In progress | Free Comtrade/LCA sources, two benchmark families and startup422 diagnosis | — |
| D03 | Pending | Validated support price acquisition, complete snapshots and pipeline integration | — |
| D04 | Pending | Exact-source data/LCA corrections; explicit gaps for unsupported grades or metrics | — |
| D05 | Pending | Demonstrated startup defect regression/fix or bounded non-reproduction evidence | — |
| D06 | Pending | Table6.2, separate paper rerun and quantified cost/coverage/ranking impact | — |
| D07 | Pending | Full gates, real UI, relevant desktop smoke, final report and PR CI | — |

## Scope and decisions

- Search the highest-value free evidence first: support prices, carbon/silica/zeolite LCA, and source fidelity for CO2-to-methanol and hydrogen-evolution candidates.
- A generic material label does not authorize substitution of a grade-specific or synthesis-specific factor. GWP and CED must each have evidence; missing metrics stay missing.
- Free API responses must be checked for requested reporter, flow, period, HS code, aggregation level, weight/value validity and completeness. No paid endpoint or authentication change is authorized.
- New results will use a separate run directory so the initial manuscript snapshots and hashes remain reviewable. No tag, release, merge, deployment or license change.
- Runtime goal state is local under `.autonomy`; this audit is the committed human-readable record.
