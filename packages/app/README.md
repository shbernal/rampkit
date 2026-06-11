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
rampkit '#0ea5e9' --color oklch -f css-vars # emit oklch() values
rampkit '#0ea5e9' -f json --preview        # JSON to stdout, swatches to stderr
echo '#0ea5e9' | rampkit -f hex-array      # read color from stdin
rampkit --help
```

Formats: `tailwind-v4`, `css-vars`, `tailwind-config`, `json`, `hex-array`.
Color syntaxes (`--color`): `hex` (default), `rgb`, `hsl`, `oklch`.
Output goes to stdout (clean for piping); `--preview` swatches go to stderr.

## TUI

Run `rampkit` with no arguments in an interactive terminal. The screen splits
into two panes; **Shift+Tab** moves focus between them.

- **Input** — **↑/↓** cycle the input notation (`hex`/`oklch`/`rgb`/`hsl`),
  re-expressing the same color; **Tab** cycles the value field(s) then the token
  name. The scale lists each stop's value beside its swatch and marks the
  preserved input with `*`.
- **Output** — **↑/↓** cycle the output color syntax, **Tab** cycles the output
  format. **Enter** copies the result to the clipboard (works over SSH).

**Esc**/**Ctrl-C** quits.

### Swatches are sRGB previews

Terminals can only paint 24-bit sRGB (and many only 256 colors) — there is no
`oklch()` or wide-gamut escape sequence. So whatever notation you pick, the
**swatch blocks are rendered in sRGB**; the **emitted text values are the source
of truth** for your stylesheet. This is faithful, not lossy: every stop is
already gamut-mapped into sRGB, so the swatch shows exactly the color the value
denotes — just in 24-bit form.

## Testing

Coverage comes in two tiers, kept separate so a failure tells you how much to
trust it:

- **Unit tests (`bun test`) — deterministic, the source of truth.** The input
  pane's logic (range clamping, hue-wrapping, notation conversion,
  incomplete-input handling) lives in `src/color-input.ts` and is tested in
  `src/color-input.test.ts`. These never flake: **a failure is a real bug.**
- **TUI smoke check (`scripts/tui-smoke.py`) — a manual, timing-sensitive
  sanity tool.** It drives the real TUI in a pseudo-terminal to confirm the
  panes render and keys route correctly — the wiring unit tests can't reach. It
  is **not** part of `bun test` precisely because pty timing can produce
  false alarms; the script's header explains what to rule out before trusting a
  failure. Run it manually after `bun run build`:

  ```bash
  python3 packages/app/scripts/tui-smoke.py
  RAMPKIT_SMOKE_DELAY=0.6 python3 packages/app/scripts/tui-smoke.py   # slower box
  ```

## License

[MIT](./LICENSE) © shbernal
