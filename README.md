# rampkit

Generate Tailwind-style color ramps (`50`–`950`) from a single input color — the
exact input is preserved at its natural stop — and emit the result in several
output formats, not just a Tailwind config object.

rampkit ships three ways to use it from one repo:

| Package | Install | Use |
| --- | --- | --- |
| **Library** — [`@shbernal/rampkit`](./packages/core) | `bun add @shbernal/rampkit` | `import { ramp, format }` in your code |
| **CLI + TUI** — [`@shbernal/rampkit-cli`](./packages/app) | `bun add -g @shbernal/rampkit-cli` | `rampkit '#451dc7'` (CLI) or bare `rampkit` (TUI) |

## Why

Existing tools each miss something: they're web apps not libraries, support only
one input format, emit only a Tailwind config object, are unmaintained, or aren't
open source. `rampkit` aims to be: maintained, TypeScript, Tailwind v4-aware, an
installable npm package, broad input encodings, and **multi-format output** — all
under a permissive (MIT) license.

## Library

```ts
import { ramp, format } from "@shbernal/rampkit";

const scale = ramp("#451dc7");            // { 50: "...", ..., 950: "..." }
format(scale, "tailwind-v4");             // @theme custom properties
format(scale, "css-vars");                // :root custom properties
format(scale, "tailwind-config");         // { color: { 50: "...", ... } }
format(scale, "json");                    // flat stop→hex map
format(scale, "hex-array");               // ["#...", ...] lightest→darkest
```

`ramp(input, options)` accepts any CSS color string culori understands (hex,
`rgb()`, `hsl()`, `oklch()`, named colors, …). Options: `anchor`, `chroma`,
`hueShift`, `lMin`, `lMax`, and `colorSpace` (`hex`/`rgb`/`hsl`/`oklch`) to
choose the syntax each stop is emitted in. A terminal preview helper is
available at the `@shbernal/rampkit/ansi` subpath.

## CLI

```bash
rampkit '#451dc7'                          # tailwind-v4 @theme (default)
rampkit rebeccapurple -f css-vars -n brand # other format + token name
rampkit '#0ea5e9' --color oklch -f css-vars # emit oklch() values
rampkit '#0ea5e9' -f json --preview        # JSON to stdout, swatches to stderr
echo '#0ea5e9' | rampkit -f hex-array      # read color from stdin
rampkit --help
```

`--color` picks the value syntax (`hex`/`rgb`/`hsl`/`oklch`). Output goes to
stdout (clean for piping); `--preview` swatches go to stderr.

## TUI

Run `rampkit` with no arguments in an interactive terminal to launch the TUI.
It splits into an **input** pane and an **output** pane (**Shift+Tab** to switch
focus): **↑/↓** cycle the input notation / output color syntax, **Tab** cycles
fields / output formats, **Enter** copies, **Esc**/**Ctrl-C** quits. Swatches
are painted in 24-bit sRGB (a faithful preview — terminals can't render `oklch()`
or wide gamuts); the emitted text values are the source of truth.

## Development

This is a [bun](https://bun.sh) workspace monorepo (`packages/core`, `packages/app`).

```bash
bun install
bun run build      # tsc build for the lib, bundled bin for the app
bun test           # core test suite
bun run typecheck  # tsc --noEmit across packages
bun run dev        # run the app from source (TUI)
```

The library is **ESM-only**.

## Credit / provenance

The ramp-generation *approach* is inspired by
[tints.dev](https://tints.dev) by Simeon Griggs (3-anchor lightness distribution
in a perceptual color space, per-stop hue/saturation tweaks, and preserving the
input color at its anchor stop). tints.dev is licensed CC BY-NC 4.0.

**`rampkit` does not copy tints.dev's code.** It is an independent clean-room
reimplementation of the general technique — algorithms and ideas are not
copyrightable — written from scratch and released under MIT so it can be used
freely, including commercially.

## License

[MIT](./LICENSE) © shbernal
