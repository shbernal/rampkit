// Non-interactive CLI: parse args/stdin, generate a ramp, print the formatted
// output to stdout. Optional truecolor preview goes to stderr so piped stdout
// stays clean.
//
// runCli writes through a CliIo sink and returns an exit code rather than
// touching process directly, so the whole thing is exercisable from a test.

import { parseArgs } from "node:util";
import { ramp, format, STOPS, FORMATS, COLOR_SPACES } from "@shbernal/rampkit";
import type { Format, RampOptions, Stop, ColorSpace } from "@shbernal/rampkit";
import { swatches } from "@shbernal/rampkit/ansi";
import { errorLine } from "./fail.js";

const isFormat = (v: string): v is Format => (FORMATS as readonly string[]).includes(v);
const isColorSpace = (v: string): v is ColorSpace => (COLOR_SPACES as readonly string[]).includes(v);
const isStop = (n: number): n is Stop => (STOPS as readonly number[]).includes(n);

/** Where a CLI run reads and writes. */
export interface CliIo {
  stdout(text: string): void;
  stderr(text: string): void;
  /** The piped color, or null when nothing is piped (stdin is a terminal). */
  readStdin(): Promise<string | null>;
}

/** A rejected argument. Carries only a message; runCli turns it into exit 1. */
class CliError extends Error {}

function fail(message: string): never {
  throw new CliError(message);
}

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

/** The real process streams, used by the entry point. */
export const processIo: CliIo = {
  stdout: (text) => void process.stdout.write(text),
  stderr: (text) => void process.stderr.write(text),
  readStdin: async () => {
    if (process.stdin.isTTY) return null;
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks).toString("utf8").trim();
  },
};

/**
 * Run one non-interactive invocation.
 *
 * @returns The process exit code: 0 on success, 1 on any rejected input.
 */
export async function runCli(argv: string[], version: string, io: CliIo): Promise<number> {
  try {
    return await run(argv, version, io);
  } catch (err) {
    io.stderr(errorLine(err));
    return 1;
  }
}

async function run(argv: string[], version: string, io: CliIo): Promise<number> {
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
    io.stdout(HELP + "\n");
    return 0;
  }
  if (values.version) {
    io.stdout(version + "\n");
    return 0;
  }

  const color = positionals[0] ?? (await io.readStdin()) ?? "";
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

  const scale = ramp(color, options);
  const output = format(scale, target, { name: values.name });

  // Data on stdout, decoration on stderr, so a piped stdout stays clean.
  io.stdout(output + "\n");
  if (values.preview) io.stderr("\n" + swatches(scale) + "\n");
  return 0;
}
