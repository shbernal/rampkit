// Terminal preview — render a Ramp as 24-bit (truecolor) ANSI swatches.
//
// Shared by the CLI's `--preview` flag and the TUI, so a ramp looks identical
// however it's surfaced. Pure string output, no terminal/IO dependencies.

import { rgb } from "culori";
import type { Ramp } from "./ramp.js";

const RESET = "\x1b[0m";

/** Choose black or white foreground for legibility on a given hex background,
 *  using the standard sRGB relative-luminance threshold. */
export function readableText(hex: string): "#000000" | "#ffffff" {
  const c = rgb(hex);
  if (!c) return "#000000";
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  return luminance > 0.4 ? "#000000" : "#ffffff";
}

function to255(hex: string): [number, number, number] {
  const c = rgb(hex);
  if (!c) return [0, 0, 0];
  return [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)];
}

function bg([r, g, b]: [number, number, number]): string {
  return `\x1b[48;2;${r};${g};${b}m`;
}

function fg([r, g, b]: [number, number, number]): string {
  return `\x1b[38;2;${r};${g};${b}m`;
}

export interface SwatchOptions {
  /** Width of the color block in characters. Default 16. */
  blockWidth?: number;
}

/** Center `text` within `width` characters of padding. */
function center(text: string, width: number): string {
  if (text.length >= width) return text;
  const left = Math.floor((width - text.length) / 2);
  return " ".repeat(left) + text + " ".repeat(width - text.length - left);
}

/** Render one ramp stop as a colored row: `<stop>  <color block showing its hex>`. */
export function swatchLine(stop: number | string, hex: string, options: SwatchOptions = {}): string {
  const blockWidth = options.blockWidth ?? 16;
  const label = String(stop).padStart(4, " ");
  const inner = center(hex, blockWidth);
  const block = `${bg(to255(hex))}${fg(to255(readableText(hex)))}${inner}${RESET}`;
  return `${label}  ${block}`;
}

/** Render a full ramp as a block of truecolor swatch lines (lightest → darkest). */
export function swatches(ramp: Ramp, options: SwatchOptions = {}): string {
  return Object.entries(ramp)
    .map(([stop, hex]) => swatchLine(stop, hex, options))
    .join("\n");
}
