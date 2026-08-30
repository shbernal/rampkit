# CLI, `@shbernal/rampkit-cli`

Install the binary globally:

```bash
bun add -g @shbernal/rampkit-cli
```

## Usage

```bash
rampkit '#451dc7'                           # tailwind-v4 @theme, the default
rampkit rebeccapurple -f css-vars -n brand  # another format, another token name
rampkit '#0ea5e9' --color oklch -f css-vars # emit oklch() values
rampkit '#0ea5e9' -f json --preview         # JSON to stdout, swatches to stderr
echo '#0ea5e9' | rampkit -f hex-array       # read the color from stdin
rampkit '#4c566a' -a 600 --light '#eceff4' --dark '#2e3440'  # pin both ends
rampkit --help
```

## Flags

| Flag            | Description                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------- |
| `-f, --format`  | Output format: `tailwind-v4`, `css-vars`, `tailwind-config`, `json`, `hex-array`.            |
| `-n, --name`    | Token name used in the emitted output. A CSS ident; unused by `json` and `hex-array`.        |
| `--color`       | Value syntax for each stop: `hex`, `rgb`, `hsl`, `oklch`.                                    |
| `-a, --anchor`  | Force the stop the input is preserved at: one of `50` to `950`.                              |
| `-c, --chroma`  | Global chroma multiplier, `0` to `10` (default `1`).                                         |
| `--hue-shift`   | Degrees of hue drift across the ramp (default `0`). Negative values need `=`.                |
| `--lmin`        | OKLCH lightness at the dark end, `0` to `1` (default `0.18`).                                |
| `--lmax`        | OKLCH lightness at the light end, `0` to `1` (default `0.995`).                              |
| `--light`       | Pin stop `50` to this exact color, any CSS color. Overrides `--lmax`.                        |
| `--dark`        | Pin stop `950` to this exact color. Overrides `--lmin`.                                      |
| `--stamp`       | Prefix the output with the rampkit version that made it (`tailwind-v4` and `css-vars` only). |
| `-p, --preview` | Print color swatches to stderr.                                                              |
| `-h, --help`    | Show usage.                                                                                  |
| `-v, --version` | Show the version.                                                                            |

A rejected flag value names the flag and exits non-zero, and nothing reaches
stdout. The argument parser reads `--hue-shift -720` as another option, so pass
negative values as `--hue-shift=-720`.

## stdout and stderr

Data goes to stdout so it stays clean for piping. `--preview` swatches and any
diagnostics go to stderr. So this:

```bash
rampkit '#0ea5e9' -f json --preview > colors.json
```

writes only the JSON to `colors.json` while the swatches still render in your
terminal.

The color can also come from stdin, which is what makes rampkit composable:

```bash
echo '#0ea5e9' | rampkit -f hex-array
```

Run `rampkit` with no arguments in an interactive terminal and you get the
[TUI](./tui.md) instead.
