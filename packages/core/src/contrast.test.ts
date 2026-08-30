import { test, expect } from "bun:test";
import { contrast, contrastReport, contrastStop, DEFAULT_TARGET } from "./contrast.js";
import { ramp, STOPS } from "./ramp.js";
import type { Ramp } from "./ramp.js";

const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 2);

test("contrast matches the WCAG anchors", () => {
  close(contrast("#000000", "#ffffff"), 21);
  close(contrast("#ffffff", "#ffffff"), 1);
  // #767676 is the canonical "just passes AA on white" grey.
  expect(contrast("#ffffff", "#767676")).toBeGreaterThanOrEqual(4.5);
  expect(contrast("#ffffff", "#777777")).toBeLessThan(4.5);
});

test("contrast is symmetric and reads any syntax culori parses", () => {
  close(contrast("#0ea5e9", "#ffffff"), contrast("#ffffff", "#0ea5e9"));
  close(contrast("0ea5e9", "white"), contrast("#0ea5e9", "#ffffff"));
  close(contrast("rgb(14 165 233)", "#ffffff"), contrast("#0ea5e9", "#ffffff"));
});

test("contrast rejects what it cannot measure", () => {
  expect(() => contrast("not-a-color", "#fff")).toThrow(/could not parse color/);
  expect(() => contrast(null as never, "#fff")).toThrow(/expected a color string/);
});

test("contrastReport covers every stop, lightest to darkest", () => {
  const report = contrastReport(ramp("#0ea5e9"), ["#ffffff"]);
  expect(report.map((s) => s.stop)).toEqual([...STOPS]);
  // Against white, contrast can only grow as the ramp darkens.
  for (let i = 1; i < report.length; i++) expect(report[i]!.min).toBeGreaterThan(report[i - 1]!.min);
});

test("contrastReport's min is the weakest of the foregrounds given", () => {
  const scale = ramp("#0ea5e9");
  const both = contrastReport(scale, ["#ffffff", "#111111"]);
  for (const stop of both) {
    expect(stop.ratios).toHaveLength(2);
    close(stop.min, Math.min(...stop.ratios));
    close(stop.ratios[0]!, contrast(stop.color, "#ffffff"));
  }
});

test("contrastReport needs a foreground and a complete ramp", () => {
  expect(() => contrastReport(ramp("#0ea5e9"), [])).toThrow(/at least one foreground/);
  const partial = { ...ramp("#0ea5e9") } as Partial<Ramp>;
  delete partial[500];
  expect(() => contrastReport(partial as Ramp, ["#fff"])).toThrow(/missing stop 500/);
});

test("contrastStop finds the lightest stop that carries the text", () => {
  const scale = ramp("#88c0d0");
  const stop = contrastStop(scale, ["#ffffff"]);
  expect(stop).toBeDefined();
  expect(contrast(scale[stop!], "#ffffff")).toBeGreaterThanOrEqual(DEFAULT_TARGET);
  // Lightest means every stop above it fails.
  for (const above of STOPS.filter((s) => s < stop!)) {
    expect(contrast(scale[above], "#ffffff")).toBeLessThan(DEFAULT_TARGET);
  }
});

test("contrastStop can answer from the deep end instead", () => {
  const scale = ramp("#88c0d0");
  const lightest = contrastStop(scale, ["#111111"], { prefer: "lightest" });
  const deepest = contrastStop(scale, ["#111111"], { prefer: "deepest" });
  expect(lightest).toBe(50);
  expect(deepest!).toBeGreaterThan(lightest!);
});

test("contrastStop returns undefined when nothing clears the target", () => {
  // No color clears 4.5:1 against both pure white and near-black: the two ratios
  // multiply to ~21, so the best any single color does against the pair is 4.34.
  expect(contrastStop(ramp("#0ea5e9"), ["#ffffff", "#111111"])).toBeUndefined();
  expect(contrastStop(ramp("#0ea5e9"), ["#ffffff"], { target: 21 })).toBeUndefined();
});

test("contrastStop honours a lower target", () => {
  const scale = ramp("#0ea5e9");
  const aa = contrastStop(scale, ["#ffffff"], { target: 4.5 })!;
  const large = contrastStop(scale, ["#ffffff"], { target: 3 })!;
  expect(large).toBeLessThanOrEqual(aa);
});
