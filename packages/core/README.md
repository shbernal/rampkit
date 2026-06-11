# @shbernal/rampkit

Generate Tailwind-style color ramps (`50`–`950`) from a single input color, with
multi-format output. The exact input is preserved at its natural stop. **ESM-only.**

```bash
bun add @shbernal/rampkit   # or: npm i @shbernal/rampkit
```

```ts
import { ramp, format } from "@shbernal/rampkit";

const scale = ramp("#451dc7"); // { 50: "...", ..., 950: "..." }
format(scale, "tailwind-v4"); // @theme custom properties
format(scale, "css-vars"); // :root custom properties
format(scale, "tailwind-config"); // { color: { 50: "...", ... } }
format(scale, "json"); // flat stop→hex map
format(scale, "hex-array"); // ["#...", ...] lightest→darkest
```

`ramp(input, options)` accepts any CSS color string culori understands. Options:
`anchor`, `chroma`, `hueShift`, `lMin`, `lMax`, and `colorSpace`
(`"hex"` · `"rgb"` · `"hsl"` · `"oklch"`, default `"hex"`) — the syntax each stop
is emitted in:

```ts
ramp("#0ea5e9", { colorSpace: "oklch" }); // { 500: "oklch(0.601 0.132 237.3)", ... }
```

Values are serialized from the engine's internal OKLCH (so `oklch` is lossless),
and every stop is gamut-mapped into sRGB regardless of syntax. A terminal
swatch-preview helper is available at the `@shbernal/rampkit/ansi` subpath; it
renders any syntax as 24-bit sRGB swatches.

For the CLI and interactive TUI, see
[`@shbernal/rampkit-cli`](https://www.npmjs.com/package/@shbernal/rampkit-cli).

## License

[MIT](./LICENSE) © shbernal
