// Terminal preview — render a Ramp as 24-bit (truecolor) ANSI swatches.
//
// Used by the CLI's `--preview` flag; the TUI paints its own blocks but shares
// the foreground-contrast rule from here, so labels stay legible the same way in
// both. Pure string output, no terminal/IO dependencies.

import { rgb } from "culori";
import type { Rgb } from "culori";
import { atStop, STOPS } from "./ramp.js";
import type { Ramp } from "./ramp.js";

const RESET = "\x1b[0m";
const BLACK = "#000000";
const WHITE = "#ffffff";

/** Width of the color block, unless a ramp needs more room for its values. */
const DEFAULT_BLOCK_WIDTH = 16;

/** Undo the sRGB transfer function for one channel, giving linear light.
 *  0.04045 is the sRGB spec knee; WCAG's older 0.03928 gives the same answer
 *  here, since no 8-bit channel value falls between the two. */
const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

/** Relative luminance of an already-parsed color, so callers that have one
 *  don't pay for a second parse. */
const luminance = (c: Rgb): number => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);

// Biased well above WCAG's ~0.179 crossover: on a terminal, black-on-mid-tone
// reads better than white does, so mid-tones get black text. Tuned by eye, not
// taken from a standard.
const DARK_TEXT_ABOVE = 0.4;

/** Foreground for an already-parsed background, so callers holding an Rgb don't
 *  pay for a second parse. The threshold lives here and nowhere else. */
const readableOver = (c: Rgb): typeof BLACK | typeof WHITE => (luminance(c) > DARK_TEXT_ABOVE ? BLACK : WHITE);

/**
 * Choose a black or white foreground for legibility over a given background.
 *
 * @param color - Any CSS color string culori parses, including bare hex.
 */
export function readableText(color: string): typeof BLACK | typeof WHITE {
  const c = rgb(color);
  // An unparseable color says nothing about what it will be drawn on, and the
  // caller owns that background — unlike swatchLine below, which paints its own.
  if (!c) return BLACK;
  return readableOver(c);
}

function to255(c: Rgb): [number, number, number] {
  return [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)];
}

function bg([r, g, b]: [number, number, number]): string {
  return `\x1b[48;2;${r};${g};${b}m`;
}

function fg([r, g, b]: [number, number, number]): string {
  return `\x1b[38;2;${r};${g};${b}m`;
}

export interface SwatchOptions {
  /**
   * Minimum width of the color block, in characters. A block always grows to
   * fit its value, and {@link swatches} widens every block to the widest value
   * in the ramp so the column keeps a straight edge.
   * @defaultValue 16
   */
  blockWidth?: number;
}

/** Center `text` within `width` characters of padding. */
function center(text: string, width: number): string {
  if (text.length >= width) return text;
  const left = Math.floor((width - text.length) / 2);
  return " ".repeat(left) + text + " ".repeat(width - text.length - left);
}

/**
 * Render one ramp stop as a colored row: `<stop>  <color block showing its value>`.
 *
 * @param stop - The stop number (or any label) shown at the left.
 * @param value - The stop's color, in any syntax culori parses.
 * @param options - See {@link SwatchOptions}.
 */
export function swatchLine(stop: number | string, value: string, options: SwatchOptions = {}): string {
  const label = String(stop).padStart(4, " ");
  const inner = center(value, options.blockWidth ?? DEFAULT_BLOCK_WIDTH);

  // One parse feeds both the background and the contrast decision. An
  // unparseable value paints a black block, so it takes the foreground black
  // would get — otherwise the label is painted invisible.
  const c = rgb(value);
  const back: [number, number, number] = c ? to255(c) : [0, 0, 0];
  const front: [number, number, number] = (c ? readableOver(c) : WHITE) === BLACK ? [0, 0, 0] : [255, 255, 255];

  return `${label}  ${bg(back)}${fg(front)}${inner}${RESET}`;
}

/**
 * Render a full ramp as a block of truecolor swatch lines (lightest → darkest).
 *
 * Every block is widened to the ramp's longest value, so a preview in a verbose
 * syntax like `oklch()` still lines up.
 */
export function swatches(ramp: Ramp, options: SwatchOptions = {}): string {
  const rows = STOPS.map((stop) => [stop, atStop(ramp, stop)] as const);
  const blockWidth = Math.max(options.blockWidth ?? DEFAULT_BLOCK_WIDTH, ...rows.map(([, value]) => value.length));
  return rows.map(([stop, value]) => swatchLine(stop, value, { blockWidth })).join("\n");
}
