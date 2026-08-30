import { test, expect } from "bun:test";
import { ramp, STOPS } from "./ramp.js";
import { format, FORMATS } from "./format.js";

const scale = ramp("#451dc7");

test("tailwind-v4 emits @theme custom properties", () => {
  const out = format(scale, "tailwind-v4", { name: "brand" });
  expect(out).toStartWith("@theme {");
  expect(out).toContain("--color-brand-500:");
  expect(out).toContain("--color-brand-950:");
});

test("css-vars emits :root custom properties", () => {
  const out = format(scale, "css-vars", { name: "brand" });
  expect(out).toStartWith(":root {");
  expect(out).toContain("--brand-500:");
});

test("tailwind-config emits a nested JSON object keyed by name", () => {
  const out = format(scale, "tailwind-config", { name: "brand" });
  const parsed = JSON.parse(out);
  expect(Object.keys(parsed)).toEqual(["brand"]);
  expect(parsed.brand[500]).toBe(scale[500]);
});

test("json emits the flat stop→hex map", () => {
  const parsed = JSON.parse(format(scale, "json"));
  expect(parsed[50]).toBe(scale[50]);
  expect(Object.keys(parsed).length).toBe(11);
});

test("hex-array emits hexes lightest→darkest", () => {
  const arr = JSON.parse(format(scale, "hex-array"));
  expect(Array.isArray(arr)).toBe(true);
  expect(arr.length).toBe(11);
  expect(arr[0]).toBe(scale[50]);
});

test("defaults the token name to 'color'", () => {
  expect(format(scale, "css-vars")).toContain("--color-500:");
});

test("hex-array follows STOPS, not the ramp's own key order", () => {
  // A ramp rebuilt darkest-first still has to come out lightest-first.
  const reversed = Object.fromEntries(STOPS.toReversed().map((s) => [s, scale[s]]));
  const arr = JSON.parse(format(reversed as typeof scale, "hex-array"));
  expect(arr).toEqual(STOPS.map((s) => scale[s]));
});

test("rejects a token name that is not a CSS ident", () => {
  for (const name of ["x: red; }", "bad name", "-leading", "9lives", "", "a}b"]) {
    expect(() => format(scale, "css-vars", { name })).toThrow(/invalid token name/);
  }
  for (const name of ["brand", "_x", "a-b_9", "Color"]) {
    expect(() => format(scale, "css-vars", { name })).not.toThrow();
  }
});

test("throws on a ramp missing a stop", () => {
  const { 500: _omitted, ...partial } = scale;
  expect(() => format(partial as typeof scale, "json")).toThrow(/missing stop 500/);
});

test("FORMATS lists every target format() accepts", () => {
  for (const target of FORMATS) {
    expect(typeof format(scale, target)).toBe("string");
  }
  expect(FORMATS.length).toBe(5);
});
