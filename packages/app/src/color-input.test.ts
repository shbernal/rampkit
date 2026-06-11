import { test, expect } from "bun:test";
import { rgb } from "culori";
import { buildColor, clampText, toComps, COMP_RANGES, INPUT_FORMATS, COMP_LABELS } from "./color-input";

// buildColor — assembling + clamping the value handed to the engine.

test("hex notation passes the field through, trimmed", () => {
  expect(buildColor("hex", "  #0ea5e9 ", ["", "", ""])).toBe("#0ea5e9");
});

test("clamps out-of-range rgb components", () => {
  expect(buildColor("rgb", "", ["999", "300", "50"])).toBe("rgb(255 255 50)");
  expect(buildColor("rgb", "", ["-5", "1", "2"])).toBe("rgb(0 1 2)");
});

test("wraps hue and clamps the rest in hsl", () => {
  expect(buildColor("hsl", "", ["400", "50", "50"])).toBe("hsl(40 50% 50%)");
  expect(buildColor("hsl", "", ["-30", "150", "50"])).toBe("hsl(330 100% 50%)");
});

test("clamps oklch lightness/chroma and wraps hue", () => {
  expect(buildColor("oklch", "", ["1.5", "0.9", "120"])).toBe("oklch(1 0.4 120)");
  expect(buildColor("oklch", "", ["0.6", "0.1", "400"])).toBe("oklch(0.6 0.1 40)");
});

test("keeps in-range values exactly (no reformatting)", () => {
  expect(buildColor("oklch", "", ["0.637", "0.132", "237.3"])).toBe("oklch(0.637 0.132 237.3)");
});

test("returns '' for incomplete or non-numeric components", () => {
  expect(buildColor("rgb", "", ["10", "", "20"])).toBe("");
  expect(buildColor("rgb", "", ["10", "abc", "20"])).toBe("");
  expect(buildColor("oklch", "", ["", "", ""])).toBe("");
});

// clampText — what a field snaps to when focus leaves it.

const hue = COMP_RANGES.hsl[0]; // { 0..360, wrap }
const unit = COMP_RANGES.oklch[0]; // { 0..1 }
const byte = COMP_RANGES.rgb[0]; // { 0..255 }

test("clampText snaps out-of-range and wraps hue", () => {
  expect(clampText("300", byte)).toBe("255");
  expect(clampText("-4", byte)).toBe("0");
  expect(clampText("1.5", unit)).toBe("1");
  expect(clampText("400", hue)).toBe("40");
  expect(clampText("-30", hue)).toBe("330");
});

test("clampText preserves valid text verbatim, including decimals", () => {
  expect(clampText("0.50", unit)).toBe("0.50");
  expect(clampText("200", byte)).toBe("200");
});

test("clampText leaves empty/non-numeric text untouched", () => {
  expect(clampText("", byte)).toBe("");
  expect(clampText("abc", byte)).toBe("abc");
});

// toComps — re-expressing a color in another notation's fields.

test("toComps yields exact rgb byte components", () => {
  expect(toComps("#0ea5e9", "rgb")).toEqual(["14", "165", "233"]);
});

test("toComps round-trips back to the same color via buildColor", () => {
  const input = "#0ea5e9";
  const want = rgb(input)!;
  for (const fmt of ["oklch", "rgb", "hsl"] as const) {
    const rebuilt = buildColor(fmt, "", toComps(input, fmt));
    const got = rgb(rebuilt)!;
    expect(got.r).toBeCloseTo(want.r, 1);
    expect(got.g).toBeCloseTo(want.g, 1);
    expect(got.b).toBeCloseTo(want.b, 1);
  }
});

test("toComps returns blanks for an unparseable color", () => {
  expect(toComps("not-a-color", "oklch")).toEqual(["", "", ""]);
});

// Tables stay aligned across notations.

test("every input notation has three component labels and ranges", () => {
  for (const fmt of INPUT_FORMATS) {
    expect(COMP_LABELS[fmt]).toHaveLength(3);
    expect(COMP_RANGES[fmt]).toHaveLength(3);
  }
});
