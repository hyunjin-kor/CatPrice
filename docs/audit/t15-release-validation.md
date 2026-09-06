# v1.4.0 release preparation validation

The four version authorities and both lockfile headers are 1.4.0. No tag, release, deposit or deployment was created.

The first `npm run build` succeeded in 149.62 s, but the packaged smoke timed out before a backend or launcher log appeared. Inspection found only four package manifests in the new app archive versus eighteen in the baseline archive. The isolated worktree's root `node_modules` was a junction to the original checkout; the packager omitted transitive runtime dependencies through that link.

The junction was preserved under ignored `_local/node_modules-junction`. `npm ci` installed the unchanged lockfile into the isolated directory (310 packages, audit: zero vulnerabilities). No manifest dependency was added. The second full build packaged eighteen manifests and completed in 156.36 s. `npm run smoke:desktop` passed: version 1.4.0, one main window, prices HTTP 200, calculation HTTP 200, estimated example price 9.0374 USD/kg. Build plus smoke took 172.41 s.

Evidence: `final-desktop.log` (first failure), `t15-dependency-recovery.log`, `final-desktop-retry.log` (passing final gate). This was one failed desktop gate followed by a passing gate; the three-consecutive-failures deferral threshold was not reached.

The installer is a local validation artifact. A human still needs to approve the PR, create the release tag, check published assets and updater behavior, verify the new Zenodo version DOI, and approve the final journal submission.
