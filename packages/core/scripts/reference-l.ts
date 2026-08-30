// Derives REFERENCE_L (packages/core/src/ramp.ts) from the installed Tailwind
// release, so the table in the source can be re-verified rather than trusted.
//
// Run it to print a paste-ready table plus how well it scores:
//
//   bun run scripts/reference-l.ts
//
// `src/ramp.test.ts` calls deriveReferenceL() too and asserts the checked-in
// table still matches, so a Tailwind upgrade that moves the palette fails the
// suite instead of silently drifting.

import { oklch } from "culori";
import palette from "tailwindcss/colors";
import { STOPS, type Stop } from "../src/ramp.js";

/** One Tailwind family: `{ 50: "oklch(…)", …, 950: "oklch(…)" }`. */
type Family = Record<string, string>;

/**
 * The default families, in Tailwind's own order. `tailwindcss/colors` also
 * carries `inherit`/`transparent`/`black`/`white`, which are strings or
 * keywords rather than 50–950 scales.
 */
export function families(): Record<string, Family> {
  const out: Record<string, Family> = {};
  for (const [name, value] of Object.entries(palette as Record<string, unknown>)) {
    if (typeof value !== "object" || value === null) continue;
    const family = value as Family;
    if (STOPS.every((stop) => typeof family[stop] === "string")) out[name] = family;
  }
  return out;
}

/** OKLCH lightness of every family at one stop, ascending. */
function lightnesses(stop: Stop): number[] {
  return Object.values(families())
    .map((family) => {
      const color = oklch(family[stop]);
      if (!color) throw new Error(`reference-l: could not parse ${family[stop]}`);
      return color.l;
    })
    .toSorted((a, b) => a - b);
}

const median = (sorted: number[]): number => {
  const mid = sorted.length / 2;
  return sorted.length % 2 ? sorted[Math.floor(mid)]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

/**
 * Reference lightness per stop: the median across every default family, rounded
 * to the 3 decimals Tailwind itself publishes.
 *
 * The median rather than one family's curve, or the mean, because it is what
 * best recovers a Tailwind color's own stop — see the score printed below.
 */
export function deriveReferenceL(): Record<Stop, number> {
  const table = {} as Record<Stop, number>;
  for (const stop of STOPS) table[stop] = Math.round(median(lightnesses(stop)) * 1000) / 1000;
  return table;
}

/** Share of family/stop pairs a table maps back to the stop they came from. */
function score(table: Record<Stop, number>): number {
  const all = Object.values(families());
  let hits = 0;
  for (const family of all) {
    for (const stop of STOPS) {
      const l = oklch(family[stop])!.l;
      const nearest = STOPS.reduce((best, s) => (Math.abs(table[s] - l) < Math.abs(table[best] - l) ? s : best));
      if (nearest === stop) hits++;
    }
  }
  return hits / (all.length * STOPS.length);
}

if (import.meta.main) {
  const { version } = (await import("tailwindcss/package.json", { with: { type: "json" } })).default;
  const table = deriveReferenceL();
  console.log(`// tailwindcss ${version}, ${Object.keys(families()).length} default families`);
  for (const stop of STOPS) console.log(`  ${stop}: ${table[stop].toFixed(3)},`);
  console.log(`\n// recovers ${(score(table) * 100).toFixed(1)}% of Tailwind's own stops`);
}
