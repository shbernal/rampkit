// @shbernal/rampkit — public entry point.
//
// Generate Tailwind-style color ramps (50–950) from a single input color,
// preserving the exact input at its natural stop, with multi-format output.

export { ramp, STOPS } from "./ramp";
export type { Ramp, Stop, RampOptions, ColorSpace } from "./ramp";
export { format } from "./format";
export type { Format, FormatOptions } from "./format";

export const VERSION = "0.0.0";
