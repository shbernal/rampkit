#!/usr/bin/env python3
"""Manual end-to-end smoke check for the rampkit TUI.

WHAT THIS IS
    A *manual* sanity tool — NOT part of `bun test`. It launches the real TUI
    inside a pseudo-terminal (pty), types keystrokes, and asserts that the panes
    render and react. The deterministic logic (clamping, hue-wrap, notation
    conversion) is covered by the fast, reliable unit tests in
    `src/color-input.test.ts`; this only checks the wiring the unit tests can't:
    that Ink actually draws the panes and that keys are routed to the right one.

RELIABILITY — READ BEFORE TRUSTING A FAILURE
    This check is timing-sensitive by nature: it sleeps between keystrokes and
    reads whatever the terminal has painted so far. A failure here does NOT by
    itself mean the TUI is broken. Before concluding anything, rule out:
      • A slow/loaded machine — the app hadn't finished rendering before we read.
        Re-run with a larger delay:  RAMPKIT_SMOKE_DELAY=0.6 python3 scripts/tui-smoke.py
      • A first run compiling/installing — run `bun run build` once, then retry.
      • Terminal/locale quirks — it forces TERM=xterm-256color but a truly exotic
        environment can still interfere.
    Treat a *reproducible* failure (fails repeatedly, even with a big delay) as a
    real signal. A one-off red is almost always timing. The unit suite is the
    source of truth for logic; this is a coarse "does it light up" check.

USAGE
    bun run build                 # ensure the app is built/resolvable
    python3 packages/app/scripts/tui-smoke.py
    RAMPKIT_SMOKE_DELAY=0.6 python3 packages/app/scripts/tui-smoke.py   # slower box

Exits 0 if every scenario passes, 1 otherwise.
"""

import os
import pty
import re
import select
import sys
import time

# Per-keystroke settle time. Bump via env on slow machines (see header).
DELAY = float(os.environ.get("RAMPKIT_SMOKE_DELAY", "0.3"))
APP_CWD = os.path.join(os.path.dirname(__file__), "..")

# Key escape sequences.
DOWN = b"\x1b[B"
TAB = b"\x09"
SHIFT_TAB = b"\x1b[Z"
ESC = b"\x1b"


def render(keys):
    """Run the TUI, type `keys`, quit, and return the final frame as plain text."""
    pid, fd = pty.fork()
    if pid == 0:
        os.environ["TERM"] = "xterm-256color"
        os.chdir(APP_CWD)
        os.execvp("bun", ["bun", "run", "dev"])

    buf = b""

    def drain(seconds):
        nonlocal buf
        end = time.time() + seconds
        while time.time() < end:
            r, _, _ = select.select([fd], [], [], 0.1)
            if r:
                try:
                    buf += os.read(fd, 65536)
                except OSError:
                    break

    drain(max(1.5, DELAY * 5))  # boot
    for k in keys:
        os.write(fd, k)
        time.sleep(DELAY)
        drain(DELAY + 0.2)
    os.write(fd, ESC)  # quit
    drain(0.4)
    try:
        os.close(fd)
    except OSError:
        pass
    try:
        os.waitpid(pid, 0)
    except OSError:
        pass

    text = buf.decode("utf8", "replace").split("\x1b[2J")[-1]
    text = re.sub(r"\x1b\][0-9].*?(\x07|\x1b\\)", "", text)  # OSC sequences
    text = re.sub(r"\x1b\[[0-9;?]*[A-Za-z]", "", text)  # CSI sequences
    text = re.sub(r"[\x00-\x08\x0b-\x1f]", "", text)  # stray control chars
    return text


def check(label, keys, *needles):
    frame = render(keys)
    missing = [n for n in needles if n not in frame]
    if missing:
        print(f"  FAIL  {label}")
        print(f"        missing: {missing!r}")
        print("        ---- frame ----")
        for line in frame.splitlines():
            if line.strip():
                print(f"        {line}")
        return False
    print(f"  ok    {label}")
    return True


def main():
    print(f"rampkit TUI smoke (delay={DELAY}s) — timing-sensitive, see header on failure\n")
    ok = True
    # Renders both panes; anchor stop is marked and the typed color is preserved.
    ok &= check("renders panes + marks anchor", [b"#0ea5e9"], "input hex", "output", "*", "#0ea5e9")
    # ↓ re-expresses the same color in oklch (hex #0ea5e9 ≈ L 0.6847).
    ok &= check("input notation switch (hex→oklch)", [b"#0ea5e9", DOWN], "input oklch", "L 0.6847")
    # Out-of-range component snaps into range on Tab (999 → 255).
    ok &= check("clamps on commit (R 999→255)", [DOWN, DOWN, b"999", TAB], "input rgb", "R 255")
    # Output pane: ↓ cycles color syntax to rgb().
    ok &= check("output syntax switch (hex→rgb)", [b"#0ea5e9", SHIFT_TAB, DOWN], "output", "rgb(")

    print()
    if ok:
        print("PASS — all scenarios rendered as expected.")
        sys.exit(0)
    print("FAIL — see frames above. If this is a one-off, re-read the RELIABILITY note.")
    sys.exit(1)


if __name__ == "__main__":
    main()
