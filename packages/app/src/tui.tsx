// Interactive TUI (Ink). Two focusable panes — Shift+Tab switches between them.
//
//   Input pane:  ↑/↓ cycle the input notation (hex/oklch/rgb/hsl, re-expressing
//                the same color); Tab cycles the value field(s) → name → back.
//                The scale lists each stop's value (in the input notation) to the
//                right of its swatch; the anchor stop is marked with `*`.
//   Output pane: ↑/↓ cycle the output color syntax; Tab cycles the output format.
//
//   Enter copies the output; Escape/Ctrl-C quits. Swatch backgrounds are always
//   hex (Ink can't paint oklch()/hsl()); label contrast reuses core's readableText.

import { useState, useMemo, useEffect } from "react";
import { spawn } from "node:child_process";
import { render, Box, Text, useApp, useInput } from "ink";
import TextInput from "ink-text-input";
import { oklch, rgb, hsl, formatHex } from "culori";
import { ramp, format, STOPS } from "@shbernal/rampkit";
import type { Format, Ramp, ColorSpace } from "@shbernal/rampkit";
import { readableText } from "@shbernal/rampkit/ansi";

const FORMATS: Format[] = ["tailwind-v4", "css-vars", "tailwind-config", "json", "hex-array"];
const COLOR_SPACES: ColorSpace[] = ["hex", "rgb", "hsl", "oklch"];

/** Width, in characters, of each swatch's color block. */
const BAR_WIDTH = 18;

// Input notations the color can be entered in. `hex` is a single free-text field
// (and accepts any CSS color string); the rest are three numeric components.
type InputFormat = "hex" | "oklch" | "rgb" | "hsl";
const INPUT_FORMATS: InputFormat[] = ["hex", "oklch", "rgb", "hsl"];
const COMP_LABELS: Record<InputFormat, [string, string, string]> = {
  hex: ["", "", ""],
  oklch: ["L", "C", "H"],
  rgb: ["R", "G", "B"],
  hsl: ["H", "S", "L"],
};

// Valid range per component. Hue ranges `wrap` (mod max) rather than clamp.
interface Range {
  min: number;
  max: number;
  wrap?: boolean;
}
const COMP_RANGES: Record<InputFormat, [Range, Range, Range]> = {
  hex: [{ min: 0, max: 0 }, { min: 0, max: 0 }, { min: 0, max: 0 }],
  oklch: [{ min: 0, max: 1 }, { min: 0, max: 0.4 }, { min: 0, max: 360, wrap: true }],
  rgb: [{ min: 0, max: 255 }, { min: 0, max: 255 }, { min: 0, max: 255 }],
  hsl: [{ min: 0, max: 360, wrap: true }, { min: 0, max: 100 }, { min: 0, max: 100 }],
};

const round = (n: number, digits: number): string => String(Number(n.toPrecision(digits)));

/** Bring a number into a component's range; hue wraps, everything else clamps. */
const clampNum = (n: number, r: Range): number =>
  r.wrap ? ((n % r.max) + r.max) % r.max : Math.min(r.max, Math.max(r.min, n));

/** Clamp a field's text on commit, preserving the user's exact text when it's
 *  already valid (so decimals like "0.50" aren't reformatted mid-edit). */
function clampText(raw: string, r: Range): string {
  const n = Number(raw);
  if (raw.trim() === "" || !Number.isFinite(n)) return raw;
  const v = clampNum(n, r);
  return v === n ? raw : String(Number(v.toFixed(4)));
}

/** Assemble a CSS color string from the active input notation's field values,
 *  clamping each component so the engine never receives out-of-range values.
 *  Returns "" when a component is missing or non-numeric (treated as incomplete). */
function buildColor(fmt: InputFormat, hex: string, comps: [string, string, string]): string {
  if (fmt === "hex") return hex.trim();
  const ranges = COMP_RANGES[fmt];
  const vals: number[] = [];
  for (let i = 0; i < 3; i++) {
    const raw = comps[i]!.trim();
    const n = Number(raw);
    if (raw === "" || !Number.isFinite(n)) return "";
    vals.push(clampNum(n, ranges[i]!));
  }
  const [a, b, c] = vals;
  if (fmt === "oklch") return `oklch(${a} ${b} ${c})`;
  if (fmt === "rgb") return `rgb(${a} ${b} ${c})`;
  return `hsl(${a} ${b}% ${c}%)`;
}

/** Re-express a color string as the three component fields of a target notation. */
function toComps(color: string, fmt: InputFormat): [string, string, string] {
  if (fmt === "oklch") {
    const c = oklch(color);
    return c ? [round(c.l, 4), round(c.c, 4), round(c.h ?? 0, 4)] : ["", "", ""];
  }
  if (fmt === "rgb") {
    const c = rgb(color);
    return c
      ? [String(Math.round(c.r * 255)), String(Math.round(c.g * 255)), String(Math.round(c.b * 255))]
      : ["", "", ""];
  }
  const c = hsl(color);
  return c
    ? [String(Math.round(c.h ?? 0)), String(Math.round(c.s * 100)), String(Math.round(c.l * 100))]
    : ["", "", ""];
}

// Copy via OSC 52: a terminal escape that asks the *terminal emulator* to set
// the clipboard. Unlike wl-copy/xclip (which run wherever the process runs),
// this travels back over the connection, so it works through SSH — handing the
// bytes to the local terminal (e.g. Windows Terminal hosting PowerShell). When
// inside tmux/screen the sequence must be wrapped so it passes through to the
// outer terminal.
function osc52Copy(text: string): boolean {
  const out = process.stdout;
  if (!out.isTTY) return false;
  const b64 = Buffer.from(text, "utf8").toString("base64");
  let seq = `\x1b]52;c;${b64}\x07`; // OSC 52 ; clipboard ; <base64> BEL
  const term = process.env.TERM ?? "";
  if (process.env.TMUX) {
    // tmux DCS passthrough: wrap, doubling every inner ESC so tmux forwards it.
    seq = `\x1bPtmux;${seq.replace(/\x1b/g, "\x1b\x1b")}\x1b\\`;
  } else if (term.startsWith("screen")) {
    seq = `\x1bP${seq}\x1b\\`;
  }
  out.write(seq);
  return true;
}

// Pipe text to a local OS clipboard tool. Candidates are tried in order; ENOENT
// or a non-zero exit falls through to the next, so a missing tool isn't fatal.
function localCopy(text: string): Promise<void> {
  const candidates: Array<[string, string[]]> =
    process.platform === "darwin"
      ? [["pbcopy", []]]
      : process.platform === "win32"
        ? [["clip", []]]
        : [
            ["wl-copy", []],
            ["xclip", ["-selection", "clipboard"]],
            ["xsel", ["--clipboard", "--input"]],
          ];

  const attempt = (i: number): Promise<void> =>
    new Promise((resolve, reject) => {
      const candidate = candidates[i];
      if (!candidate) return reject(new Error("no clipboard tool found"));
      const next = () => attempt(i + 1).then(resolve, reject);
      const child = spawn(candidate[0], candidate[1]);
      child.on("error", next); // e.g. ENOENT — try the next tool
      child.on("close", (code) => (code === 0 ? resolve() : next()));
      child.stdin.on("error", () => {}); // ignore EPIPE if the tool bails early
      child.stdin.end(text);
    });

  return attempt(0);
}

// In an SSH session the remote clipboard tools can't reach the terminal you're
// actually looking at, so prefer OSC 52 there. Locally, prefer the native tool
// (no terminal-support or payload-size caveats) and fall back to OSC 52 if none
// is installed.
function copyToClipboard(text: string): Promise<void> {
  const overSsh = Boolean(process.env.SSH_CONNECTION || process.env.SSH_TTY || process.env.SSH_CLIENT);
  if (overSsh) {
    return osc52Copy(text) ? Promise.resolve() : Promise.reject(new Error("stdout is not a terminal"));
  }
  return localCopy(text).catch((err) => {
    if (osc52Copy(text)) return;
    throw err;
  });
}

interface View {
  hexScale?: Ramp; // swatch backgrounds (always hex)
  labelScale?: Ramp; // values shown beside swatches, in the input notation
  outScale?: Ramp; // values for the output pane, in the output syntax
  anchorHex?: string; // the input color, used to mark the anchor stop
  error?: string;
}

function App({ initial }: { initial: string }) {
  const { exit } = useApp();

  // Input pane state.
  const [inputFormat, setInputFormat] = useState<InputFormat>("hex");
  const [hexValue, setHexValue] = useState(initial);
  const [comps, setComps] = useState<[string, string, string]>(["", "", ""]);
  const [name, setName] = useState("");
  const [fieldIndex, setFieldIndex] = useState(0);

  // Output pane state.
  const [outFmtIndex, setOutFmtIndex] = useState(0);
  const [outSpace, setOutSpace] = useState<ColorSpace>("hex");

  const [pane, setPane] = useState<"input" | "output">("input");
  const [status, setStatus] = useState("");

  const valueFieldCount = inputFormat === "hex" ? 1 : 3;
  const fieldCount = valueFieldCount + 1; // value field(s) + name
  const colorStr = buildColor(inputFormat, hexValue, comps);
  const outFormat = FORMATS[outFmtIndex]!;

  const view = useMemo<View>(() => {
    if (!colorStr) return {};
    try {
      const hexScale = ramp(colorStr);
      const labelScale = inputFormat === "hex" ? hexScale : ramp(colorStr, { colorSpace: inputFormat });
      const outScale = outSpace === "hex" ? hexScale : ramp(colorStr, { colorSpace: outSpace });
      return { hexScale, labelScale, outScale, anchorHex: formatHex(colorStr) };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }, [colorStr, inputFormat, outSpace]);

  const output = view.outScale ? format(view.outScale, outFormat, { name: name.trim() || undefined }) : "";

  // Re-express the current color in the next/previous input notation.
  const cycleInputFormat = (dir: 1 | -1) => {
    const next = INPUT_FORMATS[(INPUT_FORMATS.indexOf(inputFormat) + dir + INPUT_FORMATS.length) % INPUT_FORMATS.length]!;
    if (next === "hex") setHexValue(colorStr ? (formatHex(colorStr) ?? "") : "");
    else setComps(colorStr ? toComps(colorStr, next) : ["", "", ""]);
    setInputFormat(next);
    setFieldIndex(0);
  };

  const cycleColorSpace = (dir: 1 | -1) =>
    setOutSpace(
      (s) => COLOR_SPACES[(COLOR_SPACES.indexOf(s) + dir + COLOR_SPACES.length) % COLOR_SPACES.length]!,
    );

  // Snap a component field into its valid range when focus leaves it.
  const commitComp = (idx: number) => {
    if (inputFormat === "hex" || idx >= 3) return;
    setComps(
      (prev) =>
        prev.map((p, j) => (j === idx ? clampText(p, COMP_RANGES[inputFormat][idx]!) : p)) as [
          string,
          string,
          string,
        ],
    );
  };

  useInput((_input, key) => {
    if (key.escape) return exit();
    if (key.return) {
      if (output)
        copyToClipboard(output).then(
          () => setStatus("✓ copied to clipboard"),
          (err) => setStatus(`⚠ copy failed: ${err instanceof Error ? err.message : String(err)}`),
        );
      return;
    }
    if (key.tab && key.shift) {
      if (pane === "input") commitComp(fieldIndex);
      return setPane((p) => (p === "input" ? "output" : "input"));
    }

    if (pane === "input") {
      if (key.tab) {
        commitComp(fieldIndex);
        setFieldIndex((i) => (i + 1) % fieldCount);
      } else if (key.upArrow) cycleInputFormat(-1);
      else if (key.downArrow) cycleInputFormat(1);
    } else {
      if (key.tab) setOutFmtIndex((i) => (i + 1) % FORMATS.length);
      else if (key.upArrow) cycleColorSpace(-1);
      else if (key.downArrow) cycleColorSpace(1);
    }
  });

  // Clear the transient copy status after a moment.
  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(""), 1500);
    return () => clearTimeout(timer);
  }, [status]);

  const setComp = (i: number) => (v: string) =>
    setComps((prev) => prev.map((p, j) => (j === i ? v : p)) as [string, string, string]);

  const inputActive = pane === "input";
  const nameFocused = inputActive && fieldIndex === valueFieldCount;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text bold>rampkit</Text>
      </Box>

      {/* Input pane */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={inputActive ? "cyan" : "gray"}
        paddingX={1}
      >
        <Box>
          <Text dimColor>input </Text>
          <Text color="cyan">{inputFormat}</Text>
          <Text dimColor> ↑↓   </Text>
          {inputFormat === "hex" ? (
            <TextInput
              value={hexValue}
              onChange={setHexValue}
              focus={inputActive && fieldIndex === 0}
              placeholder="#451dc7"
            />
          ) : (
            <Box>
              {([0, 1, 2] as const).map((i) => (
                <Box key={i} marginRight={2}>
                  <Text dimColor>{COMP_LABELS[inputFormat][i]} </Text>
                  <TextInput
                    value={comps[i]}
                    onChange={setComp(i)}
                    focus={inputActive && fieldIndex === i}
                    placeholder="0"
                  />
                </Box>
              ))}
            </Box>
          )}
        </Box>
        <Box marginBottom={1}>
          <Text dimColor>name </Text>
          <TextInput value={name} onChange={setName} focus={nameFocused} placeholder="color" />
        </Box>

        {view.error && <Text color="red">⚠ {view.error}</Text>}

        {view.hexScale && view.labelScale && (
          <Box flexDirection="column">
            {STOPS.map((stop) => {
              const hex = view.hexScale![stop];
              const label = view.labelScale![stop];
              const isAnchor = hex === view.anchorHex;
              return (
                <Box key={stop}>
                  <Box width={2}>
                    <Text color={hex}>{isAnchor ? "*" : " "}</Text>
                  </Box>
                  <Box width={4} justifyContent="flex-end" marginRight={1}>
                    <Text color={isAnchor ? hex : undefined} dimColor={!isAnchor} bold={isAnchor}>
                      {stop}
                    </Text>
                  </Box>
                  <Text backgroundColor={hex} color={readableText(hex)}>
                    {" ".repeat(BAR_WIDTH)}
                  </Text>
                  <Text> </Text>
                  <Text color={isAnchor ? hex : undefined} bold={isAnchor}>
                    {label}
                  </Text>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Output pane */}
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={!inputActive ? "cyan" : "gray"}
        paddingX={1}
      >
        <Box>
          <Text dimColor>output </Text>
          <Text color="cyan">{outFormat}</Text>
          <Text dimColor> · </Text>
          <Text color="cyan">{outSpace}</Text>
        </Box>
        {output ? <Text>{output}</Text> : <Text dimColor>—</Text>}
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text dimColor>
          {inputActive
            ? "↑↓: input notation · Tab: field · Shift+Tab: output pane · Enter: copy · Esc: quit"
            : "↑↓: color syntax · Tab: output format · Shift+Tab: input pane · Enter: copy · Esc: quit"}
        </Text>
        {status && <Text color={status.startsWith("⚠") ? "red" : "green"}>{status}</Text>}
      </Box>
    </Box>
  );
}

export function runTui(initial = ""): void {
  render(<App initial={initial} />);
}
