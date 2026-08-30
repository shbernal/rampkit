// Ramp generation in OKLCH.
//
// Method (an independent implementation of the well-known 3-anchor approach):
//   1. Parse the input color and read its OKLCH lightness/chroma/hue.
//   2. Pick the anchor stop — the stop whose reference lightness is closest to
//      the input's (or an explicit override). The exact input is preserved there.
//   3. Distribute lightness by interpolating between three anchors:
//        stop 0    -> lMax (near white)
//        anchor    -> input lightness
//        stop 1000 -> lMin (near black)
//      (stops 0 and 1000 are virtual bookends so the real 50/950 ends stay off
//      pure white/black. An input lighter than lMax or darker than lMin widens
//      the bookend it sits past, so the ramp compresses instead of inverting.)
//   4. Keep the input hue (optional per-stop drift) and chroma (optional global
//      multiplier), then gamut-map each stop into sRGB by reducing chroma —
//      which naturally tapers saturation at the light and dark extremes. The
//      anchor is gamut-mapped too: a no-op for in-gamut input, and the only way
//      an out-of-gamut input stays consistent with its neighbours.
//
// Lightness is distributed linearly in stop index between those anchors.
// REFERENCE_L is consulted only to pick the anchor, so a generated ramp sits
// alongside the Tailwind families without tracking their exact curve.

import { oklch, formatHex, formatRgb, formatHsl, clampChroma } from "culori";
import type { Color } from "culori";

export const STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type Stop = (typeof STOPS)[number];
export type Ramp = Record<Stop, string>;

/** Color syntax used for each value in the ramp. */
export type ColorSpace = "hex" | "rgb" | "hsl" | "oklch";

/** Round to ~4 significant digits for readable oklch() output. */
const sig = (n: number): number => Number(n.toPrecision(4));

/**
 * Serialize a culori color (or color string) into the requested CSS syntax.
 * `hexHash` and `hexCase` shape the `"hex"` space only; other spaces ignore them.
 */
function serialize(color: Color | string, space: ColorSpace, hexHash: boolean, hexCase: "lower" | "upper"): string {
  switch (space) {
    case "hex": {
      let hex = formatHex(color) ?? "#000000";
      if (hexCase === "upper") hex = hex.toUpperCase();
      if (!hexHash) hex = hex.replace(/^#/, "");
      return hex;
    }
    case "rgb":
      return formatRgb(color) ?? "rgb(0 0 0)";
    case "hsl":
      return formatHsl(color) ?? "hsl(0 0% 0%)";
    case "oklch": {
      const c = oklch(color);
      if (!c) return "oklch(0 0 0)";
      return `oklch(${sig(c.l)} ${sig(c.c)} ${sig(c.h ?? 0)})`;
    }
  }
}

/** Reference OKLCH lightness per stop, used to auto-pick the anchor. Approximates
 *  the Tailwind v4 default families so generated ramps sit naturally alongside them. */
const REFERENCE_L: Record<Stop, number> = {
  50: 0.971,
  100: 0.936,
  200: 0.885,
  300: 0.808,
  400: 0.704,
  500: 0.637,
  600: 0.577,
  700: 0.505,
  800: 0.443,
  900: 0.391,
  950: 0.262,
};

export interface RampOptions {
  /**
   * Force the stop where the input color is preserved.
   * @defaultValue the stop whose reference lightness is nearest the input's
   */
  anchor?: Stop;
  /**
   * OKLCH lightness at the virtual stop 0 (near white). Widened automatically
   * when the input is lighter than this, so the ramp never inverts.
   * @defaultValue 0.995
   */
  lMax?: number;
  /**
   * OKLCH lightness at the virtual stop 1000 (near black). Widened
   * automatically when the input is darker than this, so the ramp never
   * inverts.
   * @defaultValue 0.18
   */
  lMin?: number;
  /**
   * Degrees of hue drift applied across the full 0→1000 range (0 = single hue).
   * @defaultValue 0
   */
  hueShift?: number;
  /**
   * Global multiplier on the input chroma.
   * @defaultValue 1
   */
  chroma?: number;
  /**
   * Output color syntax for each stop.
   * @defaultValue "hex"
   */
  colorSpace?: ColorSpace;
  /**
   * Emit the leading `#` on `"hex"` output. Set `false` for bare hex (e.g.
   * Office/PptxGenJS color form). Ignored for non-hex color spaces.
   * @defaultValue true
   */
  hexHash?: boolean;
  /**
   * Letter case for `"hex"` output. Ignored for non-hex color spaces.
   * @defaultValue "lower"
   */
  hexCase?: "lower" | "upper";
}

function nearestStop(l: number): Stop {
  let best: Stop = 500;
  let bestDelta = Infinity;
  for (const stop of STOPS) {
    const delta = Math.abs(REFERENCE_L[stop] - l);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = stop;
    }
  }
  return best;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Generate a Tailwind-style 50–950 ramp from a single input color.
 *
 * Accepts any CSS color string culori understands (hex, `rgb()`, `hsl()`,
 * `oklch()`, named colors, …). Each stop is emitted in the requested
 * `colorSpace` (`"hex"` by default); the exact input is preserved at its anchor
 * stop. The returned {@link Ramp} is a plain object keyed by numeric stop, ready
 * to embed in design tokens — pass it to {@link format} for a string output.
 *
 * @param input - Any CSS color string (e.g. `"#451dc7"`, `"rebeccapurple"`, `"oklch(0.6 0.2 270)"`).
 * @param options - See {@link RampOptions}.
 * @returns A {@link Ramp}: `{ 50, 100, …, 950 }` mapping each stop to a color string.
 * @throws If `input` cannot be parsed as a color, or if `lMin`/`lMax` are not
 *   finite numbers with `lMin < lMax`.
 *
 * @example Default ramp, preserving the input at its nearest stop
 * ```ts
 * ramp("#451dc7");
 * // { 50: "#eff0ff", …, 800: "#451dc7", …, 950: "#1c0061" }
 * ```
 *
 * @example Force the anchor stop and emit bare uppercase hex (Office/PptxGenJS form)
 * ```ts
 * ramp("#451DC7", { anchor: 800, hexHash: false, hexCase: "upper" });
 * // { 50: "EFF0FF", …, 800: "451DC7", …, 950: "1C0061" }
 * ```
 */
export function ramp(input: string, options: RampOptions = {}): Ramp {
  const base = oklch(input);
  if (!base) throw new Error(`rampkit: could not parse color "${input}"`);

  const baseL = base.l;
  const baseC = base.c;
  const baseH = base.h ?? 0;

  const lMaxOpt = options.lMax ?? 0.995;
  const lMinOpt = options.lMin ?? 0.18;
  if (!Number.isFinite(lMinOpt) || !Number.isFinite(lMaxOpt) || lMinOpt >= lMaxOpt) {
    throw new Error(`rampkit: lMin (${lMinOpt}) must be a finite number below lMax (${lMaxOpt})`);
  }

  // The input's own lightness may sit outside [lMin, lMax] — a near-white color
  // forced to a dark stop, say. Let it define the extreme it sits past, so the
  // ramp compresses on the short side instead of inverting or collapsing.
  const lMax = Math.max(lMaxOpt, baseL);
  const lMin = Math.min(lMinOpt, baseL);

  const hueShift = options.hueShift ?? 0;
  const chromaMul = options.chroma ?? 1;
  const anchor = options.anchor ?? nearestStop(baseL);
  const colorSpace = options.colorSpace ?? "hex";
  const hexHash = options.hexHash ?? true;
  const hexCase = options.hexCase ?? "lower";

  const result = {} as Ramp;
  for (const stop of STOPS) {
    // The anchor keeps the input's own lightness, chroma and hue untouched; it
    // still goes through the gamut map, which is a no-op for in-gamut input and
    // keeps an out-of-gamut input consistent with its neighbours.
    const isAnchor = stop === anchor;

    const l = isAnchor
      ? baseL
      : stop < anchor
        ? lerp(lMax, baseL, stop / anchor)
        : lerp(baseL, lMin, (stop - anchor) / (1000 - anchor));

    const dist = (stop - anchor) / 1000;
    const h = baseH + hueShift * dist;
    const c = isAnchor ? baseC : baseC * chromaMul;

    const inGamut = clampChroma({ mode: "oklch", l, c, h }, "oklch");
    result[stop] = serialize(inGamut, colorSpace, hexHash, hexCase);
  }
  return result;
}
