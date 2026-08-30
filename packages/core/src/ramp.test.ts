import { test, expect } from "bun:test";
import { rgb, inGamut } from "culori";
import { ramp, rampColors, serializeRamp, STOPS } from "./ramp.js";
import type { ColorSpace } from "./ramp.js";

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

test("hexHash:false drops the leading # on hex output", () => {
  const scale = ramp("#0ea5e9", { hexHash: false });
  for (const value of Object.values(scale)) {
    expect(value).toMatch(/^[0-9a-f]{6}$/);
  }
});

test("hexCase:upper uppercases hex output and preserves the anchor", () => {
  const scale = ramp("#451DC7", { anchor: 800, hexHash: false, hexCase: "upper" });
  for (const value of Object.values(scale)) {
    expect(value).toMatch(/^[0-9A-F]{6}$/);
  }
  expect(scale[800]).toBe("451DC7");
});

test("hex options are ignored for non-hex color spaces", () => {
  const scale = ramp("#0ea5e9", { colorSpace: "rgb", hexHash: false, hexCase: "upper" });
  for (const value of Object.values(scale)) {
    expect(value).toMatch(/^rgb\(/);
  }
});

test("gamut-maps an out-of-gamut input at its anchor stop", () => {
  const scale = ramp("oklch(0.7 0.4 250)", { colorSpace: "oklch", anchor: 400 });
  for (const value of Object.values(scale)) {
    expect(nearlyInGamut(value)).toBe(true);
  }
  // The anchor used to keep the raw chroma, leaving it far outside the sRGB
  // boundary its neighbours were clamped to.
  const anchorChroma = Number(scale[400].slice(6, -1).split(" ")[1]);
  const neighbourChroma = Number(scale[300].slice(6, -1).split(" ")[1]);
  expect(anchorChroma).toBeLessThan(neighbourChroma * 2);
});

test("an out-of-gamut input yields no duplicated stops", () => {
  const scale = ramp("oklch(0.7 0.4 250)");
  expect(new Set(Object.values(scale)).size).toBe(STOPS.length);
});

test("round-trips an in-gamut input at its anchor in every color space", () => {
  const input = "#451dc7";
  const want = rgb(input)!;
  for (const space of SPACES) {
    for (const anchor of STOPS) {
      const got = rgb(ramp(input, { colorSpace: space, anchor })[anchor])!;
      expect(got.r).toBeCloseTo(want.r, 2);
      expect(got.g).toBeCloseTo(want.g, 2);
      expect(got.b).toBeCloseTo(want.b, 2);
    }
  }
  // Hex is exact, not merely close.
  expect(ramp(input, { anchor: 300 })[300]).toBe(input);
});

test("stays monotonic for any input and anchor, including past lMin/lMax", () => {
  const inputs = [
    "#000000",
    "#ffffff",
    "#0ea5e9",
    "#451dc7",
    "oklch(0.7 0.4 250)",
    "oklch(0.99 0.02 90)",
    "oklch(0.05 0.01 0)",
    "rebeccapurple",
  ];
  for (const input of inputs) {
    for (const anchor of STOPS) {
      const scale = ramp(input, { anchor });
      const lums = STOPS.map((s) => {
        const c = rgb(scale[s])!;
        return c.r + c.g + c.b;
      });
      for (let i = 1; i < lums.length; i++) {
        expect(lums[i]!).toBeLessThanOrEqual(lums[i - 1]!);
      }
      for (const value of Object.values(scale)) {
        expect(nearlyInGamut(value)).toBe(true);
      }
    }
  }
});

test("collapses rather than inverts when the input has no room left", () => {
  // Black at stop 50 leaves nothing darker to reach for, so the ramp flattens;
  // it used to invert instead, getting *lighter* as the stop number grew.
  const flat = ramp("#000000", { anchor: 50 });
  expect(new Set(Object.values(flat))).toEqual(new Set(["#000000"]));
  const white = ramp("#ffffff", { anchor: 950 });
  expect(new Set(Object.values(white))).toEqual(new Set(["#ffffff"]));
});

test("rejects a lightness range that is inverted, empty or non-finite", () => {
  expect(() => ramp("#0ea5e9", { lMin: 0.9, lMax: 0.2 })).toThrow(/lMin/);
  expect(() => ramp("#0ea5e9", { lMin: 0.5, lMax: 0.5 })).toThrow(/lMin/);
  expect(() => ramp("#0ea5e9", { lMin: Number.NaN })).toThrow(/lMin/);
  expect(() => ramp("#0ea5e9", { lMax: Number.POSITIVE_INFINITY })).toThrow(/lMin/);
  expect(() => ramp("#0ea5e9", { lMin: 0.2, lMax: 0.9 })).not.toThrow();
});

test("rejects option values that would never converge", () => {
  // An infinite multiplier sent the gamut search against an infinite bound and
  // hung the process rather than erroring.
  expect(() => ramp("#0ea5e9", { chroma: Number.POSITIVE_INFINITY })).toThrow(/chroma/);
  expect(() => ramp("#0ea5e9", { chroma: Number.NaN })).toThrow(/chroma/);
  expect(() => ramp("#0ea5e9", { chroma: -1 })).toThrow(/chroma/);
  expect(() => ramp("#0ea5e9", { hueShift: Number.POSITIVE_INFINITY })).toThrow(/hueShift/);
  expect(() => ramp("#0ea5e9", { hueShift: Number.NaN })).toThrow(/hueShift/);
  // Large but finite values still resolve.
  expect(() => ramp("#0ea5e9", { chroma: 1e6, hueShift: -1e6 })).not.toThrow();
});

test("rampColors reports the anchor it resolved", () => {
  // Previously the only way to find the anchor was to compare color values,
  // which mis-identifies it whenever two stops render the same.
  expect(rampColors("#451dc7").anchor).toBe(800);
  expect(rampColors("#ffffff").anchor).toBe(50);
  expect(rampColors("#0ea5e9", { anchor: 700 }).anchor).toBe(700);
});

test("rampColors reports one anchor even when every stop renders alike", () => {
  const result = rampColors("#ffffff", { anchor: 950 });
  const scale = serializeRamp(result);
  expect(new Set(Object.values(scale)).size).toBe(1);
  expect(result.anchor).toBe(950);
});

test("one computed ramp serializes to the same strings as ramp()", () => {
  const options = { anchor: 600, chroma: 1.2, hueShift: 15 } as const;
  const result = rampColors("#0ea5e9", options);
  for (const space of SPACES) {
    expect(serializeRamp(result, { colorSpace: space })).toEqual(ramp("#0ea5e9", { ...options, colorSpace: space }));
  }
  expect(serializeRamp(result, { hexHash: false, hexCase: "upper" })).toEqual(
    ramp("#0ea5e9", { ...options, hexHash: false, hexCase: "upper" }),
  );
});

test("rampColors yields gamut-mapped oklch colors, not strings", () => {
  const { colors } = rampColors("oklch(0.7 0.4 250)");
  for (const stop of STOPS) {
    expect(colors[stop].mode).toBe("oklch");
    expect(nearlyInGamut(serializeRamp({ anchor: 500, colors }, { colorSpace: "hex" })[stop])).toBe(true);
  }
});
