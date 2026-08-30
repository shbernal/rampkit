import { test, expect } from "bun:test";
import { ramp, STOPS } from "./ramp.js";
import { swatches, swatchLine, readableText } from "./ansi.js";
import type { ColorSpace } from "./ramp.js";

const SPACES: ColorSpace[] = ["hex", "rgb", "hsl", "oklch"];

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

test("rows run lightest to darkest", () => {
  const scale = ramp("#0ea5e9");
  const lines = swatches(scale).split("\n");
  expect(lines[0]).toContain(scale[50]);
  expect(lines.at(-1)).toContain(scale[950]);
});

test("readableText picks a legible foreground and accepts any syntax", () => {
  expect(readableText("#ffffff")).toBe("#000000");
  expect(readableText("#000000")).toBe("#ffffff");
  // Bare hex (a hexHash:false ramp) and non-hex syntaxes parse the same.
  expect(readableText("ffffff")).toBe("#000000");
  expect(readableText("oklch(0.2 0.05 250)")).toBe("#ffffff");
  expect(readableText("not-a-color")).toBe("#000000");
});
