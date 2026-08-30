import { test, expect } from "bun:test";
import { runCli, HELP, OPTIONS } from "./cli";
import { FORMATS, RAMP_DEFAULTS, DEFAULT_COLOR_SPACE, DEFAULT_NAME } from "@shbernal/rampkit";
import type { CliIo } from "./cli";

interface Run {
  code: number;
  out: string;
  err: string;
}

/** Run the CLI with a captured sink; `stdin` is what a pipe would supply. */
async function cli(argv: string[], stdin: string | null = null): Promise<Run> {
  let out = "";
  let err = "";
  const io: CliIo = {
    stdout: (t) => {
      out += t;
    },
    stderr: (t) => {
      err += t;
    },
    readStdin: async () => stdin,
  };
  return { code: await runCli(argv, "9.9.9", io), out, err };
}

test("prints the ramp to stdout and nothing to stderr", async () => {
  const { code, out, err } = await cli(["#0ea5e9", "-f", "hex-array"]);
  expect(code).toBe(0);
  expect(JSON.parse(out)).toHaveLength(11);
  expect(err).toBe("");
});

test("--preview keeps swatches on stderr so stdout stays pipeable", async () => {
  const { code, out, err } = await cli(["#0ea5e9", "-f", "json", "--preview"]);
  expect(code).toBe(0);
  expect(() => JSON.parse(out)).not.toThrow();
  expect(err).toContain("\x1b[48;2;");
});

test("reads the color from stdin when no positional is given", async () => {
  const { code, out } = await cli(["-f", "hex-array"], "#0ea5e9");
  expect(code).toBe(0);
  expect(JSON.parse(out)[4]).toBe("#0ea5e9");
});

test("a positional color wins over stdin", async () => {
  const { out } = await cli(["#ffffff", "-f", "hex-array"], "#0ea5e9");
  expect(JSON.parse(out)[0]).toBe("#ffffff");
});

test("fails when no color arrives at all", async () => {
  const { code, err } = await cli(["-f", "json"]);
  expect(code).toBe(1);
  expect(err).toContain("no color provided");
});

test("--help and --version go to stdout and succeed", async () => {
  const help = await cli(["--help"]);
  expect(help.code).toBe(0);
  expect(help.out).toContain("Usage:");
  expect(help.err).toBe("");

  // The documented defaults are the ones the library actually applies.
  expect(help.out).toContain(`(default: ${FORMATS[0]})`);
  expect(help.out).toContain(`(default: ${DEFAULT_COLOR_SPACE})`);
  expect(help.out).toContain(`(default: ${DEFAULT_NAME};`);
  expect(help.out).toContain(`(default: ${RAMP_DEFAULTS.chroma})`);
  expect(help.out).toContain(`(default: ${RAMP_DEFAULTS.hueShift})`);
  expect(help.out).toContain(`(default: ${RAMP_DEFAULTS.lMin})`);
  expect(help.out).toContain(`(default: ${RAMP_DEFAULTS.lMax})`);

  const version = await cli(["--version"]);
  expect(version.code).toBe(0);
  expect(version.out).toBe("9.9.9\n");
});

test("the help text documents every flag parseArgs accepts", () => {
  for (const [name, spec] of Object.entries(OPTIONS)) {
    expect(HELP).toContain(`--${name}`);
    // Shorts are listed as `-f, --format`, so the comma pins the pairing too.
    if ("short" in spec) expect(HELP).toContain(`-${spec.short}, --${name}`);
  }
});

test("rejects an unknown format or color space by name", async () => {
  const fmt = await cli(["#0ea5e9", "-f", "sass"]);
  expect(fmt.code).toBe(1);
  expect(fmt.err).toContain('unknown format "sass"');
  expect(fmt.err).toContain("tailwind-v4");

  const space = await cli(["#0ea5e9", "--color", "lab"]);
  expect(space.code).toBe(1);
  expect(space.err).toContain('unknown color space "lab"');
});

test("rejects an anchor that is not a stop", async () => {
  const rejected = await Promise.all(["550", "0", "", "abc"].map((anchor) => cli(["#0ea5e9", "-a", anchor])));
  for (const { code, err } of rejected) {
    expect(code).toBe(1);
    expect(err).toContain("--anchor must be one of");
  }
  expect((await cli(["#0ea5e9", "-a", "300"])).code).toBe(0);
});

test("rejects empty, non-finite and out-of-range numeric flags", async () => {
  const cases: Array<[string[], string]> = [
    [["--chroma", "Infinity"], "--chroma must be a finite number"],
    // A leading dash needs the = form; parseArgs reads it as another option.
    [["--chroma=-Infinity"], "--chroma must be a finite number"],
    [["--chroma=-1"], "--chroma must be between 0 and 10"],
    [["--chroma", "nope"], "--chroma must be a finite number"],
    [["--chroma", "50"], "--chroma must be between 0 and 10"],
    [["--lmin", ""], "--lmin requires a number"],
    [["--lmin", "   "], "--lmin requires a number"],
    [["--lmax", "5"], "--lmax must be between 0 and 1"],
    [["--hue-shift", "NaN"], "--hue-shift must be a finite number"],
    [["--lmin", "0.9", "--lmax", "0.2"], "--lmin (0.9) must be below --lmax (0.2)"],
  ];
  const results = await Promise.all(cases.map(([flags]) => cli(["#0ea5e9", ...flags])));
  results.forEach(({ code, out, err }, i) => {
    expect(code).toBe(1);
    expect(out).toBe("");
    expect(err).toContain(cases[i]![1]);
  });
});

test("accepts the numeric flags it should", async () => {
  const { code } = await cli(["#0ea5e9", "-c", "1.4", "--hue-shift=-720", "--lmin", "0.2", "--lmax", "0.9"]);
  expect(code).toBe(0);
});

test("surfaces an unparseable color and an invalid token name", async () => {
  const color = await cli(["not-a-color"]);
  expect(color.code).toBe(1);
  expect(color.err).toContain('could not parse color "not-a-color"');

  const name = await cli(["#0ea5e9", "-n", "x: red; }"]);
  expect(name.code).toBe(1);
  expect(name.err).toContain("invalid token name");
});

test("every error line is prefixed once and ends in a newline", async () => {
  const failures = [["nope"], ["#0ea5e9", "-f", "sass"], ["--format"]];
  for (const { err } of await Promise.all(failures.map((argv) => cli(argv)))) {
    expect(err).toStartWith("rampkit: ");
    expect(err).toEndWith("\n");
    expect(err.split("rampkit:")).toHaveLength(2);
  }
});
