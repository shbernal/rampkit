// Contrast — answer which stop of a ramp can carry text.
//
// The ramp engine made the eleven colors and knows their lightness; without this
// the caller converts them back and measures somewhere else, which is how a ramp
// ends up deepened by trial and error until its 600 clears 4.5:1.
//
// The numbers are WCAG 2.1 relative luminance and contrast ratio, the rule the
// gates actually apply. `ansi.ts` shares the luminance half so the transfer
// function is written once.

import { rgb } from "culori";
import type { Rgb } from "culori";
import { atStop, STOPS } from "./ramp.js";
import type { Ramp, Stop } from "./ramp.js";

/** Undo the sRGB transfer function for one channel, giving linear light.
 *  0.04045 is the sRGB spec knee; WCAG's older 0.03928 gives the same answer for
 *  8-bit input, since no channel value falls between the two. */
const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

/** WCAG relative luminance of an already-parsed color, so callers that have one
 *  don't pay for a second parse. Internal: not part of the public API. */
export const luminance = (c: Rgb): number => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);

function parse(color: string, label: string): Rgb {
  if (typeof color !== "string") {
    throw new TypeError(`rampkit: expected a color string for ${label}, got ${color === null ? "null" : typeof color}`);
  }
  const parsed = rgb(color);
  if (!parsed) throw new Error(`rampkit: could not parse color "${color}"`);
  return parsed;
}

/** The ratio WCAG 2.1 calls AA for body text. */
export const DEFAULT_TARGET = 4.5;

/**
 * WCAG 2.1 contrast ratio between two colors, from 1 (identical) to 21 (black
 * on white). Order does not matter.
 *
 * @param a - Any CSS color string culori parses, bare hex included.
 * @param b - The other one.
 * @throws If either color is not a string, or is a string culori cannot parse.
 *
 * @example
 * ```ts
 * contrast("#ffffff", "#767676"); // 4.54
 * ```
 */
export function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(parse(a, "a")), luminance(parse(b, "b"))];
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** What one stop is worth against a set of foregrounds. */
export interface StopContrast {
  /** The stop measured. */
  stop: Stop;
  /** Its color, as the ramp spells it. */
  color: string;
  /** Contrast against each foreground, in the order they were given. */
  ratios: number[];
  /** The weakest of those — what the stop is worth to whichever foreground
   *  reads it worst, and the number {@link contrastStop} gates on. */
  min: number;
}

/**
 * Measure every stop of a ramp against one or more foregrounds.
 *
 * The report leaves the policy to the caller, which is the honest shape: a ramp
 * is usually read by more than one foreground, at different stops, and which
 * pairs matter is the consumer's business rather than this function's.
 *
 * @param scale - A ramp from {@link ramp}, in any color syntax culori parses.
 * @param foregrounds - The colors that will sit on it, e.g. `["#ffffff", "#111111"]`.
 * @returns One entry per stop, lightest → darkest.
 * @throws If `scale` is missing a stop, or any color cannot be parsed.
 *
 * @example
 * ```ts
 * contrastReport(ramp("#e11d48"), ["#ffffff"]).filter((s) => s.min >= 4.5);
 * // the stops that can carry white text
 * ```
 */
export function contrastReport(scale: Ramp, foregrounds: readonly string[]): StopContrast[] {
  if (foregrounds.length === 0) throw new Error("rampkit: contrastReport needs at least one foreground color");
  const fg = foregrounds.map((color, i) => luminance(parse(color, `foregrounds[${i}]`)));

  return STOPS.map((stop) => {
    const color = atStop(scale, stop);
    const bg = luminance(parse(color, `stop ${stop}`));
    const ratios = fg.map((l) => (l > bg ? (l + 0.05) / (bg + 0.05) : (bg + 0.05) / (l + 0.05)));
    return { stop, color, ratios, min: Math.min(...ratios) };
  });
}

/** How {@link contrastStop} picks among the stops that clear the target. */
export interface ContrastStopOptions {
  /**
   * Ratio every listed foreground has to clear.
   * @defaultValue 4.5, WCAG AA for body text
   */
  target?: number;
  /**
   * Which end to take the answer from, when several stops clear it.
   * @defaultValue "lightest"
   */
  prefer?: "lightest" | "deepest";
}

/**
 * The lightest (or deepest) stop that clears `target` against every foreground.
 *
 * Pass one foreground for the usual question — "how deep does this ramp have to
 * go before white text works on it". Passing both a light and a dark foreground
 * asks for a stop that carries either, which is close to unsatisfiable: the two
 * ratios of any color against pure white and pure black multiply to exactly 21,
 * so the best a single color can do against both is √21 ≈ 4.58, and against a
 * near-black like `#111111` it is 4.34. Expect `undefined` there, and reach for
 * {@link contrastReport} to see how far off it was.
 *
 * @param scale - A ramp from {@link ramp}.
 * @param foregrounds - The colors that will sit on it.
 * @param options - See {@link ContrastStopOptions}.
 * @returns The chosen {@link Stop}, or `undefined` if no stop clears the target.
 * @throws If `scale` is missing a stop, or any color cannot be parsed.
 *
 * @example
 * ```ts
 * contrastStop(ramp("#88C0D0"), ["#ffffff"]); // 700 — the 600 a role reads is too pale
 * ```
 */
export function contrastStop(
  scale: Ramp,
  foregrounds: readonly string[],
  options: ContrastStopOptions = {},
): Stop | undefined {
  const target = options.target ?? DEFAULT_TARGET;
  if (!Number.isFinite(target)) throw new Error(`rampkit: contrast target must be a finite number, got ${target}`);

  const report = contrastReport(scale, foregrounds);
  if (options.prefer === "deepest") report.reverse();
  return report.find((s) => s.min >= target)?.stop;
}
