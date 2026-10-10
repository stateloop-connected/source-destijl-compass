#!/usr/bin/env python3
"""Down-scale the downloaded Mondrian plates so they ship at web weight.

Source files come from Wikimedia Commons (public domain, PD-Art). This keeps the
longest edge at 1024 px and re-encodes at quality 84 — plenty for a texture that
is displayed a couple of metres away inside the 3D scene.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / "public" / "textures"
MAX_EDGE = 1024
QUALITY = 84

for path in sorted(ROOT.glob("*.jpg")):
    before = path.stat().st_size
    img = Image.open(path).convert("RGB")
    w, h = img.size
    scale = MAX_EDGE / max(w, h)
    if scale < 1:
        img = img.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    img.save(path, "JPEG", quality=QUALITY, optimize=True, progressive=True)
    after = path.stat().st_size
    print(f"{path.name:34s} {w}x{h} {before/1024:7.0f}KB -> {img.size[0]}x{img.size[1]} {after/1024:6.0f}KB")
