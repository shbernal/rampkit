// @shbernal/rampkit — public entry point.
//
// Generate Tailwind-style color ramps (50–950) from a single input color,
// preserving the exact input at its natural stop, with multi-format output.

export { ramp, STOPS } from "./ramp.js";
export type { Ramp, Stop, RampOptions, ColorSpace } from "./ramp.js";
export { format } from "./format.js";
export type { Format, FormatOptions } from "./format.js";

export const VERSION = "0.1.0";
