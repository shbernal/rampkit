// The CLI's own version string.
//
// Importing `../package.json` would be simpler, but the bundler inlines the
// *whole* manifest into `dist/main.js` — scripts, devDependencies, author email
// — to hand back one field. So the build (`scripts/build.ts`) substitutes the
// literal for `RAMPKIT_VERSION` instead, and only the string ships.
//
// `typeof` on an undeclared identifier is the one safe reference in JS, which is
// what lets the same source also run unbundled, where no substitution happened.

import { readFileSync } from "node:fs";

/** Replaced with a string literal at build time; absent when running from source. */
declare const RAMPKIT_VERSION: string | undefined;

/** The version to report for `--version`, however this file is being run. */
export function resolveVersion(): string {
  if (typeof RAMPKIT_VERSION === "string") return RAMPKIT_VERSION;
  // Running from source (`bun run dev`): read the manifest next to `src/`.
  const manifest = new URL("../package.json", import.meta.url);
  return (JSON.parse(readFileSync(manifest, "utf8")) as { version: string }).version;
}
