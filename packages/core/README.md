# @shbernal/rampkit

Give it one color and get the whole Tailwind-style scale around it, `50` through
`950`, in whichever output format your project wants. Your color survives
untouched at the stop its lightness belongs to. ESM only.

```bash
bun add @shbernal/rampkit
```

```ts
import { ramp, format } from "@shbernal/rampkit";

const scale = ramp("#451dc7"); // { 50: "...", ..., 950: "..." }
format(scale, "tailwind-v4"); // @theme custom properties
format(scale, "css-vars"); // :root custom properties
format(scale, "tailwind-config"); // { color: { 50: "...", ... } }
format(scale, "json"); // flat stop to hex map
format(scale, "hex-array"); // ["#...", ...] lightest to darkest
```

`ramp(input, options)` takes any CSS color string culori understands. The options
are `anchor`, `chroma`, `hueShift`, `lMin`, `lMax`, and `colorSpace`, the syntax
each stop is written in (`hex` by default, or `rgb`, `hsl`, `oklch`):

```ts
ramp("#0ea5e9", { colorSpace: "oklch" }); // { 500: "oklch(0.601 0.132 237.3)", ... }
```

Values are serialized from the engine's internal OKLCH, so `oklch` is lossless,
and every stop is gamut-mapped into sRGB whatever syntax you ask for. The
`@shbernal/rampkit/ansi` subpath has a terminal swatch preview that renders any
syntax as 24-bit sRGB.

Full API reference:
[docs/library.md](https://github.com/shbernal/rampkit/blob/main/docs/library.md).
For the CLI and the interactive TUI, see
[`@shbernal/rampkit-cli`](https://www.npmjs.com/package/@shbernal/rampkit-cli).

## License

[MIT](./LICENSE) © shbernal
