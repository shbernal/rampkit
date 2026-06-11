// @shbernal/rampkit — public entry point.
//
// Generate Tailwind-style color ramps (50–950) from a single input color,
// preserving the exact input at its natural stop, with multi-format output.
//
// The ramp algorithm is an independent, clean-room implementation of the
// approach popularized by tints.dev (3-anchor lightness distribution in a
// perceptual space + per-stop hue/saturation tweaks, with the input color
// preserved at its anchor stop). See README for the design notes.

export const VERSION = "0.0.0";
