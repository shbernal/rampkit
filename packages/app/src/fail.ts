// The `rampkit:` prefix rule, in one place. The CLI renders its own failures
// into its output sink so they can be captured in tests; the entry point uses
// fail() as a last resort for anything that escapes.

/** One-line, `rampkit:`-prefixed rendering of anything thrown. */
export function errorLine(reason: unknown): string {
  const text = reason instanceof Error ? reason.message : String(reason);
  return (text.startsWith("rampkit:") ? text : `rampkit: ${text}`) + "\n";
}

/** Print to stderr and exit non-zero. */
export function fail(reason: unknown): never {
  process.stderr.write(errorLine(reason));
  process.exit(1);
}
