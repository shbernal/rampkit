# TUI

Run `rampkit` with no arguments in an interactive terminal to launch the
interactive TUI.

![rampkit TUI demo](../demo.gif)

## Layout

The interface splits into three focusable panes — press **Shift+Tab** to cycle
focus through them (input → ramp → output).

### Input pane

- **↑/↓** — cycle the input notation (`hex` / `rgb` / `hsl` / `oklch`),
  re-expressing the _same_ color in each.
- **Tab** — cycle the value field(s) → the token name field → back.
- The scale lists each stop's value (in the input notation) beside its swatch;
  the anchor stop (your exact input) is marked with `*`.

### Ramp pane

The geometry `ramp()` is built from — the same five values the CLI takes as
flags, so a ramp dialled in here is reproducible as a one-liner.

- **Tab** — move between `anchor`, `chroma`, `hue-shift`, `lmin` and `lmax`.
- **↑/↓** — adjust the focused one. **↑** is always "more": more chroma, more
  drift, a higher lightness end. For `anchor` it is one stop _up_ the scale
  drawn above, so the arrow and the `*` move together; past stop 50 it reaches
  `auto`, where the stop is picked from the input's own lightness.

`hue-shift` wraps at half a turn; everything else stops at its limit. The two
lightness ends stop one step short of each other, since a ramp needs `lmin`
below `lmax`.

### Output pane

- **↑/↓** — cycle the output color syntax (`hex` / `rgb` / `hsl` / `oklch`).
- **Tab** — cycle the output format (`tailwind-v4`, `css-vars`,
  `tailwind-config`, `json`, `hex-array`).

## Keys

| Key                  | Action                                                                           |
| -------------------- | -------------------------------------------------------------------------------- |
| **Shift+Tab**        | Cycle focus: input → ramp → output                                               |
| **↑/↓**              | Input notation (input) / adjust the focused dial (ramp) / output syntax (output) |
| **Tab**              | Cycle fields (input, ramp) / output format (output)                              |
| **Enter**            | Copy the output to the clipboard                                                 |
| **Esc** / **Ctrl-C** | Quit                                                                             |

## Notes

- **Clipboard** works locally (via `pbcopy`/`wl-copy`/`xclip`/`xsel`/`clip`) and
  over **SSH** (via the OSC 52 terminal escape), including inside tmux/screen.
- **Swatches** are painted in 24-bit sRGB — a faithful preview, since terminals
  can't render `oklch()` or wide-gamut colors. The emitted text values are the
  source of truth.

The demo above is generated with [VHS](https://github.com/charmbracelet/vhs); see
[Development](./development.md#regenerating-the-demo) for how to regenerate it.
