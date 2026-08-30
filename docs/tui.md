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
- **↑/↓** — adjust the focused one by one step. **↑** is always "more": more
  chroma, more drift, a higher lightness end. For `anchor` it is one stop _up_
  the scale drawn above, so the arrow and the `*` move together; past stop 50 it
  reaches `auto`, where the stop is picked from the input's own lightness.
- **←/→** — the same, ten steps at a time, for crossing the range: `chroma 8` is
  14 presses rather than 140. Every value they land on is one **↑/↓** could have
  reached, so the two mix freely.

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
| **←/→**              | Adjust the focused dial by ten steps (ramp)                                      |
| **Tab**              | Cycle fields (input, ramp) / output format (output)                              |
| **Enter**            | Copy the output to the clipboard                                                 |
| **Esc** / **Ctrl-C** | Quit                                                                             |

## Short terminals

Drawn in full the interface needs about 40 rows — eleven stops, three bordered
panes and an output block — so on a shorter one the panes you are _not_ in
collapse to a single line each, enough to keep reading them: the input pane
becomes its color and a strip of swatches (the anchor still marked), the output
pane its format and how many lines **Enter** would copy. Focus is what expands a
pane again, so **Shift+Tab** is how you get a collapsed one back. An 80×24
terminal fits whichever pane you are working in, whole.

## Notes

- **Clipboard** works locally (via `pbcopy`/`wl-copy`/`xclip`/`xsel`/`clip`) and
  over **SSH** (via the OSC 52 terminal escape), including inside tmux/screen.
- **Swatches** are painted in 24-bit sRGB — a faithful preview, since terminals
  can't render `oklch()` or wide-gamut colors. The emitted text values are the
  source of truth.

The demo above is generated with [VHS](https://github.com/charmbracelet/vhs); see
[Development](./development.md#regenerating-the-demo) for how to regenerate it.
