# Development

rampkit is a [bun](https://bun.sh) workspace monorepo.

## Layout

- `packages/core` — `@shbernal/rampkit`, the ESM-only library.
  - `src/ramp.ts` — the OKLCH ramp engine (`ramp(input, options)`).
  - `src/format.ts` — output formatters.
  - `src/ansi.ts` — terminal swatch preview helper (exported at `/ansi`).
  - `src/index.ts` — public entry point.
- `packages/app` — `@shbernal/rampkit-cli`, the `rampkit` binary.
  - `src/main.ts` — entry; dispatches to CLI or TUI.
  - `src/cli.ts` — argument parsing, stdin/stdout handling.
  - `src/tui.tsx` — interactive [Ink](https://github.com/vadimdemedes/ink) TUI.
  - `src/color-input.ts` — pure input-pane logic (notation conversion, clamping).

## Commands

Run from the repo root:

```bash
bun install
bun run build      # tsc build for the lib, bundled bin for the app
bun test           # unit suites (core ramp/format + app color-input)
bun run typecheck  # tsc --noEmit across packages
bun run dev        # run the app from source (TUI)
```

The library is **ESM-only** — no CommonJS.

## Conventions

- TypeScript throughout; keep `bun run typecheck` clean.
- Color parsing goes through [culori](https://culorijs.org); accept any CSS color
  string it understands rather than hand-rolling parsers.
- Add or update a `*.test.ts` when changing ramp math or formatters.
- CLI contract: data → **stdout**; `--preview` swatches and diagnostics →
  **stderr**.

## Publishing

Both packages are published with **`bun publish`** (not `npm publish`): the app
declares `@shbernal/rampkit` as a `workspace:*` dependency, and `bun publish`
rewrites that to the concrete version on publish — `npm publish` would ship the
literal `workspace:*` and break installs.

Publish order matters — release the library first so the CLI's resolved version
exists on the registry:

```bash
# 1. bump versions in lockstep:
#    packages/core/package.json, packages/core/src/index.ts (VERSION),
#    packages/app/package.json
bun publish --cwd packages/core   # @shbernal/rampkit
bun publish --cwd packages/app    # @shbernal/rampkit-cli
```

Each package's `prepublishOnly` runs `bun run build` first, so `dist/` (which is
git-ignored) is always freshly built before it ships. The app bundles all its
runtime deps (culori, ink, react, the core lib) into `dist/`, so they live in
`devDependencies` and nothing extra is pulled in on `npm i -g @shbernal/rampkit-cli`.

## Regenerating the demo

The README's TUI demo is `demo.gif`, rendered from `demo.tape` with
[VHS](https://github.com/charmbracelet/vhs):

```bash
vhs demo.tape   # re-renders demo.gif
```

`demo.tape` launches the TUI directly (`bun run packages/app/src/main.ts`) and
scripts the keystrokes deterministically, so the recording stays in sync with
the real UI. Edit the tape to change the demo flow.
