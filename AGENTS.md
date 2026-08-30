# AGENTS.md

Guidance for AI agents working in this repository.

## What this is

**rampkit** generates Tailwind-style color ramps (`50`–`950`) from a single
input color (preserving the exact input at its natural stop) and emits the result
in multiple output formats. It is a clean-room reimplementation of the technique
popularized by [tints.dev](https://tints.dev) — **do not copy tints.dev code**;
keep it an independent implementation.

## Layout

This is a [bun](https://bun.sh) workspace monorepo.

- `packages/core` — `@shbernal/rampkit`, the ESM-only library.
  - `src/ramp.ts` — the OKLCH ramp engine (`ramp(input, options)`).
  - `src/format.ts` — output formatters (tailwind-v4, css-vars, tailwind-config, json, hex-array).
  - `src/ansi.ts` — terminal swatch preview helper (exported at the `/ansi` subpath).
  - `src/index.ts` — public entry point.
  - `src/*.test.ts` — `bun test` suites.
- `packages/app` — `@shbernal/rampkit-cli`, the `rampkit` binary.
  - `src/main.ts` — entry; dispatches to CLI or TUI.
  - `src/cli.ts` — argument parsing, stdin/stdout handling.
  - `src/tui.tsx` — interactive [Ink](https://github.com/vadimdemedes/ink) React TUI.
  - `src/color-input.ts` — pure logic for the TUI input pane (notation
    conversion, range clamping); unit-tested in `src/color-input.test.ts`.
  - `scripts/tui-smoke.py` — manual pty-driven TUI smoke check (not in `bun test`).

## Commands

Run from the repo root:

```bash
bun install
bun run build      # tsc build for core, bundled bin for app
bun test           # unit suites (core ramp/format + app color-input)
bun run typecheck  # tsc --noEmit across packages
bun run dev        # run the app from source (TUI)
bun run format     # oxfmt across the repo (--check in CI)
bun run lint       # oxlint (correctness, suspicious, perf)
```

## Conventions

- **ESM-only.** No CommonJS. The library has `"sideEffects": false`.
- TypeScript throughout; keep `bun run typecheck` clean.
- CLI contract: data output goes to **stdout** (clean for piping); `--preview`
  swatches and diagnostics go to **stderr**. Preserve this when editing `cli.ts`.
- Color parsing goes through [culori](https://culorijs.org); accept any CSS color
  string it understands rather than hand-rolling parsers.
- Add or update a `*.test.ts` when changing ramp math or formatters.
- MIT licensed.

## Provenance

The ramp-generation _approach_ is inspired by tints.dev (CC BY-NC 4.0). Only the
general technique is shared — algorithms and ideas are not copyrightable, but its
code must not be reused here.
