// Output formatters — the multi-format layer that turns a Ramp into the shape a
// given toolchain expects. This is the piece most generators omit.

import { atStop, STOPS } from "./ramp.js";
import type { Ramp } from "./ramp.js";

/** Every output target {@link format} understands. */
export const FORMATS = [
  "tailwind-v4", // @theme { --color-<name>-<stop>: <hex>; }
  "css-vars", // :root { --<name>-<stop>: <hex>; }
  "tailwind-config", // { <name>: { 50: "...", ... } } (JS/JSON object)
  "json", // { 50: "...", ... }
  "hex-array", // ["#...", ...] lightest → darkest
] as const;

export type Format = (typeof FORMATS)[number];

/** A token name safe to splice into a CSS custom property or an object key. */
const IDENT = /^[A-Za-z_][A-Za-z0-9_-]*$/;

export interface FormatOptions {
  /**
   * Token name used in variable/key output. Must be a CSS ident — a letter or
   * underscore followed by letters, digits, `-` or `_` — since it is spliced
   * straight into the emitted custom properties and keys.
   * @defaultValue "color"
   */
  name?: string;
}

/**
 * Render a {@link Ramp} as a string in the given target syntax.
 *
 * @param scale - A ramp from {@link ramp}.
 * @param target - The output {@link Format}.
 * @param options - See {@link FormatOptions}.
 * @throws If `name` is not a CSS ident, or `scale` is missing a stop.
 * @returns The formatted string (file/stdout-ready). For a plain object to embed
 * programmatically, use the {@link Ramp} returned by {@link ramp} directly.
 *
 * @example
 * ```ts
 * format(ramp("#451dc7"), "css-vars", { name: "brand" });
 * // :root {
 * //   --brand-50: #eff0ff;
 * //   …
 * // }
 * ```
 */
export function format(scale: Ramp, target: Format, options: FormatOptions = {}): string {
  const name = options.name ?? "color";
  if (!IDENT.test(name)) {
    throw new Error(`rampkit: invalid token name "${name}" (letters, digits, - and _ only, not starting with a digit)`);
  }

  // Walk STOPS rather than the ramp's own keys: "lightest → darkest" is a
  // documented part of the contract, not a side effect of JS key ordering.
  const entries = STOPS.map((stop) => [stop, atStop(scale, stop)] as const);
  const object = Object.fromEntries(entries);

  switch (target) {
    case "tailwind-v4":
      return `@theme {\n${entries.map(([s, h]) => `  --color-${name}-${s}: ${h};`).join("\n")}\n}`;
    case "css-vars":
      return `:root {\n${entries.map(([s, h]) => `  --${name}-${s}: ${h};`).join("\n")}\n}`;
    case "tailwind-config":
      return JSON.stringify({ [name]: object }, null, 2);
    case "json":
      return JSON.stringify(object, null, 2);
    case "hex-array":
      return JSON.stringify(entries.map(([, h]) => h));
  }
}
