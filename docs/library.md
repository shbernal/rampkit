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
and validating input, and the defaults are exported too, so a UI can show what
it will fall back to without restating the values:

```ts
import { FORMATS, COLOR_SPACES, STOPS } from "@shbernal/rampkit";
import { RAMP_DEFAULTS, DEFAULT_COLOR_SPACE, DEFAULT_NAME } from "@shbernal/rampkit";

RAMP_DEFAULTS; // { lMin: 0.18, lMax: 0.995, hueShift: 0, chroma: 1 }
DEFAULT_COLOR_SPACE; // "hex"
DEFAULT_NAME; // "color" — the token name format() uses
```

The first entry of `FORMATS` is the default output format.

## Rendering one ramp in several syntaxes

`ramp()` is `rampColors()` followed by `serializeRamp()`. Split them when you
need the same ramp in more than one syntax — the parse, interpolation and gamut
mapping happen once, and each extra syntax costs only the serialization:

```ts
import { rampColors, serializeRamp } from "@shbernal/rampkit";

const result = rampColors("#451dc7");
result.anchor; // 800 — the stop the input was preserved at
serializeRamp(result); // hex
serializeRamp(result, { colorSpace: "oklch" }); // same ramp, oklch()
```

`result.colors` holds the gamut-mapped OKLCH color per stop, as culori objects.
Read `result.anchor` rather than comparing values to find the anchor: two stops
can render identically, and for a near-black input two of them do.

## Terminal preview — `@shbernal/rampkit/ansi`

A swatch-preview helper for terminals is exported at the `/ansi` subpath,
including `readableText(hex)` for picking a legible label color over a swatch.

```ts
import { readableText } from "@shbernal/rampkit/ansi";
```

The library is **ESM-only** and marked `"sideEffects": false`.
