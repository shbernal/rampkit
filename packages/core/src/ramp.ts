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

/** Read one stop out of a per-stop map, failing the same way wherever a caller
 *  hands over an incomplete ramp — rather than a TypeError from one entry point
 *  and a silent black from another. Internal: not part of the public API. */
export function atStop<T>(map: Record<Stop, T>, stop: Stop): T {
  const value = map[stop] as T | undefined;
  if (value === undefined) throw new Error(`rampkit: ramp is missing stop ${stop}`);
  return value;
}

/** Every color syntax a ramp can be emitted in. */
export const COLOR_SPACES = ["hex", "rgb", "hsl", "oklch"] as const;

/** Color syntax used for each value in the ramp. */
export type ColorSpace = (typeof COLOR_SPACES)[number];

/** Round to ~4 significant digits for readable oklch() output. */
const sig = (n: number): number => Number(n.toPrecision(4));

/**
 * Serialize a culori color into the requested CSS syntax. `hexHash` and
 * `hexCase` shape the `"hex"` space only; other spaces ignore them.
 */
function serialize(color: Color, options: Required<SerializeOptions>): string {
  switch (options.colorSpace) {
    case "hex": {
      let hex = formatHex(color) ?? "#000000";
      if (options.hexCase === "upper") hex = hex.toUpperCase();
      if (!options.hexHash) hex = hex.replace(/^#/, "");
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

/**
 * Reference OKLCH lightness per stop, used to auto-pick the anchor, so a
 * generated ramp sits alongside the Tailwind families without tracking their
 * exact curve.
 *
 * The median lightness across all 26 Tailwind v4 default families at each stop,
 * derived from `tailwindcss` 4.3.3. The families disagree far too much for one
 * table to fit them all — yellow-500 sits at L 0.795, indigo-500 at 0.585 — so
 * the choice of summary is settled by how often a table maps a Tailwind color
 * back to the stop it came from: the median recovers 67.1% of them, a single
 * family 57.7%, the mean 54.5%.
 *
 * Re-derive with `bun run scripts/reference-l.ts` in this package; `ramp.test.ts`
 * asserts the two still agree, so a Tailwind upgrade that moves the palette
 * fails the suite rather than drifting quietly.
 *
 * Not re-exported from `index.ts`: it explains a default, it is not API.
 */
export const REFERENCE_L: Record<Stop, number> = {
  50: 0.984,
  100: 0.958,
  200: 0.919,
  300: 0.865,
  400: 0.716,
  500: 0.632,
  600: 0.568,
  700: 0.498,
  800: 0.435,
  900: 0.381,
  950: 0.266,
};

/** How a computed ramp is rendered into strings. */
export interface SerializeOptions {
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

/** Everything {@link ramp} accepts: the ramp geometry plus how to render it. */
export interface RampOptions extends SerializeOptions {
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
   * Any finite value works; the hue wraps.
   * @defaultValue 0
   */
  hueShift?: number;
  /**
   * Global multiplier on the input chroma. Must be finite and non-negative;
   * values past the sRGB limit are gamut-mapped back, not rejected.
   * @defaultValue 1
   */
  chroma?: number;
}

/** A computed ramp, before it is rendered into strings. */
export interface RampResult {
  /** The stop the input color was preserved at, whether picked or forced. */
  anchor: Stop;
  /** Gamut-mapped OKLCH color per stop. */
  colors: Record<Stop, Color>;
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
 * Compute a ramp without rendering it — the gamut-mapped OKLCH color at every
 * stop, plus the anchor that was resolved for it.
 *
 * The expensive half of {@link ramp}: parse, interpolate and gamut-map. Callers
 * that need the same ramp in several syntaxes (a preview beside an export, say)
 * run this once and pass the result to {@link serializeRamp} per syntax.
 *
 * @param input - Any CSS color string (e.g. `"#451dc7"`, `"rebeccapurple"`, `"oklch(0.6 0.2 270)"`).
 * @param options - The geometry half of {@link RampOptions}; serialization options are ignored.
 * @returns A {@link RampResult}.
 * @throws If `input` cannot be parsed as a color, if `lMin`/`lMax` are not
 *   finite numbers with `lMin < lMax`, or if `chroma`/`hueShift` are not finite
 *   (`chroma` must also be non-negative).
 */
export function rampColors(input: string, options: RampOptions = {}): RampResult {
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
  if (!Number.isFinite(hueShift)) throw new Error(`rampkit: hueShift must be a finite number, got ${hueShift}`);
  // A non-finite multiplier sends clampChroma searching against an infinite
  // bound, which never converges — it hangs rather than returning nonsense.
  if (!Number.isFinite(chromaMul) || chromaMul < 0) {
    throw new Error(`rampkit: chroma must be a finite number of at least 0, got ${chromaMul}`);
  }
  const anchor = options.anchor ?? nearestStop(baseL);

  const colors = {} as Record<Stop, Color>;
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

    colors[stop] = clampChroma({ mode: "oklch", l, c, h }, "oklch");
  }
  return { anchor, colors };
}

/**
 * Render a {@link RampResult} into color strings — the cheap half of
 * {@link ramp}, safe to call repeatedly on one computed ramp.
 *
 * @param result - A ramp from {@link rampColors}.
 * @param options - See {@link SerializeOptions}.
 * @returns A {@link Ramp}: `{ 50, 100, …, 950 }` mapping each stop to a color string.
 */
export function serializeRamp(result: RampResult, options: SerializeOptions = {}): Ramp {
  const resolved: Required<SerializeOptions> = {
    colorSpace: options.colorSpace ?? "hex",
    hexHash: options.hexHash ?? true,
    hexCase: options.hexCase ?? "lower",
  };

  const scale = {} as Ramp;
  for (const stop of STOPS) scale[stop] = serialize(atStop(result.colors, stop), resolved);
  return scale;
}

/**
 * Generate a Tailwind-style 50–950 ramp from a single input color.
 *
 * Accepts any CSS color string culori understands (hex, `rgb()`, `hsl()`,
 * `oklch()`, named colors, …). Each stop is emitted in the requested
 * `colorSpace` (`"hex"` by default); the exact input is preserved at its anchor
 * stop. The returned {@link Ramp} is a plain object keyed by numeric stop, ready
 * to embed in design tokens — pass it to {@link format} for a string output.
 *
 * Shorthand for {@link rampColors} followed by {@link serializeRamp}; reach for
 * those directly to render one ramp in more than one syntax, or to read back the
 * anchor that was resolved.
 *
 * @param input - Any CSS color string (e.g. `"#451dc7"`, `"rebeccapurple"`, `"oklch(0.6 0.2 270)"`).
 * @param options - See {@link RampOptions}.
 * @returns A {@link Ramp}: `{ 50, 100, …, 950 }` mapping each stop to a color string.
 * @throws If `input` cannot be parsed as a color, if `lMin`/`lMax` are not
 *   finite numbers with `lMin < lMax`, or if `chroma`/`hueShift` are not finite
 *   (`chroma` must also be non-negative).
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
  return serializeRamp(rampColors(input, options), options);
}
