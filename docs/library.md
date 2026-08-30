# Library, `@shbernal/rampkit`

The ESM-only core library. Install it into your project:

```bash
bun add @shbernal/rampkit
```

## `ramp(input, options?)`

Build a `50` to `950` scale from one input color. The exact input survives at its
natural (anchor) stop.

```ts
import { ramp } from "@shbernal/rampkit";

const scale = ramp("#451dc7");
// { 50: "#...", 100: "#...", ..., 950: "#..." }
```

`input` is any CSS color string [culori](https://culorijs.org) understands: hex,
`rgb()`, `hsl()`, `oklch()`, named colors and the rest.

### Options

| Option          | Purpose                                                                            |
| --------------- | ---------------------------------------------------------------------------------- |
| `anchor`        | Force which stop the input color is pinned to. Otherwise it follows its lightness. |
| `chroma`        | Scale the chroma curve across the ramp.                                            |
| `hueShift`      | Drift the hue toward the light and dark ends.                                      |
| `lMin` / `lMax` | Clamp how dark the darkest stop and how light the lightest one get.                |
| `colorSpace`    | Syntax each stop is written in: `hex` (default), `rgb`, `hsl`, or `oklch`.         |

`lMin` has to be below `lMax`. Passed the other way round they throw, rather
than building the ramp upside down: interpolation runs happily in either
direction, so a reversed ramp is legible end to end and every contrast inside
it still holds. It only looks wrong, everywhere, for a reason nothing points at.

## `naturalStop(color)`

The stop a color belongs to on its own, which is the anchor `ramp()` picks when
you don't force one:

```ts
import { naturalStop } from "@shbernal/rampkit";

naturalStop("#88C0D0"); // 300
```

Worth checking when your roles read fixed stops. Forcing an anchor far from a
color's natural one is legal and quiet: the ramp is well-formed and the input
sits exactly where you asked for it, but the short side gets crowded. `#88C0D0`
pinned at `600` spends the whole light half on six pale cyans nobody can tell
apart, and one of them is a card's stroke against another as its fill. Comparing
the two numbers at authoring time is cheaper than counting swatches afterwards.

## `format(scale, format, options?)`

Render a scale into an output format:

```ts
import { ramp, format } from "@shbernal/rampkit";

const scale = ramp("#451dc7");
format(scale, "tailwind-v4"); // @theme custom properties
format(scale, "css-vars"); // :root custom properties
format(scale, "tailwind-config"); // { color: { 50: "...", ... } }
format(scale, "json"); // flat stop to hex map
format(scale, "hex-array"); // ["#...", ...] lightest to darkest
```

Pass `{ name }` to set the token name in the output, as in `--color-brand-500`.
It has to be a CSS ident, a letter or underscore followed by letters, digits, `-`
or `_`, because it is spliced straight into the emitted properties and keys.
Anything else throws.

`FORMATS` and `COLOR_SPACES` are exported alongside `STOPS` for building menus
and validating input. The defaults are exported too, so a UI can show what it
falls back to without restating the values:

```ts
import { FORMATS, COLOR_SPACES, STOPS } from "@shbernal/rampkit";
import { RAMP_DEFAULTS, DEFAULT_COLOR_SPACE, DEFAULT_NAME } from "@shbernal/rampkit";

RAMP_DEFAULTS; // { lMin: 0.18, lMax: 0.995, hueShift: 0, chroma: 1 }
DEFAULT_COLOR_SPACE; // "hex"
DEFAULT_NAME; // "color", the token name format() uses
```

The first entry of `FORMATS` is the default output format.

## One ramp in several syntaxes

`ramp()` is `rampColors()` followed by `serializeRamp()`. Split them when you
want the same ramp in more than one syntax. The parse, the interpolation and the
gamut mapping happen once, and each extra syntax costs only the serialization:

```ts
import { rampColors, serializeRamp } from "@shbernal/rampkit";

const result = rampColors("#451dc7");
result.anchor; // 800, the stop the input was preserved at
serializeRamp(result); // hex
serializeRamp(result, { colorSpace: "oklch" }); // same ramp, oklch()
```

`result.colors` holds the gamut-mapped OKLCH color per stop, as culori objects.
Read `result.anchor` instead of comparing values to find the anchor: two stops
can render identically, and for a near-black input two of them do.

## Terminal preview, `@shbernal/rampkit/ansi`

The swatch-preview helper for terminals lives at the `/ansi` subpath, along with
`readableText(hex)`, which picks a legible label color to sit over a swatch.

```ts
import { readableText } from "@shbernal/rampkit/ansi";
```

The library is ESM only and marked `"sideEffects": false`.
