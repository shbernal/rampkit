// Shared exit path. Both entry points (the top-level catch in main.ts and the
// CLI's own validation) print to stderr with the same `rampkit:` prefix, so the
// prefix rule lives here rather than in each of them.

/** Print a `rampkit:`-prefixed message to stderr and exit non-zero. */
export function fail(reason: unknown): never {
  const text = reason instanceof Error ? reason.message : String(reason);
  process.stderr.write((text.startsWith("rampkit:") ? text : `rampkit: ${text}`) + "\n");
  process.exit(1);
}

/** Run `fn`, turning anything it throws into a {@link fail}. */
export function orFail<T>(fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    fail(err);
  }
}
