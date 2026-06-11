# @shbernal/rampkit

Generate Tailwind-style color ramps (`50`–`950`) from a single input color, with
multi-format output. The exact input is preserved at its natural stop. **ESM-only.**

```bash
bun add @shbernal/rampkit   # or: npm i @shbernal/rampkit
```

```ts
import { ramp, format } from "@shbernal/rampkit";

const scale = ramp("#451dc7");        // { 50: "...", ..., 950: "..." }
format(scale, "tailwind-v4");         // @theme custom properties
format(scale, "css-vars");            // :root custom properties
format(scale, "tailwind-config");     // { color: { 50: "...", ... } }
format(scale, "json");                // flat stop→hex map
format(scale, "hex-array");           // ["#...", ...] lightest→darkest
```

`ramp(input, options)` accepts any CSS color string culori understands. Options:
`anchor`, `chroma`, `hueShift`, `lMin`, `lMax`. A terminal swatch-preview helper
is available at the `@shbernal/rampkit/ansi` subpath.

For the CLI and interactive TUI, see
[`@shbernal/rampkit-cli`](https://www.npmjs.com/package/@shbernal/rampkit-cli).

## License

[MIT](./LICENSE) © shbernal
