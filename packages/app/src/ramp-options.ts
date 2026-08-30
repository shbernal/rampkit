// The five geometry options `ramp()` accepts, as one table both front ends read:
// the CLI takes the accepted range of each flag, the TUI's ramp pane takes the
// same range plus how far one keypress moves within it. A bound stated twice is
// a bound that eventually disagrees with itself — a value the pane can dial to
// but `--chroma` rejects would be a bug in one of the two, with nothing to say
// which. Kept free of React/Ink so it can be unit-tested directly.

import { STOPS, RAMP_DEFAULTS } from "@shbernal/rampkit";
import type { RampOptions, Stop } from "@shbernal/rampkit";
// clampNum/Range are the input pane's, and are exactly the rule wanted here:
// clamp, except hues, which wrap. Shared rather than written a second time.
import { clampNum, type Range } from "./color-input.js";

/**
 * One numeric geometry option: the flag that sets it, the option key it maps to,
 * and the two ranges involved.
 *
 * `min`/`max` are the CLI's guardrails — deliberately tighter than core, which
 * accepts any finite chroma and any finite `lMin < lMax` — so a typo like
 * `-c 500` is a flag error rather than a ramp that silently clamps to the sRGB
 * boundary at every stop. A flag with no useful bound passes none.
 */
export interface NumericFlag {
  flag: "chroma" | "hue-shift" | "lmin" | "lmax";
  key: "chroma" | "hueShift" | "lMin" | "lMax";
  min?: number;
  max?: number;
  /**
   * The range the ramp pane's arrows move within. Defaults to `[min, max]`; only
   * hue drift sets it, because core accepts any finite value there (the hue
   * wraps) while a dial needs two ends.
   */
  dial?: Range;
  /** How far one ↑/↓ press moves the value; ←/→ moves COARSE_STEPS of these. */
  step: number;
  /** Decimals the value is rendered at, and rounded to after each step. */
  digits: number;
}

// Step sizes are picked so each default sits on the grid: stepping away and back
// lands on the exact default rather than near it.
export const NUMERIC: readonly NumericFlag[] = [
  { flag: "chroma", key: "chroma", min: 0, max: 10, step: 0.05, digits: 2 },
  { flag: "hue-shift", key: "hueShift", dial: { min: -180, max: 180, wrap: true }, step: 5, digits: 0 },
  { flag: "lmin", key: "lMin", min: 0, max: 1, step: 0.005, digits: 3 },
  { flag: "lmax", key: "lMax", min: 0, max: 1, step: 0.005, digits: 3 },
];

const BY_FLAG = Object.fromEntries(NUMERIC.map((n) => [n.flag, n])) as Record<NumericFlag["flag"], NumericFlag>;

/** The stop the input is pinned to, or `"auto"` for "whichever core picks". */
export type Anchor = Stop | "auto";

/** The ramp pane's state: core's geometry options, all of them always set. */
export interface RampSettings {
  anchor: Anchor;
  chroma: number;
  hueShift: number;
  lMin: number;
  lMax: number;
}

export const RAMP_SETTINGS_DEFAULTS: RampSettings = { anchor: "auto", ...RAMP_DEFAULTS };

/** The anchor's values in the order the scale is drawn — `auto` sits above stop
 *  50 — so ↓ always moves the `*` down the scale and ↑ always moves it up. */
export const ANCHORS: readonly Anchor[] = ["auto", ...STOPS];

/** The pane's fields, in Tab order. Labelled with the CLI's flag names, so the
 *  two front ends can be searched against each other. */
export type RampField = "anchor" | NumericFlag["flag"];
export const RAMP_FIELDS: readonly RampField[] = ["anchor", ...NUMERIC.map((n) => n.flag)];

/** The options to hand the engine. `"auto"` is the absence of an anchor, not a
 *  value core knows, so it is dropped rather than translated. */
export function toRampOptions(settings: RampSettings): RampOptions {
  const { anchor, ...geometry } = settings;
  return anchor === "auto" ? geometry : { ...geometry, anchor };
}

const round = (n: number, digits: number): number => Number(n.toFixed(digits));

/** The range one field's dial moves within, given the rest of the settings. */
function dial(settings: RampSettings, spec: NumericFlag): Range {
  if (spec.dial) return spec.dial;
  const min = spec.min ?? -Infinity;
  const max = spec.max ?? Infinity;
  // Core throws on `lMin >= lMax`, so the pair stop one step short of each other
  // rather than letting the pane reach a state the engine rejects — the error
  // would surface on a value the user is only passing through.
  if (spec.key === "lMin") return { min, max: Math.min(max, settings.lMax - spec.step) };
  if (spec.key === "lMax") return { min: Math.max(min, settings.lMin + spec.step), max };
  return { min, max };
}

/** Steps one ←/→ press covers, against the one step ↑/↓ moves. The ends of
 *  these ranges are far from the defaults the values live around — `chroma 8` is
 *  140 fine presses away — so the dials also move in tens. Ten keeps every
 *  coarse landing on the fine grid, so the two can be mixed freely. */
export const COARSE_STEPS = 10;

/**
 * Move one field by a keypress. Numeric fields clamp at their ends (a value that
 * wraps from 10 back to 0 under a held key is a trap), except hue drift, which
 * wraps like any other hue. The anchor walks {@link ANCHORS} and clamps at both
 * ends.
 *
 * @param dir - `1` for more, `-1` for less, for every field. The anchor moves
 *   *up* the scale on `1`, which is a step back through ANCHORS, since that list
 *   runs top-down.
 * @param steps - How many steps the press covers: 1 for ↑/↓, {@link COARSE_STEPS}
 *   for ←/→. A coarse press is one clamp, not ten — it stops at the end rather
 *   than being refused for overshooting it.
 */
export function stepField(settings: RampSettings, field: RampField, dir: 1 | -1, steps = 1): RampSettings {
  if (field === "anchor") {
    const i = ANCHORS.indexOf(settings.anchor) - dir * steps;
    return { ...settings, anchor: ANCHORS[Math.min(ANCHORS.length - 1, Math.max(0, i))]! };
  }
  const spec = BY_FLAG[field];
  const value = round(clampNum(settings[spec.key] + dir * steps * spec.step, dial(settings, spec)), spec.digits);
  return { ...settings, [spec.key]: value };
}

/** Widest rendering a field can take, so the row does not jitter as digits come
 *  and go. `auto` is the longest anchor; a number's ends bound its width. */
function width(field: RampField): number {
  if (field === "anchor") return 4;
  const spec = BY_FLAG[field];
  const { min, max } = dial(RAMP_SETTINGS_DEFAULTS, spec);
  return Math.max(min.toFixed(spec.digits).length, max.toFixed(spec.digits).length);
}

/** A field's value as the pane displays it, padded to a fixed width. */
export function fieldText(settings: RampSettings, field: RampField): string {
  const raw =
    field === "anchor" ? String(settings.anchor) : settings[BY_FLAG[field].key].toFixed(BY_FLAG[field].digits);
  return raw.padEnd(width(field));
}
