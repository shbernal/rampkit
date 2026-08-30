# CLI — `@shbernal/rampkit-cli`

Install the binary globally:

```bash
bun add -g @shbernal/rampkit-cli
```

## Usage

```bash
rampkit '#451dc7'                           # tailwind-v4 @theme (default)
rampkit rebeccapurple -f css-vars -n brand  # other format + token name
rampkit '#0ea5e9' --color oklch -f css-vars # emit oklch() values
rampkit '#0ea5e9' -f json --preview         # JSON to stdout, swatches to stderr
echo '#0ea5e9' | rampkit -f hex-array       # read color from stdin
rampkit --help
```

## Flags

| Flag            | Description                                                                           |
| --------------- | ------------------------------------------------------------------------------------- |
| `-f, --format`  | Output format: `tailwind-v4`, `css-vars`, `tailwind-config`, `json`, `hex-array`.     |
| `-n, --name`    | Token name used in the emitted output. A CSS ident; unused by `json` and `hex-array`. |
| `--color`       | Value syntax for each stop: `hex`, `rgb`, `hsl`, `oklch`.                             |
| `-a, --anchor`  | Force the stop the input is preserved at: one of `50`…`950`.                          |
| `-c, --chroma`  | Global chroma multiplier, `0`–`10` (default `1`).                                     |
| `--hue-shift`   | Degrees of hue drift across the ramp (default `0`). Negative values need `=`.         |
| `--lmin`        | OKLCH lightness at the dark end, `0`–`1` (default `0.18`).                            |
| `--lmax`        | OKLCH lightness at the light end, `0`–`1` (default `0.995`).                          |
| `-p, --preview` | Print color swatches (to **stderr**).                                                 |
| `-h, --help`    | Show usage.                                                                           |
| `-v, --version` | Show the version.                                                                     |

A rejected flag value names the flag and exits non-zero; nothing is written to
stdout. `--hue-shift -720` is read by the argument parser as another option, so
pass negative values as `--hue-shift=-720`.

## stdout / stderr contract

Data output goes to **stdout** so it stays clean for piping. `--preview`
swatches and any diagnostics go to **stderr**. This means:

```bash
rampkit '#0ea5e9' -f json --preview > colors.json
```

writes only the JSON to `colors.json` while the swatches still render in your
terminal.

The color can also be read from **stdin**, so rampkit composes in pipelines:

```bash
echo '#0ea5e9' | rampkit -f hex-array
```

Run `rampkit` with no arguments in an interactive terminal to launch the
[TUI](./tui.md) instead.
