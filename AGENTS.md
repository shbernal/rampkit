# AGENTS.md

Guidance for AI agents working in this repository.

## What this is

rampkit builds a Tailwind-style color ramp (`50` to `950`) from one input color,
preserving that input at its natural stop, and emits the result in several output
formats. The technique is the one tints.dev popularized, reimplemented from
scratch. Do not copy tints.dev code; this stays an independent implementation.

## Layout

A [bun](https://bun.sh) workspace monorepo.

- `packages/core`, `@shbernal/rampkit`, the ESM-only library.
  - `src/ramp.ts`, the OKLCH ramp engine (`ramp(input, options)`).
  - `src/format.ts`, the output formatters (tailwind-v4, css-vars,
    tailwind-config, json, hex-array), and the optional version stamp.
  - `src/contrast.ts`, WCAG ratios: which stop of a ramp can carry text.
    `ansi.ts` takes its luminance from here, so the sRGB transfer function has
    one definition.
  - `src/version.ts`, the `VERSION` literal, held to the manifest by
    `version.test.ts`. Bump it with the manifest on a release.
  - `src/ansi.ts`, the terminal swatch preview helper, exported at the `/ansi`
    subpath.
  - `src/index.ts`, the public entry point.
  - `src/*.test.ts`, the `bun test` suites.
  - `scripts/reference-l.ts`, re-derives `REFERENCE_L` from Tailwind's published
    palette. `ramp.test.ts` asserts the table still matches.
- `packages/app`, `@shbernal/rampkit-cli`, the `rampkit` binary.
  - `src/main.ts`, the entry point; dispatches to the CLI or the TUI.
  - `src/cli.ts`, argument parsing and stdin/stdout handling. It writes through a
    `CliIo` sink and returns an exit code, which is what makes it testable in
    `src/cli.test.ts`.
  - `src/tui.tsx`, the interactive [Ink](https://github.com/vadimdemedes/ink)
    React TUI.
  - `src/color-input.ts`, the input pane's pure logic (notation conversion, range
    clamping), unit-tested in `src/color-input.test.ts`.
  - `src/ramp-options.ts`, the geometry options (`anchor`, `chroma`, `hueShift`,
    `lMin`, `lMax`) as one table: the range each CLI flag accepts and how the
    TUI's ramp pane dials it. Both front ends read it, so a bound is never stated
    twice.
  - `src/layout.ts`, what fits the terminal: the rows each pane costs drawn in
    full or summarized to a line, and which ones collapse on a short one.
  - `src/version.ts`, the `--version` string, substituted at build time so the
    manifest never lands in the bundle.
  - `scripts/build.ts`, the bundler invocation behind `bun run build`.
  - `scripts/tui-smoke.py`, a manual pty-driven TUI smoke check, deliberately
    outside `bun test`.

## Commands

Run from the repo root:

```bash
bun install
bun run build      # tsc build for core, bundled binary for app
bun test           # unit suites (core ramp/format/ansi + app cli/color-input/ramp-options/layout)
bun run typecheck  # tsc --noEmit across packages (sources, suites and scripts)
bun run dev        # run the app from source (TUI)
bun run format     # oxfmt across the repo (format:check verifies without rewriting)
bun run lint       # oxlint (correctness, suspicious, perf)
```

## Conventions

- ESM only, no CommonJS. The library is marked `"sideEffects": false`.
- TypeScript throughout, and `bun run typecheck` stays clean. `tsconfig.json` is
  what ships; `tsconfig.test.json` adds the suites and `scripts/` at the same
  strictness with nothing emitted. `typecheck` runs both.
- The CLI writes data to stdout so piping stays clean, and sends `--preview`
  swatches and diagnostics to stderr. Preserve that when editing `cli.ts`.
- Color parsing goes through [culori](https://culorijs.org). Accept any CSS color
  string it understands instead of hand-rolling a parser.
- Add or update a `*.test.ts` when changing ramp math or a formatter.
- MIT licensed.

## Documentation

User-facing docs live in `docs/` (library, CLI, TUI) and are linked from
`README.md`, which stays adoption-focused with no development commands in it.
Everything about working on rampkit, the layout, the testing tiers, versioning,
publishing and the demo, belongs in `CONTRIBUTING.md`. Read it before a release.

## Provenance

The ramp-generation approach is inspired by tints.dev, which is CC BY-NC 4.0.
Only the general technique is shared. Algorithms and ideas are not copyrightable,
but its code must not be reused here. The attribution itself lives in `LICENSE`.
