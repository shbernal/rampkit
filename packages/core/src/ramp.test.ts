import { test, expect } from "bun:test";
import { rgb, inGamut } from "culori";
import { ramp, STOPS } from "./ramp";

const srgb = inGamut("rgb");

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
