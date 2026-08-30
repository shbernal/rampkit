// The `rampkit:` prefix rule, in one place. The CLI renders its own failures
// into its output sink so they can be captured in tests; the entry point uses
// fail() as a last resort for anything that escapes.

/** The message out of anything thrown, whether or not it is an Error. Bare, for
 *  a UI that is already visibly rampkit and does not want the prefix. */
export function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

/** One-line, `rampkit:`-prefixed rendering of anything thrown. */
export function errorLine(reason: unknown): string {
  const text = errorMessage(reason);
  return (text.startsWith("rampkit:") ? text : `rampkit: ${text}`) + "\n";
}

/** Print to stderr and exit non-zero. */
export function fail(reason: unknown): never {
  process.stderr.write(errorLine(reason));
  process.exit(1);
}
