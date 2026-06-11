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
//      pure white/black.)
//   4. Keep the input hue (optional per-stop drift) and chroma (optional global
//      multiplier), then gamut-map each stop into sRGB by reducing chroma —
//      which naturally tapers saturation at the light and dark extremes.

import { oklch, formatHex, formatRgb, formatHsl, clampChroma } from "culori";
import type { Color } from "culori";

export const STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type Stop = (typeof STOPS)[number];
export type Ramp = Record<Stop, string>;

/** Color syntax used for each value in the ramp. */
export type ColorSpace = "hex" | "rgb" | "hsl" | "oklch";

/** Round to ~4 significant digits for readable oklch() output. */
const sig = (n: number): number => Number(n.toPrecision(4));

/** Serialize a culori color (or color string) into the requested CSS syntax. */
function serialize(color: Color | string, space: ColorSpace): string {
  switch (space) {
    case "hex":
      return formatHex(color) ?? "#000000";
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
  /** Force the stop where the input color is preserved. Default: nearest by lightness. */
  anchor?: Stop;
  /** OKLCH lightness at the virtual stop 0 (near white). Default 0.995. */
  lMax?: number;
  /** OKLCH lightness at the virtual stop 1000 (near black). Default 0.18. */
  lMin?: number;
  /** Degrees of hue drift applied across the full 0→1000 range. Default 0 (single hue). */
  hueShift?: number;
  /** Global multiplier on the input chroma. Default 1. */
  chroma?: number;
  /** Output color syntax for each stop. Default "hex". */
  colorSpace?: ColorSpace;
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
 * Accepts any CSS color string culori understands (hex, rgb(), hsl(), oklch(),
 * named colors, …). Each stop is emitted in the requested `colorSpace`
 * (`hex` by default); the exact input is preserved at its anchor stop.
 */
export function ramp(input: string, options: RampOptions = {}): Ramp {
  const base = oklch(input);
  if (!base) throw new Error(`rampkit: could not parse color "${input}"`);

  const baseL = base.l;
  const baseC = base.c;
  const baseH = base.h ?? 0;

  const lMax = options.lMax ?? 0.995;
  const lMin = options.lMin ?? 0.18;
  const hueShift = options.hueShift ?? 0;
  const chromaMul = options.chroma ?? 1;
  const anchor = options.anchor ?? nearestStop(baseL);
  const colorSpace = options.colorSpace ?? "hex";

  const result = {} as Ramp;
  for (const stop of STOPS) {
    if (stop === anchor) {
      result[stop] = serialize(input, colorSpace);
      continue;
    }

    const l =
      stop < anchor
        ? lerp(lMax, baseL, stop / anchor)
        : lerp(baseL, lMin, (stop - anchor) / (1000 - anchor));

    const dist = (stop - anchor) / 1000;
    const h = baseH + hueShift * dist;
    const c = baseC * chromaMul;

    const inGamut = clampChroma({ mode: "oklch", l, c, h }, "oklch");
    result[stop] = serialize(inGamut, colorSpace);
  }
  return result;
}
