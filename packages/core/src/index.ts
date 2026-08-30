// @shbernal/rampkit — public entry point.
//
// Generate Tailwind-style color ramps (50–950) from a single input color,
// preserving the exact input at its natural stop, with multi-format output.

export { ramp, rampColors, serializeRamp, STOPS, COLOR_SPACES } from "./ramp.js";
export type { Ramp, RampResult, Stop, RampOptions, SerializeOptions, ColorSpace } from "./ramp.js";
export { format, FORMATS } from "./format.js";
export type { Format, FormatOptions } from "./format.js";
