# 🤖 repo-autopilot

[![CI](https://github.com/Dukk11/repo-autopilot/actions/workflows/ci.yml/badge.svg)](https://github.com/Dukk11/repo-autopilot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![zero dependencies](https://img.shields.io/badge/dependencies-0-success)

**Put issue & PR triage on autopilot.** A single GitHub Action that
auto-labels pull requests by changed files and titles, welcomes first-time
contributors, and sweeps stale threads on a schedule — driven by one small
JSON file, **zero dependencies**, no marketplace app, no bot account.

## Why

Triage is the first thing that dies when a repo gets traction. Existing
solutions want a hosted app, a Docker image, or 900 dependencies. Autopilot is
one auditable `src/` folder: the rule engine is pure, unit-tested JavaScript,
and the only network host it talks to is `api.github.com`.

## Quick start

**1. Drop a `.autopilot.json` into your repo:**

```json
{
  "labelByPath": [
    { "glob": "src/**",        "label": "backend" },
    { "glob": "**/*.test.*",   "label": "tests" },
    { "glob": "**/*.md",       "label": "docs" }
  ],
  "labelByTitle": [
    { "pattern": "^\\[bug\\]", "flags": "i", "label": "bug" }
  ],
  "welcome": {
    "comment": "Thanks for your first contribution! 🎉"
  },
  "stale": {
    "days": 30,
    "label": "stale",
    "closeAfterDays": 45
  }
}
```

(Full example: [.autopilot.example.json](.autopilot.example.json))

**2. Add the workflow** (`.github/workflows/autopilot.yml`):

```yaml
name: autopilot
on:
  pull_request:
    types: [opened, synchronize]
  issues:
    types: [opened]
  schedule:
    - cron: '0 6 * * *'   # daily stale sweep
  workflow_dispatch:

jobs:
  triage:
    runs-on: ubuntu-latest
    permissions:
      issues: write
      pull-requests: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: Dukk11/repo-autopilot@main
        with:
          issue-number: ${{ github.event.issue.number }}
```

That's it. PRs get labeled from their diffs, first-time contributors get your
welcome message, and quiet threads get a `stale` nudge before an auto-close.

## Rules reference

| Rule | Scope | Effect |
|---|---|---|
| `labelByPath` | PRs | adds a label when any changed file matches the glob (`**`, `*`, `?`) |
| `labelByTitle` | PRs + issues | adds a label when the title matches a regex (invalid regexes are skipped, never fatal) |
| `welcome.comment` | PRs + issues | comments when `author_association` is `FIRST_TIME_CONTRIBUTOR` |
| `stale.days` / `stale.label` | schedule sweeps | labels items untouched for N days |
| `stale.closeAfterDays` | schedule sweeps | closes items still untouched after N days |

## How it works

- `src/rules.js` — the pure engine: globs → regex (own tiny converter), title
  regexes, staleness windows. 100 % unit-tested, zero I/O.
- `src/api.js` — a ~40-line GitHub REST client on top of `fetch`. Host is a
  hardcoded `https://api.github.com` literal.
- `src/main.js` — the action entry. The triage target comes from `GITHUB_REF`
  (`refs/pull/<n>/merge`, regex-validated) or the `issue-number` input — no
  event-file parsing, nothing else touches the filesystem except the fixed
  `.autopilot.json`.

**Security posture:** no shell, no eval, one allowlisted API host, token only
in the Authorization header, config read from a fixed literal path.

## Contributing

PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Hard rule: **zero runtime
dependencies**, tests via `node:test`.

## More from Duk · [dukdev.com](https://dukdev.com)

| | |
|---|---|
| [commit-genie](https://github.com/Dukk11/commit-genie) | AI commit messages — free via Ollama, offline mode |
| [pr-genie](https://github.com/Dukk11/pr-genie) | PR titles & descriptions, auto-written from your diff |
| [standup-genie](https://github.com/Dukk11/standup-genie) | Your standup, written by your commits |
| [changelog-genie](https://github.com/Dukk11/changelog-genie) | Conventional commits → CHANGELOG + Release, automated |
| [linkrot-guard](https://github.com/Dukk11/linkrot-guard) | Dead-link guardian for your READMEs, on a schedule |
| [devtoolbelt](https://dukk11.github.io/devtoolbelt) | 18 dev tools, 100 % client-side |

## License

[MIT](LICENSE) · built by **Duk** · [dukdev.com](https://dukdev.com)
