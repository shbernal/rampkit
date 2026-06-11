// Interactive TUI (Ink). Type a color, watch the ramp redraw live, set the
// token name, Tab between the color/name fields, Shift+Tab through output
// formats, Escape/Ctrl-C to quit. Swatches are drawn with Ink's own
// backgroundColor; label contrast reuses core's readableText.

import { useState, useMemo } from "react";
import { render, Box, Text, useApp, useInput } from "ink";
import TextInput from "ink-text-input";
import { ramp, format, STOPS } from "@shbernal/rampkit";
import type { Format, Ramp } from "@shbernal/rampkit";
import { readableText } from "@shbernal/rampkit/ansi";

const FORMATS: Format[] = ["tailwind-v4", "css-vars", "tailwind-config", "json", "hex-array"];

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

  useInput((input, key) => {
    if (key.escape) exit();
    if (key.tab && key.shift) setFormatIndex((i) => (i + 1) % FORMATS.length);
    else if (key.tab) setFocusField((f) => (f === "color" ? "name" : "color"));
  });

  const target = FORMATS[formatIndex]!;
  const { scale, error } = useMemo(() => safeRamp(value), [value]);

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
            <Text>{format(scale, target, { name: name.trim() || undefined })}</Text>
          </Box>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>Tab: switch field · Shift+Tab: cycle format · Esc/Ctrl-C: quit</Text>
      </Box>
    </Box>
  );
}

export function runTui(initial = ""): void {
  render(<App initial={initial} />);
}
