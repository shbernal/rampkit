// Pure logic for the TUI's color-input pane: the notations a color can be typed
// in, the valid range of each component, and the conversions between a typed
// value and a CSS color string. Kept free of React/Ink so it can be unit-tested
// directly (see color-input.test.ts) — the component in tui.tsx is a thin shell
// over these functions.

import { oklch, rgb, hsl } from "culori";

// Input notations the color can be entered in. `hex` is a single free-text field
// (and accepts any CSS color string); the rest are three numeric components.
export const INPUT_FORMATS = ["hex", "oklch", "rgb", "hsl"] as const;
export type InputFormat = (typeof INPUT_FORMATS)[number];

/** The notations made of three numeric fields — everything except `hex`. The
 *  component maps below are keyed on this, so `hex` cannot reach them. */
export type ComponentFormat = Exclude<InputFormat, "hex">;
export const COMPONENT_FORMATS = INPUT_FORMATS.filter((f): f is ComponentFormat => f !== "hex");

export const COMP_LABELS: Record<ComponentFormat, [string, string, string]> = {
  oklch: ["L", "C", "H"],
  rgb: ["R", "G", "B"],
  hsl: ["H", "S", "L"],
};

// Valid range per component. Hue ranges `wrap` (mod the span) rather than clamp.
export interface Range {
  min: number;
  max: number;
  wrap?: boolean;
}
export const COMP_RANGES: Record<ComponentFormat, [Range, Range, Range]> = {
  oklch: [
    { min: 0, max: 1 },
    { min: 0, max: 0.4 },
    { min: 0, max: 360, wrap: true },
  ],
  rgb: [
    { min: 0, max: 255 },
    { min: 0, max: 255 },
    { min: 0, max: 255 },
  ],
  hsl: [
    { min: 0, max: 360, wrap: true },
    { min: 0, max: 100 },
    { min: 0, max: 100 },
  ],
};

// Deliberately not core's sig(): that one returns a number at a fixed precision
// for oklch() serialization, this one produces editable field text at a caller's
// precision. Sharing across the package boundary would couple display text to
// the wire format for one shared expression.
const round = (n: number, digits: number): string => String(Number(n.toPrecision(digits)));

/** Bring a number into a component's range; hue wraps, everything else clamps.
 *  The wrap is one remainder over the span (plus a correction for negatives), so
 *  for a range starting at 0 — every wrapping range here — a value already in
 *  range passes through exactly, without float-rounding noise. */
export const clampNum = (n: number, r: Range): number => {
  if (!r.wrap) return Math.min(r.max, Math.max(r.min, n));
  const span = r.max - r.min;
  const m = (n - r.min) % span;
  return r.min + (m < 0 ? m + span : m);
};

/** Clamp a field's text on commit, preserving the user's exact text when it's
 *  already valid (so decimals like "0.50" aren't reformatted mid-edit) and
 *  leaving empty/non-numeric text untouched (treated as incomplete elsewhere). */
export function clampText(raw: string, r: Range): string {
  const n = Number(raw);
  if (raw.trim() === "" || !Number.isFinite(n)) return raw;
  const v = clampNum(n, r);
  return v === n ? raw : String(Number(v.toFixed(4)));
}

/** Assemble a CSS color string from the active input notation's field values,
 *  clamping each component so the engine never receives out-of-range values.
 *  Returns "" when a component is missing or non-numeric (treated as incomplete). */
export function buildColor(fmt: InputFormat, hex: string, comps: [string, string, string]): string {
  if (fmt === "hex") return hex.trim();
  const ranges = COMP_RANGES[fmt];
  const vals: number[] = [];
  for (let i = 0; i < 3; i++) {
    const raw = comps[i]!.trim();
    const n = Number(raw);
    if (raw === "" || !Number.isFinite(n)) return "";
    vals.push(clampNum(n, ranges[i]!));
  }
  // Exhaustive over ComponentFormat: adding a notation is a compile error here
  // and in toComps, rather than quietly falling through to hsl().
  const [a, b, c] = vals;
  switch (fmt) {
    case "oklch":
      return `oklch(${a} ${b} ${c})`;
    case "rgb":
      return `rgb(${a} ${b} ${c})`;
    case "hsl":
      return `hsl(${a} ${b}% ${c}%)`;
  }
}

/** Re-express a color string as the three component fields of a target notation. */
export function toComps(color: string, fmt: ComponentFormat): [string, string, string] {
  switch (fmt) {
    case "oklch": {
      const c = oklch(color);
      return c ? [round(c.l, 4), round(c.c, 4), round(c.h ?? 0, 4)] : ["", "", ""];
    }
    case "rgb": {
      const c = rgb(color);
      return c
        ? [String(Math.round(c.r * 255)), String(Math.round(c.g * 255)), String(Math.round(c.b * 255))]
        : ["", "", ""];
    }
    case "hsl": {
      const c = hsl(color);
      return c
        ? [String(Math.round(c.h ?? 0)), String(Math.round(c.s * 100)), String(Math.round(c.l * 100))]
        : ["", "", ""];
    }
  }
}
