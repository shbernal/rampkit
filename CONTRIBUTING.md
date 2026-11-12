# Contributing

Issues and pull requests are welcome, including ones written entirely by an AI
agent. The only rule about that is disclosure: say in the issue or PR body which
harness and model produced it (for example "Claude Code, Opus 5"). Commit
messages are the exception, they carry no AI attribution at all and the
`commit-check` CI job rejects them if they do.

## Setup

rampkit is a [bun](https://bun.sh) workspace monorepo. Everything runs from the
repo root.

```bash
bun install
bun run build      # tsc build for the library, bundled binary for the app
bun test           # unit suites
bun run typecheck  # tsc --noEmit across packages, sources and suites alike
bun run dev        # run the app from source (TUI)
bun run format     # oxfmt across the repo (format:check verifies without rewriting)
bun run lint       # oxlint (correctness, suspicious, perf)
```

There are no git hooks. CI (`.github/workflows/ci.yml`) runs typecheck, lint,
format check, tests and build on every pull request, plus the commit-message
check; run them locally before pushing.

## Layout

- `packages/core`, `@shbernal/rampkit`, the ESM-only library.
  - `src/ramp.ts`, the OKLCH ramp engine (`ramp(input, options)`).
  - `src/format.ts`, the output formatters.
  - `src/contrast.ts`, WCAG ratios: which stop of a ramp can carry text.
  - `src/ansi.ts`, the terminal swatch preview helper, exported at `/ansi`.
  - `src/version.ts`, the `VERSION` literal `format()` stamps into output.
  - `src/index.ts`, the public entry point.
  - `scripts/reference-l.ts`, re-derives `REFERENCE_L` from Tailwind's palette.
- `packages/app`, `@shbernal/rampkit-cli`, the `rampkit` binary.
  - `src/main.ts`, the entry point; dispatches to the CLI or the TUI.
  - `src/cli.ts`, argument parsing and stdin/stdout handling.
  - `src/tui.tsx`, the [Ink](https://github.com/vadimdemedes/ink) TUI.
  - `src/color-input.ts`, input-pane logic (notation conversion, clamping).
  - `src/ramp-options.ts`, the geometry options as one table: the CLI's flag
    bounds and the ramp pane's dials.
  - `src/layout.ts`, the row budget each pane costs and which ones collapse on a
    short terminal.
  - `src/version.ts`, the `--version` string. See [Versioning](#versioning).
  - `scripts/build.ts`, the bundler invocation behind `bun run build`.

## Conventions

- ESM only, no CommonJS. The library is marked `"sideEffects": false`.
- TypeScript throughout, and `bun run typecheck` stays clean. Each package has
  two tsconfigs. `tsconfig.json` is what gets built and published;
  `tsconfig.test.json` adds the suites and `scripts/` at the same strictness and
  emits nothing. `typecheck` runs both, so a broken test is never a green build.
  The app sees the library through `packages/core/dist` rather than its sources,
  so the app's `typecheck` rebuilds core first. Skip that and a freshly added
  export reads as "has no exported member" at the consumer, with nothing
  actually wrong there.
- Color parsing goes through [culori](https://culorijs.org). Accept any CSS
  color string it understands instead of hand-rolling a parser.
- Changing ramp math or a formatter means adding or updating a `*.test.ts`.
- Colors reaching the engine are guarded by type before culori sees them:
  `oklch()` is truthy for a plain object, so a parse check alone lets one through
  and every stop renders `#000000`. A well-formed wrong ramp is the failure mode
  worth spending a guard on, since nothing downstream rejects it.
- The CLI writes data to stdout and sends `--preview` swatches and diagnostics
  to stderr. Keep it that way so piping stays clean.

## Testing

Two tiers, kept apart so a failure tells you how much to trust it.

`bun test` is deterministic and is the one that decides. The core suites cover
the ramp math, the formatters, the contrast helpers, the version literal and the
ansi preview; the app suites cover argument
parsing, the input pane's clamping and notation conversion, the shared options
table and the layout budget. A failure here is a real bug.

`scripts/tui-smoke.py` drives the real TUI in a pseudo-terminal to check that
the panes render and keys route correctly, which the unit tests can't reach. It
stays out of `bun test` because pty timing can raise false alarms. The script's
header lists what to rule out before believing a failure. Run it after a build:

```bash
python3 packages/app/scripts/tui-smoke.py
RAMPKIT_SMOKE_DELAY=0.6 python3 packages/app/scripts/tui-smoke.py   # slower box
```

## Adding an output format

`FORMATS` in `packages/core/src/format.ts` is where the list lives. The `Format`
type derives from it, the CLI and TUI menus read it, and `--help` is generated
from it. Prose copies are not, so a new format also needs a line in
`docs/cli.md`, `docs/tui.md` and `packages/app/README.md`. `COLOR_SPACES` in
`packages/core/src/ramp.ts` works the same way.

A format whose syntax has comments also belongs in `STAMPABLE_FORMATS`, or
`--stamp` will quietly decline to stamp it.

## Re-deriving the reference lightnesses

`REFERENCE_L` in `packages/core/src/ramp.ts` decides which stop an input color is
preserved at. It summarizes Tailwind's own palette, the median OKLCH lightness of
every default family at each stop, rather than being hand-tuned, so it can be
regenerated:

```bash
bun run --cwd packages/core scripts/reference-l.ts
```

`ramp.test.ts` asserts the checked-in table still equals what the script derives,
so bumping the `tailwindcss` devDependency fails the suite if the palette moved.
Paste the script's output back into `ramp.ts` and note the new version in the
comment above the table.

## Versioning

Two versions, and both are bumped by hand on a release.

`rampkit --version` prints the app's `package.json` version, so bumping the
manifest is the whole job there. How the string gets into the binary depends on
how the code runs, because importing the manifest would inline all of it into
the bundle.

- Built with `bun run build`, `scripts/build.ts` substitutes the version for the
  `RAMPKIT_VERSION` identifier, so only the string ships.
- Run from source with `bun run dev`, no substitution happened, so
  `src/version.ts` falls back to reading `package.json` off disk.

The library's `VERSION`, the one `format({ stamp: true })` writes into generated
output, is a plain literal in `packages/core/src/version.ts`. That package builds
with tsc, which would emit an import of the manifest and pull all of it into
every bundle downstream, so the string is written out instead. `version.test.ts`
holds it to the manifest, so forgetting it on a release fails the suite rather
than shipping a ramp that lies about what made it.

## Publishing

Releases go out from `.github/workflows/publish.yml` on a `v<version>` tag, with
npm trusted publishing and provenance: there is no token, npm trusts that
workflow file in this repository. Do not publish by hand.

```bash
# 1. in a PR, bump versions in lockstep:
#    packages/core/package.json, packages/app/package.json
#    packages/core/src/version.ts, the VERSION format() stamps into output
#    (the build reads the app's manifest, so --version follows automatically)
# 2. once it is merged, tag main and push the tag:
git tag v1.2.3 && git push origin v1.2.3
```

The workflow refuses a tag that disagrees with either manifest, runs typecheck,
tests and build, then publishes the library first, so the CLI's resolved version
already exists on the registry. Each package is packed with `bun pm pack`, which
rewrites the app's `workspace:*` dependency on the library to the concrete
version (`npm pack` would ship the literal), and the tarball is published with
`npm publish`, which is what does trusted publishing. The app bundles its
runtime deps (culori, ink, react, the core library) into `dist/`, which is why
they sit in `devDependencies` and why a global install pulls nothing else down.

## Regenerating the demo

The README's TUI demo is `demo.gif`, rendered from `demo.tape` with
[VHS](https://github.com/charmbracelet/vhs):

```bash
vhs demo.tape   # re-renders demo.gif
```

The tape launches the TUI directly (`bun run packages/app/src/main.ts`) and
scripts the keystrokes, so the recording stays in sync with the real UI. Edit the
tape to change the flow.
