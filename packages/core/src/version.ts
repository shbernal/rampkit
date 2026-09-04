// The published version of @shbernal/rampkit, as a literal.
//
// Written out rather than imported from package.json: this package builds with
// tsc, which would emit the import and pull the whole manifest into the bundle
// of anything that ships it. `version.test.ts` asserts the two still agree, so a
// release that bumps the manifest and forgets this line fails the suite.

/** The version of rampkit that generated a ramp — stamped into `format()`
 *  output when asked, so a pasted block carries its own provenance. */
export const VERSION = "0.2.0";
