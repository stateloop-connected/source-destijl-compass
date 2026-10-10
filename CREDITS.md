# Third-party assets / 第三方素材

Everything listed here was downloaded from its original public source. No asset
in this repository is included without a redistributable licence.

## Code / 代码

- **three.js** r169 — https://threejs.org — MIT
  (via npm, `node_modules/three`; the build bundles it into `docs/assets/`)

## Typefaces / 字体

- **Space Grotesk** by Florian Karsten — SIL Open Font License 1.1
  Files: `public/fonts/space-grotesk-latin-{400,700}-normal.woff2`
  Obtained from the `@fontsource/space-grotesk` npm package (the same files
  Google Fonts serves). Only the Latin subset is shipped; Chinese text falls
  back to the platform's CJK font stack.

## Artwork / 画作

Public-domain paintings by **Piet Mondrian** (PD-Art), downloaded from Wikimedia
Commons via `Special:FilePath` and re-encoded (longest edge 1024 px, JPEG q84)
by `tools/optimize-textures.py`.

| File | Work |
| --- | --- |
| `public/textures/mondrian-red-blue-yellow.jpg` | *Composition with Red, Yellow and Blue* |
| `public/textures/mondrian-composition-1929.jpg` | *Composition*, 1929 (Guggenheim) |
| `public/textures/mondrian-no-iv-1914.jpg` | *Composition No. IV* (Compositie 6), 1914 |
| `public/textures/mondrian-composition-b206.jpg` | *Composition* (B206) |

These are used only as decoration in the 3D backdrop.

## Everything else / 其余

Audio is **synthesised at runtime with WebAudio** (`src/core/audio.js`) — the
project ships no sound files. The paper texture, grid, axes, backdrop slabs and
all geometry are generated procedurally in code.
