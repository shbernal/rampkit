import { test, expect } from "bun:test";
import { chromeRows, PANES, paneSizes, planPanes, wrappedRows, type Pane, type PaneRows } from "./layout";

/** What the default view has to draw: eleven stops, no error, a `tailwind-v4`
 *  block. This is the shape the fit has to be judged against. */
const SIZES = paneSizes({ scale: 11, error: 0, output: 13 });

/** A footer hint that fits its line, as the shipped ones do. */
const HINT = "↑↓ notation · Tab field · Shift+Tab ramp · Enter copy · Esc quit";
const CHROME = chromeRows(HINT, 80);

const height = (full: Record<Pane, boolean>, sizes: Record<Pane, PaneRows> = SIZES): number =>
  CHROME + PANES.reduce((sum, p) => sum + (full[p] ? sizes[p].full : sizes[p].brief), 0);

const collapsed = (full: Record<Pane, boolean>): Pane[] => PANES.filter((p) => !full[p]);

// paneSizes — the rows a pane asks for.

test("a pane's height follows what it has to draw", () => {
  const empty = paneSizes({ scale: 0, error: 0, output: 1 });
  // One more stop, one more error line, one more output line: one more row each.
  expect(paneSizes({ scale: 1, error: 0, output: 1 }).input.full).toBe(empty.input.full + 1);
  expect(paneSizes({ scale: 0, error: 1, output: 1 }).input.full).toBe(empty.input.full + 1);
  expect(paneSizes({ scale: 0, error: 0, output: 2 }).output.full).toBe(empty.output.full + 1);
});

test("every pane summarizes to a single line", () => {
  for (const pane of PANES) expect(SIZES[pane].brief).toBe(1);
});

// planPanes — what fits.

test("with no terminal to measure, every pane is drawn in full", () => {
  const full = planPanes(undefined, "input", SIZES, CHROME);
  expect(collapsed(full)).toEqual([]);
});

test("a terminal with the room for it keeps every pane in full", () => {
  const full = planPanes(height({ input: true, ramp: true, output: true }), "input", SIZES, CHROME);
  expect(collapsed(full)).toEqual([]);
});

test("one row short of the full frame collapses one pane, not all of them", () => {
  const full = planPanes(height({ input: true, ramp: true, output: true }) - 1, "input", SIZES, CHROME);
  expect(collapsed(full)).toEqual(["output"]);
});

test("the default view fits an 80×24 terminal, whichever pane is focused", () => {
  for (const focus of PANES) {
    const full = planPanes(24, focus, SIZES, CHROME);
    expect(full[focus]).toBe(true);
    expect(height(full)).toBeLessThanOrEqual(24);
  }
});

test("the focused pane is never the one that collapses", () => {
  // Even at a height that fits nothing else — moving focus is what expands a
  // pane again, so the pane being worked in has to stay whole.
  for (const focus of PANES) {
    const full = planPanes(1, focus, SIZES, CHROME);
    expect(collapsed(full)).toEqual(PANES.filter((p) => p !== focus));
  }
});

test("the output pane gives up its body before the scale does", () => {
  // It is regenerated from the panes above and copied with Enter unread, while
  // the scale is what a ramp is judged by.
  const twoFit = height({ input: true, ramp: true, output: false });
  expect(collapsed(planPanes(twoFit, "input", SIZES, CHROME))).toEqual(["output"]);
  expect(collapsed(planPanes(twoFit - 1, "input", SIZES, CHROME))).toEqual(["ramp", "output"]);
});

test("a shorter output body buys back a pane", () => {
  // `hex-array` is one line where `tailwind-v4` is thirteen, so the frame that
  // needed a collapse at 27 rows fits whole.
  const short = paneSizes({ scale: 11, error: 0, output: 1 });
  expect(collapsed(planPanes(27, "input", SIZES, CHROME))).toEqual(["output"]);
  expect(collapsed(planPanes(27, "input", short, CHROME))).toEqual([]);
});

// chromeRows — the footer's share.

test("a hint that fits its line costs the frame one row", () => {
  expect(wrappedRows(HINT, 78)).toBe(1);
  expect(chromeRows(HINT, 80)).toBe(4); // title, blank, hint, status
});

test("a hint too wide for the terminal costs the row it wraps onto", () => {
  expect(wrappedRows("aaa bbb ccc", 7)).toBe(2);
  expect(wrappedRows("aaa bbb ccc", 3)).toBe(3);
  // A word with no line to fit on is broken across as many as it needs.
  expect(wrappedRows("aaaaaa", 2)).toBe(3);
  expect(chromeRows(HINT, 40)).toBe(5);
});

test("with no terminal to wrap against, the hint takes one row", () => {
  expect(chromeRows(HINT, undefined)).toBe(4);
});

test("a wrapped hint is a row the panes do not get", () => {
  const wide = planPanes(24, "input", SIZES, chromeRows(HINT, 80));
  const narrow = planPanes(24, "input", SIZES, chromeRows(HINT, 40));
  expect(height(wide)).toBeLessThanOrEqual(24);
  // The same 24 rows, one of them now spent on the footer: another pane gives way.
  expect(collapsed(narrow).length).toBeGreaterThan(collapsed(wide).length);
});
