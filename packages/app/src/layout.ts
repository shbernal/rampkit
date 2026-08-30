// How much of each pane fits on screen. Drawn in full the frame runs past 40
// rows — eleven stops, three bordered panes and a `tailwind-config` block — so
// on an 80×24 terminal it scrolls, and the top of it is gone. The fix is that
// the panes you are not in fall back to a single summary line, which is enough
// to keep reading them: the ramp pane is already one row of dials, and the input
// pane's scale reads as a strip of swatches.
//
// Kept free of React/Ink so the fitting rule can be unit-tested directly (see
// layout.test.ts); tui.tsx draws whatever this decides.

/** Focus order, top to bottom — the order the panes are drawn in. */
export const PANES = ["input", "ramp", "output"] as const;
export type Pane = (typeof PANES)[number];

/** Rows a pane occupies drawn in full, and summarized to one line. */
export interface PaneRows {
  full: number;
  brief: number;
}

/**
 * Rows a line of footer text takes once the terminal wraps it. Ink breaks on
 * spaces, and splits a word only when it cannot fit a line of its own. The hints
 * are one column per character — the arrows and `·` included — so their length
 * is their width.
 */
export function wrappedRows(text: string, width: number): number {
  if (width < 1) return 1;
  let rows = 1;
  let used = 0;
  for (const word of text.split(" ")) {
    if (used > 0 && used + 1 + word.length > width) {
      rows++;
      used = 0;
    }
    used += used > 0 ? word.length + 1 : word.length;
    while (used > width) {
      rows++;
      used -= width;
    }
  }
  return rows;
}

/**
 * Rows the frame spends outside the panes: the title, the blank line above the
 * footer, the hint — which wraps on a terminal too narrow for it — and the
 * status line, which is drawn even while empty so a copy confirmation cannot
 * push the frame past the bottom it was planned for.
 *
 * @param columns - The terminal's width, or `undefined` for one that does not
 *   wrap (not a TTY). The frame is padded by a column on each side.
 */
export function chromeRows(hint: string, columns: number | undefined): number {
  return 3 + wrappedRows(hint, columns === undefined ? hint.length : columns - 2);
}

/**
 * How tall each pane is, given what it has to draw. The constants are that
 * pane's own furniture in tui.tsx: a rounded border costs a row above and below,
 * the input pane spends two rows on its fields and one blank one after them, and
 * the output pane one on its header. A summarized pane drops its border too —
 * only the focused pane is ever bordered once things are this tight, which makes
 * the border the thing that marks focus rather than a color.
 */
export function paneSizes(counts: { scale: number; error: number; output: number }): Record<Pane, PaneRows> {
  return {
    input: { full: 2 + 2 + 1 + counts.error + counts.scale, brief: 1 },
    ramp: { full: 2 + 1, brief: 1 },
    output: { full: 2 + 1 + counts.output, brief: 1 },
  };
}

/** The order panes give up their body. The output pane goes first: it is
 *  regenerated from the panes above on every keystroke, and Enter copies it
 *  whether or not it was read, while the scale is what a ramp is judged by. */
const COLLAPSE_ORDER: readonly Pane[] = ["output", "input", "ramp"];

/**
 * Decide which panes are drawn in full. Panes collapse one at a time, in
 * {@link COLLAPSE_ORDER}, only as far as the height demands — the focused pane
 * is never one of them, so moving focus is what expands a pane again.
 *
 * A frame that overflows even with every other pane summarized is left
 * overflowing: the remaining rows are the pane being worked in, and cropping
 * those would take away the thing the terminal was too short for.
 *
 * @param rows - The terminal's height, or `undefined` when there is none to
 *   measure against (not a TTY) — then every pane is drawn in full.
 * @param chrome - Rows the frame spends outside the panes; see {@link chromeRows}.
 */
export function planPanes(
  rows: number | undefined,
  focus: Pane,
  sizes: Record<Pane, PaneRows>,
  chrome: number,
): Record<Pane, boolean> {
  const full: Record<Pane, boolean> = { input: true, ramp: true, output: true };
  if (rows === undefined) return full;

  let total = chrome + PANES.reduce((sum, pane) => sum + sizes[pane].full, 0);
  for (const pane of COLLAPSE_ORDER) {
    if (total <= rows) break;
    if (pane === focus) continue;
    full[pane] = false;
    total -= sizes[pane].full - sizes[pane].brief;
  }
  return full;
}
