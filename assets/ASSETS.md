# DOT BLOCKS visual assets

All background plates are **pure imagery** — they contain no baked-in text, buttons,
cards or input areas. Every piece of copy and every control is a live HTML/CSS layer
on top, so text stays selectable, translatable and screen-reader accessible.

| File | Used by | Notes |
|---|---|---|
| `intro-bg.webp` | intro screen, landscape | 1672×941. Artwork sits right, copy area kept clear on the left. |
| `intro-bg-mobile.webp` | intro screen, `max-width:640px` | 941×1672 portrait. Empty band is at the **top**, so the mobile copy is top-anchored. |
| `play-bg.webp` | gameplay shell, landscape | 1672×941. Bright through the centre, so `.stage::before` applies a graded scrim. |
| `play-bg-mobile.webp` | gameplay shell, `max-width:640px` | 941×1672 portrait. Strong mid-band highlight; scrim is weighted for it. |
| `panel-bg.webp` | settings drawer, pause and result overlays | 1672×941. Bright edge sits left, drawer sits right over the dark side. |
| `items/*.svg` | special-item symbols | Transparent, scalable. |

The default tetrominoes are **not** bitmap assets — they are drawn by Canvas so movement,
rotation, contrast and responsive sizing stay reliable, and so the tactile DotPad frame is
generated from the same source of truth as the screen.

Piece colours use the project's own palette rather than the canonical Tetris scheme.
The tactile DotPad output does not depend on colour at all — pin state is what conveys
the board — so the palette is a purely visual choice.

Background images were generated for this project. The item SVG files are original project assets.
