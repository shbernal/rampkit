// Bundles the CLI into `dist/`. A script rather than a package.json one-liner
// because of `define` below, whose value has to be a quoted JS literal — nesting
// that in a shell string in JSON is write-only.

import { chmodSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pkg from "../package.json" with { type: "json" };

/** Resolved against this file, so the build does not depend on the caller's cwd. */
const here = (relative: string): string => fileURLToPath(new URL(relative, import.meta.url));

const outdir = here("../dist/");
rmSync(outdir, { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: [here("../src/main.ts")],
  outdir,
  target: "node",
  format: "esm",
  splitting: true,
  // Ink imports it lazily behind a dev-only flag; it is not a dependency here.
  external: ["react-devtools-core"],
  // Only the version string ends up in the bundle — see src/version.ts.
  define: { RAMPKIT_VERSION: JSON.stringify(pkg.version) },
  banner: "#!/usr/bin/env node",
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

chmodSync(here("../dist/main.js"), 0o755);
