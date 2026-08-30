// Non-interactive CLI: parse args/stdin, generate a ramp, print the formatted
// output to stdout. Optional truecolor preview goes to stderr so piped stdout
// stays clean.

import { parseArgs } from "node:util";
import { ramp, format, STOPS, FORMATS, COLOR_SPACES } from "@shbernal/rampkit";
import type { Format, RampOptions, Stop, ColorSpace } from "@shbernal/rampkit";
import { swatches } from "@shbernal/rampkit/ansi";

const isFormat = (v: string): v is Format => (FORMATS as readonly string[]).includes(v);
const isColorSpace = (v: string): v is ColorSpace => (COLOR_SPACES as readonly string[]).includes(v);

const HELP = `rampkit — Tailwind-style color ramps from a single color

Usage:
  rampkit <color> [options]      Generate a ramp and print it
  rampkit                        Launch the interactive TUI (in a terminal)
  echo <color> | rampkit         Read the color from stdin

Options:
  -f, --format <fmt>   Output format: ${FORMATS.join(", ")} (default: tailwind-v4)
      --color <space>  Color syntax: ${COLOR_SPACES.join(", ")} (default: hex)
  -n, --name <name>    Token name used in variable/key output (default: color)
  -a, --anchor <stop>  Force the stop where the input is preserved (50..950)
  -c, --chroma <mul>   Global chroma multiplier (default: 1)
      --hue-shift <d>  Degrees of hue drift across the ramp (default: 0)
      --lmin <l>       OKLCH lightness at the dark end (default: 0.18)
      --lmax <l>       OKLCH lightness at the light end (default: 0.995)
  -p, --preview        Also print truecolor swatches (to stderr)
  -h, --help           Show this help
  -v, --version        Show version

Examples:
  rampkit '#451dc7'
  rampkit rebeccapurple --format css-vars --name brand
  rampkit '#0ea5e9' -f json --preview
  rampkit '#0ea5e9' --color oklch -f css-vars`;

function fail(message: string): never {
  const text = message.startsWith("rampkit:") ? message : `rampkit: ${message}`;
  process.stderr.write(text + "\n");
  process.exit(1);
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

  const num = (key: string, raw: string | undefined): number | undefined => {
    if (raw === undefined) return undefined;
    const n = Number(raw);
    if (Number.isNaN(n)) fail(`--${key} must be a number, got "${raw}"`);
    return n;
  };

  const options: RampOptions = { colorSpace };
  if (values.anchor !== undefined) {
    const anchor = Number(values.anchor) as Stop;
    if (!STOPS.includes(anchor)) fail(`--anchor must be one of ${STOPS.join(", ")}`);
    options.anchor = anchor;
  }
  const chroma = num("chroma", values.chroma);
  if (chroma !== undefined) options.chroma = chroma;
  const hueShift = num("hue-shift", values["hue-shift"]);
  if (hueShift !== undefined) options.hueShift = hueShift;
  const lmin = num("lmin", values.lmin);
  if (lmin !== undefined) options.lMin = lmin;
  const lmax = num("lmax", values.lmax);
  if (lmax !== undefined) options.lMax = lmax;

  let scale;
  try {
    scale = ramp(color, options);
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }

  let output;
  try {
    output = format(scale, target, { name: values.name });
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }

  process.stdout.write(output + "\n");
  if (values.preview) process.stderr.write("\n" + swatches(scale) + "\n");
}
