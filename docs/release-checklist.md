# Release preparation — v1.4.0

Prepared on 2026-09-06. This checklist does not publish a release. Final command outputs and CI status are in [the run audit](audit/autonomous-run-2026-09-06.md).

- [x] Set package.json, frontend/package.json, pyproject.toml and backend/main.py APP_VERSION to 1.4.0; synchronise lockfile package headers.
- [x] Update release notes, CITATION.cff, codemeta.json and project links; retain PolyForm Noncommercial 1.0.0.
- [x] Confirm final pytest (636 passed), frontend lint/build and i18n checks, CatCost reproduction and desktop smoke (1.4.0) evidence in the run audit.
- [ ] Human: review and merge the single run PR after CI passes; this execution does not merge it.
- [ ] Human: create and push tag v1.4.0 from the approved release commit.
- [ ] Human: confirm GitHub release assets and updater metadata (installer, portable archive, latest.yml, blockmap); test an upgrade from the prior public release.
- [ ] Human: verify the new Zenodo version archive, license and relationship to concept DOI 10.5281/zenodo.21451931.
- [ ] Human: confirm authorship, affiliations, funding, TOC graphic, ACS submission formatting and final journal requirements.
- [ ] Human: decide deferred data/coverage questions and source URLs that could not be verified.

Never copy the proprietary CatCost workbook into release assets. Version 1.4.0 remains prepared source until the tag and release actually exist.
