# @shbernal/rampkit-cli

CLI **and** interactive TUI for [rampkit](https://www.npmjs.com/package/@shbernal/rampkit) —
generate Tailwind-style color ramps (`50`–`950`) from a single color.

```bash
bun add -g @shbernal/rampkit-cli   # or: npm i -g @shbernal/rampkit-cli
```

## CLI

```bash
rampkit '#451dc7'                          # tailwind-v4 @theme (default)
rampkit rebeccapurple -f css-vars -n brand # other format + token name
rampkit '#0ea5e9' -f json --preview        # JSON to stdout, swatches to stderr
echo '#0ea5e9' | rampkit -f hex-array      # read color from stdin
rampkit --help
```

Formats: `tailwind-v4`, `css-vars`, `tailwind-config`, `json`, `hex-array`.
Output goes to stdout (clean for piping); `--preview` swatches go to stderr.

## TUI

Run `rampkit` with no arguments in an interactive terminal: type a color and
watch the ramp redraw live as truecolor swatches, **Tab** to cycle formats,
**Esc**/**Ctrl-C** to quit.

## License

[MIT](./LICENSE) © shbernal
