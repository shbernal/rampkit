import { test, expect } from "bun:test";
import { rampColors, RAMP_DEFAULTS, STOPS } from "@shbernal/rampkit";
import {
  ANCHORS,
  NUMERIC,
  RAMP_FIELDS,
  RAMP_SETTINGS_DEFAULTS,
  fieldText,
  stepField,
  toRampOptions,
  type RampField,
  type RampSettings,
} from "./ramp-options";

const D = RAMP_SETTINGS_DEFAULTS;

/** Press one key `n` times. */
const press = (field: RampField, dir: 1 | -1, n: number, from: RampSettings = D): RampSettings => {
  let s = from;
  for (let i = 0; i < n; i++) s = stepField(s, field, dir);
  return s;
};

// The table both front ends read.

test("the defaults are core's, plus an unforced anchor", () => {
  expect(D).toEqual({ anchor: "auto", ...RAMP_DEFAULTS });
});

test("every field is reachable by Tab, anchor first", () => {
  expect(RAMP_FIELDS).toEqual(["anchor", "chroma", "hue-shift", "lmin", "lmax"]);
});

// stepField — one press.

test("every numeric default sits on its own step grid", () => {
  // Stepping away and back has to land on the exact default, not near it.
  for (const { flag } of NUMERIC) {
    expect(stepField(stepField(D, flag, 1), flag, -1)).toEqual(D);
    expect(stepField(stepField(D, flag, -1), flag, 1)).toEqual(D);
  }
});

test("numeric fields clamp at both ends", () => {
  expect(press("chroma", -1, 100).chroma).toBe(0);
  expect(press("chroma", 1, 500).chroma).toBe(10);
  expect(press("lmin", -1, 100).lMin).toBe(0);
  expect(press("lmax", 1, 100).lMax).toBe(1);
});

test("hue drift wraps rather than clamping — it is a hue", () => {
  expect(press("hue-shift", -1, 1).hueShift).toBe(-5);
  expect(press("hue-shift", 1, 35).hueShift).toBe(175);
  // The dial is signed and half a turn is one point, shown at the end it wraps
  // to: 175 + 5 is -180, not 180.
  expect(press("hue-shift", 1, 36).hueShift).toBe(-180);
});

test("the lightness ends stop one step short of each other", () => {
  // Core throws on lMin >= lMax, so the pane must not be able to express it.
  const raised = press("lmin", 1, 500);
  expect(raised.lMin).toBeLessThan(raised.lMax);
  const lowered = press("lmax", -1, 500);
  expect(lowered.lMax).toBeGreaterThan(lowered.lMin);
  expect(() => rampColors("#0ea5e9", toRampOptions(raised))).not.toThrow();
  expect(() => rampColors("#0ea5e9", toRampOptions(lowered))).not.toThrow();
});

test("the anchor walks the scale's own order and clamps at both ends", () => {
  expect(ANCHORS).toEqual(["auto", ...STOPS]);
  expect(stepField(D, "anchor", -1).anchor).toBe(50); // ↓ from auto: the top stop
  expect(stepField(D, "anchor", 1).anchor).toBe("auto"); // ↑ from auto: nowhere
  expect(press("anchor", -1, 99).anchor).toBe(950);
  expect(press("anchor", 1, 99).anchor).toBe("auto");
});

// toRampOptions — what the engine is handed.

test("an auto anchor is an absent anchor, not a value core knows", () => {
  expect(toRampOptions(D)).toEqual({ ...RAMP_DEFAULTS });
  expect(toRampOptions({ ...D, anchor: 700 })).toEqual({ ...RAMP_DEFAULTS, anchor: 700 });
});

test("a forced anchor is where the input lands", () => {
  const result = rampColors("#0ea5e9", toRampOptions({ ...D, anchor: 700 }));
  expect(result.anchor).toBe(700);
});

test("every reachable dial position is accepted by the engine", () => {
  // The point of sharing one table: the pane cannot dial to a value the CLI
  // rejects, and neither end can produce a ramp core refuses to build.
  for (const { flag } of NUMERIC) {
    for (const dir of [1, -1] as const) {
      const settings = press(flag, dir, 500);
      expect(() => rampColors("#0ea5e9", toRampOptions(settings))).not.toThrow();
    }
  }
});

// fieldText — what the row shows.

test("a field's text keeps its width as its value changes", () => {
  for (const field of RAMP_FIELDS) {
    const widths = new Set(
      [D, press(field, 1, 500), press(field, -1, 500), press(field, 1, 3)].map((s) => fieldText(s, field).length),
    );
    expect(widths.size).toBe(1);
  }
});

test("values render at the precision they step in", () => {
  expect(fieldText(D, "anchor").trim()).toBe("auto");
  expect(fieldText(D, "chroma").trim()).toBe("1.00");
  expect(fieldText(D, "hue-shift").trim()).toBe("0");
  expect(fieldText(D, "lmin").trim()).toBe("0.180");
  expect(fieldText(D, "lmax").trim()).toBe("0.995");
});
