# rampkit

Give it one color and get the whole Tailwind-style scale around it, `50` through
`950`. Your color comes back untouched at the stop its lightness belongs to, and
the rest of the ramp is built around that in OKLCH.

![rampkit TUI demo](./demo.gif)

The scale comes out as Tailwind v4 `@theme` properties, plain CSS variables, a
Tailwind config object, JSON, or a bare hex array. Each stop can be written as
hex, `rgb()`, `hsl()` or `oklch()`.

| Package                                               | Install                            | Use                                                |
| ----------------------------------------------------- | ---------------------------------- | -------------------------------------------------- |
| [`@shbernal/rampkit`](./packages/core), the library   | `bun add @shbernal/rampkit`        | `import { ramp, format }`                          |
| [`@shbernal/rampkit-cli`](./packages/app), the binary | `bun add -g @shbernal/rampkit-cli` | `rampkit '#451dc7'`, or bare `rampkit` for the TUI |

## Quick start

```ts
import { ramp, format } from "@shbernal/rampkit";

const scale = ramp("#451dc7"); // { 50: "...", ..., 950: "..." }
format(scale, "tailwind-v4"); // @theme custom properties
```

```bash
rampkit '#451dc7'   # tailwind-v4 @theme, the default
rampkit             # no arguments, interactive TUI
```

## Documentation

- [Library API](./docs/library.md) covers `ramp()`, `format()`, the options and
  the ansi helper.
- [CLI reference](./docs/cli.md) lists every flag and the stdout/stderr contract.
- [TUI guide](./docs/tui.md) walks the panes and their key bindings.
- [CONTRIBUTING.md](./CONTRIBUTING.md) has the repo layout, the commands and how
  a release goes out.

## Why this exists

Every tool I tried missed something. Several are web apps with no library behind
them. Some take one input format. Most emit a Tailwind config object and stop
there. A few are unmaintained, and a few aren't open source. rampkit is a typed
package you install, it reads any CSS color culori can parse, it targets
Tailwind v4, it emits five formats, and MIT means you can ship it in paid work.

The approach is inspired by [tints.dev](https://tints.dev). None of its code is
reused here; see [LICENSE](./LICENSE).

## License

[MIT](./LICENSE) © shbernal
