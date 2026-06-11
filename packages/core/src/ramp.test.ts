import { test, expect } from "bun:test";
import { rgb, inGamut } from "culori";
import { ramp, STOPS } from "./ramp";
import type { ColorSpace } from "./ramp";

const srgb = inGamut("rgb");
const SPACES: ColorSpace[] = ["hex", "rgb", "hsl", "oklch"];

/** True if a parsed color sits within sRGB, allowing for display-rounding slop. */
const nearlyInGamut = (value: string): boolean => {
  const c = rgb(value);
  if (!c) return false;
  // Gamut-clamped stops sit on the sRGB boundary; 4-sig-fig rounding of oklch
  // can nudge a channel a few thousandths past it (browsers gamut-map oklch()).
  const eps = 5e-3;
  return [c.r, c.g, c.b].every((v) => v >= -eps && v <= 1 + eps);
};

test("produces all 11 Tailwind stops", () => {
  const scale = ramp("#451dc7");
  expect(Object.keys(scale).map(Number)).toEqual([...STOPS]);
});

test("preserves the exact input color at its anchor stop", () => {
  const input = "#451dc7";
  const scale = ramp(input);
  const hexes = Object.values(scale);
  expect(hexes).toContain(input);
});

test("honors an explicit anchor stop", () => {
  const input = "#451dc7";
  const scale = ramp(input, { anchor: 700 });
  expect(scale[700]).toBe(input);
});

test("every stop is a valid in-gamut sRGB hex", () => {
  const scale = ramp("#0ea5e9");
  for (const hex of Object.values(scale)) {
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    const c = rgb(hex);
    expect(c).toBeDefined();
    expect(srgb(c!)).toBe(true);
  }
});

test("lightness decreases monotonically from 50 to 950", () => {
  const scale = ramp("#0ea5e9");
  const lums = STOPS.map((s) => {
    const c = rgb(scale[s])!;
    return c.r + c.g + c.b;
  });
  for (let i = 1; i < lums.length; i++) {
    expect(lums[i]!).toBeLessThanOrEqual(lums[i - 1]!);
  }
});

test("throws on unparseable input", () => {
  expect(() => ramp("not-a-color")).toThrow();
});

test("accepts non-hex CSS color inputs", () => {
  expect(() => ramp("rebeccapurple")).not.toThrow();
  expect(() => ramp("oklch(0.7 0.15 250)")).not.toThrow();
});

test("emits each color space tagged and in-gamut", () => {
  const tag: Record<ColorSpace, RegExp> = {
    hex: /^#[0-9a-f]{6}$/,
    rgb: /^rgb\(/,
    hsl: /^hsl\(/,
    oklch: /^oklch\(/,
  };
  for (const space of SPACES) {
    const scale = ramp("#0ea5e9", { colorSpace: space });
    for (const value of Object.values(scale)) {
      expect(value).toMatch(tag[space]);
      expect(nearlyInGamut(value)).toBe(true);
    }
  }
});

test("preserves the input at the anchor across color spaces", () => {
  const input = "#0ea5e9";
  const want = rgb(input)!;
  for (const space of SPACES) {
    const scale = ramp(input, { colorSpace: space, anchor: 500 });
    const got = rgb(scale[500])!;
    expect(got.r).toBeCloseTo(want.r, 1);
    expect(got.g).toBeCloseTo(want.g, 1);
    expect(got.b).toBeCloseTo(want.b, 1);
  }
});

test("oklch output is rounded for readability", () => {
  const scale = ramp("#0ea5e9", { colorSpace: "oklch" });
  // Each component already equals its 4-significant-digit rounding.
  for (const value of Object.values(scale)) {
    for (const part of value.slice(6, -1).split(" ")) {
      const n = Number(part);
      expect(n).toBe(Number(n.toPrecision(4)));
    }
  }
});

test("default color space stays hex", () => {
  const scale = ramp("#0ea5e9");
  for (const value of Object.values(scale)) {
    expect(value).toMatch(/^#[0-9a-f]{6}$/);
  }
});
