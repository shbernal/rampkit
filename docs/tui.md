# TUI

Run `rampkit` with no arguments in an interactive terminal to launch the
interactive TUI.

![rampkit TUI demo](../demo.gif)

## Layout

The interface splits into two focusable panes — press **Shift+Tab** to switch
focus between them.

### Input pane

- **↑/↓** — cycle the input notation (`hex` / `rgb` / `hsl` / `oklch`),
  re-expressing the _same_ color in each.
- **Tab** — cycle the value field(s) → the token name field → back.
- The scale lists each stop's value (in the input notation) beside its swatch;
  the anchor stop (your exact input) is marked with `*`.

### Output pane

- **↑/↓** — cycle the output color syntax (`hex` / `rgb` / `hsl` / `oklch`).
- **Tab** — cycle the output format (`tailwind-v4`, `css-vars`,
  `tailwind-config`, `json`, `hex-array`).

## Keys

| Key                  | Action                                                          |
| -------------------- | --------------------------------------------------------------- |
| **Shift+Tab**        | Switch focus between input / output pane                        |
| **↑/↓**              | Cycle input notation (input pane) / output syntax (output pane) |
| **Tab**              | Cycle fields (input pane) / output format (output pane)         |
| **Enter**            | Copy the output to the clipboard                                |
| **Esc** / **Ctrl-C** | Quit                                                            |

## Notes

- **Clipboard** works locally (via `pbcopy`/`wl-copy`/`xclip`/`xsel`/`clip`) and
  over **SSH** (via the OSC 52 terminal escape), including inside tmux/screen.
- **Swatches** are painted in 24-bit sRGB — a faithful preview, since terminals
  can't render `oklch()` or wide-gamut colors. The emitted text values are the
  source of truth.

The demo above is generated with [VHS](https://github.com/charmbracelet/vhs); see
[Development](./development.md#regenerating-the-demo) for how to regenerate it.
