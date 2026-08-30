// Non-interactive CLI: parse args/stdin, generate a ramp, print the formatted
// output to stdout. Optional truecolor preview goes to stderr so piped stdout
// stays clean.

import { parseArgs } from "node:util";
import { ramp, format, STOPS, FORMATS, COLOR_SPACES } from "@shbernal/rampkit";
import type { Format, RampOptions, Stop, ColorSpace } from "@shbernal/rampkit";
import { swatches } from "@shbernal/rampkit/ansi";
import { fail, orFail } from "./fail.js";

const isFormat = (v: string): v is Format => (FORMATS as readonly string[]).includes(v);
const isColorSpace = (v: string): v is ColorSpace => (COLOR_SPACES as readonly string[]).includes(v);
const isStop = (n: number): n is Stop => (STOPS as readonly number[]).includes(n);

const HELP = `rampkit — Tailwind-style color ramps from a single color

Usage:
  rampkit <color> [options]      Generate a ramp and print it
  rampkit                        Launch the interactive TUI (in a terminal)
  echo <color> | rampkit         Read the color from stdin

Options:
  -f, --format <fmt>   Output format: ${FORMATS.join(", ")} (default: tailwind-v4)
      --color <space>  Color syntax: ${COLOR_SPACES.join(", ")} (default: hex)
  -n, --name <name>    Token name used in variable/key output (default: color;
                       a CSS ident; unused by json and hex-array)
  -a, --anchor <stop>  Force the stop where the input is preserved (50..950)
  -c, --chroma <mul>   Global chroma multiplier, 0..10 (default: 1)
      --hue-shift <d>  Degrees of hue drift across the ramp (default: 0)
      --lmin <l>       OKLCH lightness at the dark end, 0..1 (default: 0.18)
      --lmax <l>       OKLCH lightness at the light end, 0..1 (default: 0.995)
  -p, --preview        Also print truecolor swatches (to stderr)
  -h, --help           Show this help
  -v, --version        Show version

Examples:
  rampkit '#451dc7'
  rampkit rebeccapurple --format css-vars --name brand
  rampkit '#0ea5e9' -f json --preview
  rampkit '#0ea5e9' --color oklch -f css-vars`;

// Number() alone is too permissive: it reads "" and "  " as 0, and lets Infinity
// through to the ramp engine. The ranges mirror what core accepts — core stays
// the authority, this is just the flag-shaped error message.
function num(key: string, raw: string | undefined, min: number, max: number): number | undefined {
  if (raw === undefined) return undefined;
  if (raw.trim() === "") fail(`--${key} requires a number`);
  const n = Number(raw);
  if (!Number.isFinite(n)) fail(`--${key} must be a finite number, got "${raw}"`);
  if (n < min || n > max) fail(`--${key} must be between ${min} and ${max}, got ${n}`);
  return n;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8").trim();
}

export async function runCli(argv: string[], version: string): Promise<void> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      format: { type: "string", short: "f" },
      color: { type: "string" },
      name: { type: "string", short: "n" },
      anchor: { type: "string", short: "a" },
      chroma: { type: "string", short: "c" },
      "hue-shift": { type: "string" },
      lmin: { type: "string" },
      lmax: { type: "string" },
      preview: { type: "boolean", short: "p" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
  });

  if (values.help) {
    process.stdout.write(HELP + "\n");
    return;
  }
  if (values.version) {
    process.stdout.write(version + "\n");
    return;
  }

  const color = positionals[0] ?? (!process.stdin.isTTY ? await readStdin() : "");
  if (!color) fail("no color provided (pass a color argument or pipe one via stdin)");

  const target = values.format ?? "tailwind-v4";
  if (!isFormat(target)) {
    fail(`unknown format "${target}". Valid: ${FORMATS.join(", ")}`);
  }

  const colorSpace = values.color ?? "hex";
  if (!isColorSpace(colorSpace)) {
    fail(`unknown color space "${colorSpace}". Valid: ${COLOR_SPACES.join(", ")}`);
  }

  const options: RampOptions = { colorSpace };
  if (values.anchor !== undefined) {
    const anchor = Number(values.anchor);
    if (!isStop(anchor)) fail(`--anchor must be one of ${STOPS.join(", ")}`);
    options.anchor = anchor;
  }
  const chroma = num("chroma", values.chroma, 0, 10);
  if (chroma !== undefined) options.chroma = chroma;
  const hueShift = num("hue-shift", values["hue-shift"], -Infinity, Infinity);
  if (hueShift !== undefined) options.hueShift = hueShift;
  const lmin = num("lmin", values.lmin, 0, 1);
  if (lmin !== undefined) options.lMin = lmin;
  const lmax = num("lmax", values.lmax, 0, 1);
  if (lmax !== undefined) options.lMax = lmax;
  if (lmin !== undefined && lmax !== undefined && lmin >= lmax) {
    fail(`--lmin (${lmin}) must be below --lmax (${lmax})`);
  }

  const scale = orFail(() => ramp(color, options));
  const output = orFail(() => format(scale, target, { name: values.name }));

  process.stdout.write(output + "\n");
  if (values.preview) process.stderr.write("\n" + swatches(scale) + "\n");
}
