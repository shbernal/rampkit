// Output formatters — the multi-format layer that turns a Ramp into the shape a
// given toolchain expects. This is the piece most generators omit.

import type { Ramp } from "./ramp";

export type Format =
  | "tailwind-v4" // @theme { --color-<name>-<stop>: <hex>; }
  | "css-vars" // :root { --<name>-<stop>: <hex>; }
  | "tailwind-config" // { <name>: { 50: "...", ... } } (JS/JSON object)
  | "json" // { 50: "...", ... }
  | "hex-array"; // ["#...", ...] lightest → darkest

export interface FormatOptions {
  /** Token name used in variable/key output. Default "color". */
  name?: string;
}

export function format(scale: Ramp, target: Format, options: FormatOptions = {}): string {
  const name = options.name ?? "color";
  const entries = Object.entries(scale);

  switch (target) {
    case "tailwind-v4":
      return `@theme {\n${entries.map(([s, h]) => `  --color-${name}-${s}: ${h};`).join("\n")}\n}`;
    case "css-vars":
      return `:root {\n${entries.map(([s, h]) => `  --${name}-${s}: ${h};`).join("\n")}\n}`;
    case "tailwind-config":
      return JSON.stringify({ [name]: scale }, null, 2);
    case "json":
      return JSON.stringify(scale, null, 2);
    case "hex-array":
      return JSON.stringify(entries.map(([, h]) => h));
  }
}
