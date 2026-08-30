# @shbernal/rampkit-cli

The command line and the interactive TUI for
[rampkit](https://www.npmjs.com/package/@shbernal/rampkit). Give it one color and
get the whole Tailwind-style scale around it, `50` through `950`.

```bash
bun add -g @shbernal/rampkit-cli
```

## CLI

```bash
rampkit '#451dc7'                           # tailwind-v4 @theme, the default
rampkit rebeccapurple -f css-vars -n brand  # another format, another token name
rampkit '#0ea5e9' --color oklch -f css-vars # emit oklch() values
rampkit '#0ea5e9' -f json --preview         # JSON to stdout, swatches to stderr
echo '#0ea5e9' | rampkit -f hex-array       # read the color from stdin
rampkit --help
```

Formats: `tailwind-v4`, `css-vars`, `tailwind-config`, `json`, `hex-array`. Value
syntaxes via `--color`: `hex` (the default), `rgb`, `hsl`, `oklch`. Data goes to
stdout so piping stays clean, `--preview` swatches go to stderr. Every flag is
listed in
[docs/cli.md](https://github.com/shbernal/rampkit/blob/main/docs/cli.md).

## TUI

Run `rampkit` with no arguments in an interactive terminal. The screen splits
into three panes and `Shift+Tab` cycles focus through them.

- Input. `↑`/`↓` cycle the notation (`hex`, `oklch`, `rgb`, `hsl`), re-expressing
  the same color; `Tab` cycles the value fields, then the token name. The scale
  lists each stop beside its swatch and marks your preserved input with `*`.
- Ramp. The same geometry the flags set: `anchor`, `chroma`, `hue-shift`,
  `lmin`, `lmax`. `Tab` moves between them, `↑`/`↓` adjust the focused one, up
  for more, and for the anchor one stop up the scale above. `←`/`→` do the same
  ten steps at a time.
- Output. `↑`/`↓` cycle the color syntax, `Tab` cycles the output format.
  `Enter` copies the result to the clipboard, over SSH too.

`Esc` and `Ctrl-C` quit. On a terminal too short for all three panes, and an
80x24 one is, the panes you are not in collapse to a summary line each.
`Shift+Tab` to one expands it again.

Swatch blocks are painted in 24-bit sRGB, because that is all a terminal can
paint; there is no `oklch()` escape sequence. Every stop is gamut-mapped into
sRGB anyway, so the block shows the color the value denotes, but when you need
the precise value, read the emitted text.

The full walkthrough is in
[docs/tui.md](https://github.com/shbernal/rampkit/blob/main/docs/tui.md).

## License

[MIT](./LICENSE) © shbernal
