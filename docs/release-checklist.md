# Release preparation — v1.4.0

Prepared on 2026-09-06; evidence updated on 2026-09-07. This checklist does not publish a release. Final command outputs and CI status are in [the run audit](audit/autonomous-run-2026-09-06.md).

- [x] Set package.json, frontend/package.json, pyproject.toml and backend/main.py APP_VERSION to 1.4.0; synchronise lockfile package headers.
- [x] Update release notes, CITATION.cff, codemeta.json and project links; retain PolyForm Noncommercial 1.0.0.
- [x] Confirm latest full pytest (710 passed in 459.11 s), frontend lint/build and i18n checks, CatCost reproduction and desktop smoke (1.4.0) evidence in the run audit.
- [ ] Human: review and merge the single run PR after CI passes; this execution does not merge it.
- [ ] Human: create and push tag v1.4.0 from the approved release commit.
- [ ] Human: confirm GitHub release assets and updater metadata (installer, portable archive, latest.yml, blockmap); test an upgrade from the prior public release.
- [ ] Human: verify the new Zenodo version archive, license and relationship to concept DOI 10.5281/zenodo.21451931.
- [x] Regenerate the May 2026 manuscript, SI, six figures and TOC graphic; verify numerical keys and the public ACS guidance.
- [ ] Human: confirm authorship, affiliations, funding, final typeset length, cover letter and journal submission requirements.
- [ ] Human: decide deferred data/coverage questions and source URLs that could not be verified.

Never copy the proprietary CatCost workbook into release assets. Version 1.4.0 remains prepared source until the tag and release actually exist.
