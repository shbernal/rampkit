# @shbernal/rampkit

Generate Tailwind-style color ramps (`50`–`950`) from a single input color — the
exact input is preserved at its natural stop — and emit the result in several
output formats, not just a Tailwind config object.

> Status: **early scaffold.** The ramp engine and formatters are being built.

## Why

Existing tools each miss something: they're web apps not libraries, support only
one input format, emit only a Tailwind config object, are unmaintained, or aren't
open source. `rampkit` aims to be: maintained, TypeScript, Tailwind v4-aware, an
installable npm package, broad input encodings, and **multi-format output** — all
under a permissive (MIT) license.

## Planned API (subject to change)

```ts
import { ramp, format } from "@shbernal/rampkit";

const scale = ramp("#451DC7");            // { 50: "...", ..., 950: "..." }
format(scale, "tailwind-v4");             // @theme CSS variables
format(scale, "css-vars");                // :root custom properties
format(scale, "json");                    // design-token JSON
```

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
