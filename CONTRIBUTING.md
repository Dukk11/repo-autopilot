# Contributing to repo-autopilot

Thanks for helping out! 🤖

## Ground rules

1. **Zero runtime dependencies.** The rule engine and the GitHub client are
   hand-rolled on purpose. Tests run on `node:test` only.
2. **Conventional Commits** (`feat:`, `fix:`, `docs:` …) — the changelog is
   generated from commit messages by [changelog-genie](https://github.com/Dukk11/changelog-genie).
3. **Architecture:** keep `src/rules.js` pure (no I/O). Network code lives in
   `src/api.js` and must only ever talk to `https://api.github.com`.
   The action entry reads exactly one file: the literal `.autopilot.json`.
4. Run `npm test` before pushing — CI runs the suite on Node 18/20/22.

## Dev setup

```console
git clone https://github.com/Dukk11/repo-autopilot
cd repo-autopilot
npm test
```

## Reporting bugs

Open an issue with the workflow snippet, the action log, and your rule config
(redact tokens).
