# DOT BLOCKS visual assets

Background plates are **pure imagery** — they contain no baked-in text, buttons,
cards or input areas. Every piece of copy and every control is a live HTML/CSS layer
on top, so text stays selectable, translatable and screen-reader accessible.

| File | Used by | Notes |
|---|---|---|
| `intro-bg.webp` | intro screen, landscape | 1672×941. Dark embossed pin field with a quiet circular centre area and scattered glowing block pieces; copy sits over it with a gradient + vignette scrim. |
| `intro-bg-mobile.webp` | intro screen, `max-width:820px` | 1080×1350 portrait crop of the same plate, centred on the empty stage area. |
| `board-frame.webp` | the board shell on the play screen | 473×889. The DotPad bezel, cropped from the original play plate. |
| `items/*.svg` | special-item symbols | Transparent, scalable. Not yet surfaced in play. |

## Why the bezel is an element, not a background

The original play plate was a full-bleed 1672×941 image with the DotPad bezel centred in
it. Its inner window measures 398×816 — the board's own 1:2 ratio — so the artwork is not
wallpaper, it is the board's frame. Used as a `background-size:cover` screen plate it would
rescale with the viewport and drift out of register with the canvas at most aspect ratios.

It is therefore cropped to the bezel alone and applied to `.canvas-wrap`, which carries the
frame's aspect ratio (`473 / 889`) and percentage padding derived from the inner window:

```
padding: 7.61% 7.82% 7.82% 8.03%;   /* top right bottom left, all as % of width */
```

The canvas fills that padding box, so the seam holds to within 1px at every size. The play
screen's own background is generated in CSS (radial wash + repeating pin dots) rather than
from a plate, which also keeps it visually distinct from the intro.

The tetrominoes are **not** bitmap assets — they are drawn by Canvas so movement, rotation,
contrast and responsive sizing stay reliable, and so the tactile DotPad frame is generated
from the same source of truth as the screen. Pin state, not colour, conveys the board.

Background images were generated for this project. The item SVG files are original project assets.
