# Development

rampkit is a [bun](https://bun.sh) workspace monorepo.

## Layout

- `packages/core` — `@shbernal/rampkit`, the ESM-only library.
  - `src/ramp.ts` — the OKLCH ramp engine (`ramp(input, options)`).
  - `src/format.ts` — output formatters.
  - `src/ansi.ts` — terminal swatch preview helper (exported at `/ansi`).
  - `src/index.ts` — public entry point.
  - `scripts/reference-l.ts` — re-derives `REFERENCE_L` from Tailwind's palette.
- `packages/app` — `@shbernal/rampkit-cli`, the `rampkit` binary.
  - `src/main.ts` — entry; dispatches to CLI or TUI.
  - `src/cli.ts` — argument parsing, stdin/stdout handling.
  - `src/tui.tsx` — interactive [Ink](https://github.com/vadimdemedes/ink) TUI.
  - `src/color-input.ts` — pure input-pane logic (notation conversion, clamping).
  - `src/version.ts` — the `--version` string; see _Versioning_ below.
  - `scripts/build.ts` — the bundler invocation behind `bun run build`.

## Commands

Run from the repo root:

```bash
bun install
bun run build      # tsc build for the lib, bundled bin for the app
bun test           # unit suites (core ramp/format/ansi + app cli/color-input)
bun run typecheck  # tsc --noEmit across packages, sources and suites alike
bun run dev        # run the app from source (TUI)
bun run format     # oxfmt across the repo (--check in CI)
bun run lint       # oxlint (correctness, suspicious, perf)
```

The library is **ESM-only** — no CommonJS.

## Conventions

- TypeScript throughout; keep `bun run typecheck` clean. Each package has two
  tsconfigs — `tsconfig.json` for what gets built and published, and
  `tsconfig.test.json` for the suites and `scripts/`, which are checked but never
  emitted. `typecheck` runs both, so a broken test is not a green build.
- Color parsing goes through [culori](https://culorijs.org); accept any CSS color
  string it understands rather than hand-rolling parsers.
- Add or update a `*.test.ts` when changing ramp math or formatters.
- CLI contract: data → **stdout**; `--preview` swatches and diagnostics →
  **stderr**.

## Adding an output format

`FORMATS` in `packages/core/src/format.ts` is the source of truth — the `Format`
type derives from it, and the CLI and TUI menus read it. The `--help` text is
generated from it too. Prose copies of the list are not, so a new format also
needs a line in `docs/cli.md`, `docs/tui.md` and `packages/app/README.md`.
Same shape for `COLOR_SPACES` in `packages/core/src/ramp.ts`.

## Re-deriving the reference lightnesses

`REFERENCE_L` in `packages/core/src/ramp.ts` decides which stop an input color is
preserved at. It is a summary of Tailwind's own palette — the median OKLCH
lightness of every default family at each stop — rather than a hand-tuned table,
so it can be regenerated:

```bash
bun run --cwd packages/core scripts/reference-l.ts
```

`ramp.test.ts` asserts the checked-in table still equals what the script derives.
Bumping the `tailwindcss` devDependency therefore fails the suite if the palette
moved; paste the script's output back into `ramp.ts` and note the new version in
the comment above it.

## Publishing

Both packages are published with **`bun publish`** (not `npm publish`): the app
declares `@shbernal/rampkit` as a `workspace:*` dependency, and `bun publish`
rewrites that to the concrete version on publish — `npm publish` would ship the
literal `workspace:*` and break installs.

Publish order matters — release the library first so the CLI's resolved version
exists on the registry:

```bash
# 1. bump versions in lockstep:
#    packages/core/package.json, packages/app/package.json
#    (the build reads the app's manifest, so --version follows automatically)
bun publish --cwd packages/core   # @shbernal/rampkit
bun publish --cwd packages/app    # @shbernal/rampkit-cli
```

Each package's `prepublishOnly` runs `bun run build` first, so `dist/` (which is
git-ignored) is always freshly built before it ships. The app bundles all its
runtime deps (culori, ink, react, the core lib) into `dist/`, so they live in
`devDependencies` and nothing extra is pulled in on `npm i -g @shbernal/rampkit-cli`.

## Versioning

`rampkit --version` prints the app's `package.json` version; bumping the manifest
is the only step. How it gets there differs by how the code is running, because
importing the manifest would inline the _whole_ thing into the bundle:

- built (`bun run build`) — `scripts/build.ts` substitutes the version for the
  `RAMPKIT_VERSION` identifier, so only the string ships;
- from source (`bun run dev`) — no substitution happened, so `src/version.ts`
  falls back to reading `package.json` off disk.

## Regenerating the demo

The README's TUI demo is `demo.gif`, rendered from `demo.tape` with
[VHS](https://github.com/charmbracelet/vhs):

```bash
vhs demo.tape   # re-renders demo.gif
```

`demo.tape` launches the TUI directly (`bun run packages/app/src/main.ts`) and
scripts the keystrokes deterministically, so the recording stays in sync with
the real UI. Edit the tape to change the demo flow.
