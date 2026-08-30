# Library — `@shbernal/rampkit`

The ESM-only core library. Install it into your project:

```bash
bun add @shbernal/rampkit
```

## `ramp(input, options?)`

Generate a `50`–`950` scale from a single input color. The exact input is
preserved at its natural (anchor) stop.

```ts
import { ramp } from "@shbernal/rampkit";

const scale = ramp("#451dc7");
// { 50: "#...", 100: "#...", ..., 950: "#..." }
```

`input` is any CSS color string [culori](https://culorijs.org) understands —
hex, `rgb()`, `hsl()`, `oklch()`, named colors, and more.

### Options

| Option          | Purpose                                                                              |
| --------------- | ------------------------------------------------------------------------------------ |
| `anchor`        | Force which stop the input color is pinned to (otherwise chosen from its lightness). |
| `chroma`        | Scale the chroma curve across the ramp.                                              |
| `hueShift`      | Shift hue toward the light/dark ends (cool/warm drift).                              |
| `lMin` / `lMax` | Clamp the lightest/darkest stop's lightness.                                         |
| `colorSpace`    | Syntax each stop is emitted in: `hex` (default), `rgb`, `hsl`, or `oklch`.           |

## `format(scale, format, options?)`

Render a scale into an output format:

```ts
import { ramp, format } from "@shbernal/rampkit";

const scale = ramp("#451dc7");
format(scale, "tailwind-v4"); // @theme custom properties
format(scale, "css-vars"); // :root custom properties
format(scale, "tailwind-config"); // { color: { 50: "...", ... } }
format(scale, "json"); // flat stop→hex map
format(scale, "hex-array"); // ["#...", ...] lightest→darkest
```

Pass `{ name }` in options to set the token name used in the emitted output
(e.g. `--color-brand-500`). It must be a CSS ident — a letter or underscore
followed by letters, digits, `-` or `_` — since it is spliced straight into the
emitted properties and keys; anything else throws.

`FORMATS` and `COLOR_SPACES` are exported alongside `STOPS` for building menus
and validating input:

```ts
import { FORMATS, COLOR_SPACES, STOPS } from "@shbernal/rampkit";
```

## Terminal preview — `@shbernal/rampkit/ansi`

A swatch-preview helper for terminals is exported at the `/ansi` subpath,
including `readableText(hex)` for picking a legible label color over a swatch.

```ts
import { readableText } from "@shbernal/rampkit/ansi";
```

The library is **ESM-only** and marked `"sideEffects": false`.
