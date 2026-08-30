// @shbernal/rampkit — public entry point.
//
// Generate Tailwind-style color ramps (50–950) from a single input color,
// preserving the exact input at its natural stop, with multi-format output.

export {
  ramp,
  rampColors,
  serializeRamp,
  naturalStop,
  STOPS,
  COLOR_SPACES,
  RAMP_DEFAULTS,
  DEFAULT_COLOR_SPACE,
} from "./ramp.js";
export type { Ramp, RampResult, Stop, RampOptions, SerializeOptions, ColorSpace } from "./ramp.js";
export { format, FORMATS, DEFAULT_NAME } from "./format.js";
export { contrast, contrastReport, contrastStop, DEFAULT_TARGET } from "./contrast.js";
export type { StopContrast, ContrastStopOptions } from "./contrast.js";
export type { Format, FormatOptions } from "./format.js";
