# VHS test tape for the rampkit TUI.
Output demo.gif

Set Shell bash
Set FontSize 16
Set Width 1100
Set Height 870
Set Padding 20

# Launch the TUI off-camera and let bun spin up. Run main.ts directly (not via
# nested `bun run`, which echoes `$ bun run ...` lines) and clear first so no
# launch noise lingers above the TUI.
Hide
Type "clear; bun run packages/app/src/main.ts"
Enter
Sleep 4s
Show

# Type a color into the hex field; the ramp + anchor (*) appear.
Type "#451dc7"
Sleep 2s

# Re-express the same color in other input notations.
Down@800ms
Down@800ms
Down@800ms
Sleep 1s
# Back to hex.
Up@800ms
Up@800ms
Up@800ms
Sleep 1s

# Tab to the name field and label the ramp.
Tab
Sleep 500ms
Type "violet"
Sleep 1500ms

# Down to the ramp pane: walk the anchor down the scale — the `*` and the whole
# ramp follow it — then back to auto, and pull the chroma in.
Shift+Tab
Sleep 1s
Down@700ms
Down@700ms
Down@700ms
Sleep 1s
Up@700ms
Up@700ms
Up@700ms
Sleep 800ms
Tab
Sleep 500ms
Down@350ms
Down@350ms
Down@350ms
Down@350ms
Down@350ms
Down@350ms
Sleep 1200ms
Up@350ms
Up@350ms
Up@350ms
Up@350ms
Up@350ms
Up@350ms
Sleep 800ms

# On to the output pane and cycle color syntax + format.
Shift+Tab
Sleep 1s
Down@900ms
Down@900ms
Down@900ms
Sleep 1s
Tab@900ms
Tab@900ms
Sleep 1500ms

# Copy to clipboard.
Enter
Sleep 2s

Hide
Escape
