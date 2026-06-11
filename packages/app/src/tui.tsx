// Interactive TUI (Ink). Type a color, watch the ramp redraw live, set the
// token name, Tab between the color/name fields, Shift+Tab through output
// formats, Enter to copy the output to the clipboard, Escape/Ctrl-C to quit.
// Swatches are drawn with Ink's own
// backgroundColor; label contrast reuses core's readableText.

import { useState, useMemo, useEffect } from "react";
import { spawn } from "node:child_process";
import { render, Box, Text, useApp, useInput } from "ink";
import TextInput from "ink-text-input";
import { ramp, format, STOPS } from "@shbernal/rampkit";
import type { Format, Ramp } from "@shbernal/rampkit";
import { readableText } from "@shbernal/rampkit/ansi";

const FORMATS: Format[] = ["tailwind-v4", "css-vars", "tailwind-config", "json", "hex-array"];

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

function safeRamp(input: string): { scale?: Ramp; error?: string } {
  if (!input.trim()) return {};
  try {
    return { scale: ramp(input.trim()) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

function App({ initial }: { initial: string }) {
  const { exit } = useApp();
  const [value, setValue] = useState(initial);
  const [name, setName] = useState("");
  const [focusField, setFocusField] = useState<"color" | "name">("color");
  const [formatIndex, setFormatIndex] = useState(0);
  const [status, setStatus] = useState("");

  const target = FORMATS[formatIndex]!;
  const { scale, error } = useMemo(() => safeRamp(value), [value]);
  const output = scale ? format(scale, target, { name: name.trim() || undefined }) : "";

  useInput((input, key) => {
    if (key.escape) exit();
    else if (key.return && output) {
      copyToClipboard(output).then(
        () => setStatus("✓ copied to clipboard"),
        (err) => setStatus(`⚠ copy failed: ${err instanceof Error ? err.message : String(err)}`),
      );
    } else if (key.tab && key.shift) setFormatIndex((i) => (i + 1) % FORMATS.length);
    else if (key.tab) setFocusField((f) => (f === "color" ? "name" : "color"));
  });

  // Clear the transient copy status after a moment.
  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(""), 1500);
    return () => clearTimeout(timer);
  }, [status]);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text bold>rampkit </Text>
        <Text dimColor>· color: </Text>
        <TextInput
          value={value}
          onChange={setValue}
          focus={focusField === "color"}
          placeholder="#451dc7"
        />
      </Box>
      <Box marginBottom={1}>
        <Text dimColor>{"         · name:  "}</Text>
        <TextInput
          value={name}
          onChange={setName}
          focus={focusField === "name"}
          placeholder="color"
        />
      </Box>

      {error && <Text color="red">⚠ {error}</Text>}

      {scale && (
        <Box flexDirection="column">
          {STOPS.map((stop) => {
            const hex = scale[stop];
            return (
              <Box key={stop}>
                <Box width={5} justifyContent="flex-end" marginRight={1}>
                  <Text dimColor>{stop}</Text>
                </Box>
                <Text backgroundColor={hex} color={readableText(hex)}>
                  {`  ${hex}  `}
                </Text>
              </Box>
            );
          })}

          <Box flexDirection="column" marginTop={1}>
            <Text dimColor>{`── ${target} `.padEnd(40, "─")}</Text>
            <Text>{output}</Text>
          </Box>
        </Box>
      )}

      <Box flexDirection="column" marginTop={1}>
        <Text dimColor>
          Tab: switch field · Shift+Tab: cycle format · Enter: copy · Esc/Ctrl-C: quit
        </Text>
        {status && <Text color={status.startsWith("⚠") ? "red" : "green"}>{status}</Text>}
      </Box>
    </Box>
  );
}

export function runTui(initial = ""): void {
  render(<App initial={initial} />);
}
