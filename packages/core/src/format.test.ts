import { test, expect } from "bun:test";
import { ramp } from "./ramp.js";
import { format } from "./format.js";

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
