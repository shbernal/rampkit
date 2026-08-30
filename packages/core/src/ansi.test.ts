import { test, expect } from "bun:test";
import { ramp, STOPS, COLOR_SPACES } from "./ramp.js";
import { swatches, swatchLine, readableText } from "./ansi.js";
import type { Ramp } from "./ramp.js";

const SPACES = COLOR_SPACES;

/** Row width with the ANSI escapes stripped. Matching the ESC byte is the point. */
// oxlint-disable-next-line no-control-regex
const visible = (line: string): number => line.replaceAll(/\x1b\[[\d;]*m/g, "").length;

test("every row is the same width, in every color space", () => {
  for (const space of SPACES) {
    const lines = swatches(ramp("#0ea5e9", { colorSpace: space })).split("\n");
    expect(lines.length).toBe(STOPS.length);
    const widths = new Set(lines.map(visible));
    expect(widths.size).toBe(1);
  }
});

test("blocks grow past blockWidth to fit a long value", () => {
  const long = swatches(ramp("#0ea5e9", { colorSpace: "oklch" }), { blockWidth: 4 });
  const value = ramp("#0ea5e9", { colorSpace: "oklch" })[50];
  expect(long.split("\n")[0]).toContain(value);
  // …and blockWidth still pads short values out.
  expect(visible(swatchLine(50, "#ffffff", { blockWidth: 30 }))).toBe(6 + 30);
});

test("emits a truecolor background/foreground pair and resets", () => {
  const line = swatchLine(500, "#0ea5e9");
  expect(line).toContain("\x1b[48;2;14;165;233m");
  expect(line.includes("\x1b[38;2;0;0;0m") || line.includes("\x1b[38;2;255;255;255m")).toBe(true);
  expect(line).toEndWith("\x1b[0m");
  expect(line).toStartWith(" 500  ");
});

test("an unparseable value degrades to a legible black block instead of throwing", () => {
  const line = swatchLine(500, "not-a-color");
  expect(line).toContain("\x1b[48;2;0;0;0m");
  // The block it paints is black, so the label has to be white to be read at all.
  expect(line).toContain("\x1b[38;2;255;255;255m");
  expect(line).toContain("not-a-color");
});

test("the foreground flips either side of the threshold", () => {
  // Around the tuned 0.4 crossover, not WCAG's ~0.179.
  const light = swatchLine(500, "oklch(0.75 0 0)");
  const dark = swatchLine(500, "oklch(0.6 0 0)");
  expect(light).toContain("\x1b[38;2;0;0;0m");
  expect(dark).toContain("\x1b[38;2;255;255;255m");
});

test("rows run lightest to darkest", () => {
  const scale = ramp("#0ea5e9");
  const lines = swatches(scale).split("\n");
  expect(lines[0]).toContain(scale[50]);
  expect(lines.at(-1)).toContain(scale[950]);
});

test("swatches rejects a ramp missing a stop", () => {
  const { 500: _dropped, ...partial } = ramp("#0ea5e9");
  expect(() => swatches(partial as Ramp)).toThrow(/missing stop 500/);
});

test("readableText picks a legible foreground and accepts any syntax", () => {
  expect(readableText("#ffffff")).toBe("#000000");
  expect(readableText("#000000")).toBe("#ffffff");
  // Bare hex (a hexHash:false ramp) and non-hex syntaxes parse the same.
  expect(readableText("ffffff")).toBe("#000000");
  expect(readableText("oklch(0.2 0.05 250)")).toBe("#ffffff");
  expect(readableText("not-a-color")).toBe("#000000");
});
