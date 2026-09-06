# COMET Documentation

COMET is a Windows desktop app that estimates catalyst manufacturing cost. The
Electron shell, the local FastAPI backend, the calculation engine, and the
bundled datasets all live in this repository.

Start at the [README](../README.md) for what the app does and how to install it.

## For users

| Page | What it covers |
| --- | --- |
| [Getting started](getting-started.md) | Install, first estimate, where results are saved |
| [Screens](screens.md) | Every screen in the app, in the order a session visits them |
| [Methodology](methodology.md) | How the cost numbers are derived and what they can be trusted for |
| [Desktop troubleshooting](desktop-troubleshooting.md) | SmartScreen, sidecar startup, update failures |
| [Release notes](release-notes.md) | Where the changelog lives |

## For contributors

| Page | What it covers |
| --- | --- |
| [`AGENTS.md`](../AGENTS.md) | Operating rules, locked stack, validation strategy, coding conventions |
| [Architecture](architecture.md) | Directory layout, core calculation modules, API surface |
| [API reference](api-reference.md) | HTTP endpoints served by the local backend |
| [Roadmap](roadmap.md) | What is planned and what has been superseded |
| [Project links](project-links.md) | Verified external URLs and release metadata |
| [Project history](project-history.md) | Benchmarking notes and the original phase plan (historical) |
| [GPT / Codex hand-off](gpt-handoff.md) | Master prompt, phased work plan, pending decisions, and paper skeleton for handing the project to another coding agent (Korean) |

## Local development

```bash
npm install
npm run dev
```

This starts the Electron shell, the local FastAPI sidecar, and the Vite renderer.
Full command list and test commands are in [`CLAUDE.md`](../CLAUDE.md).
