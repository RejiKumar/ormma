"""Draws the Ormma app icon, adaptive-icon layers and splash mark into mobile/assets.

The mark is a dose ring (a care ring with a small gap) holding three voice bars, with an amber
dot in the gap for the next dose: phone-call care, in the app's own colours.
Run: python scripts/build-icons.py   (needs Pillow)
"""
import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "mobile" / "assets"
SS = 4  # supersampling factor
SIZE = 1024
PRIMARY = (45, 90, 76)  # #2D5A4C
HERO_END = (32, 66, 55)  # #204237
ACCENT = (242, 169, 59)  # #F2A93B
WHITE = (255, 255, 255)


def mark(ring, bars, dot, scale=1.0):
    """The mark on a transparent square canvas, drawn at SS x resolution then downsampled."""
    s = SIZE * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = s / 2
    r = 250 * SS * scale
    w = 66 * SS * scale
    ro = r + w / 2  # Pillow draws the stroke inward from the box edge
    box = [c - ro, c - ro, c + ro, c + ro]
    # Arc: 300 degrees, gap at the top left (PIL angles run clockwise from 3 o'clock).
    start, end = 290, 230 + 360  # from just right of 12 o'clock around to the gap
    d.arc(box, start=start, end=end, fill=ring, width=int(w))
    for ang in (start, end):  # round caps
        a = math.radians(ang)
        mx, my = c + r * math.cos(a), c + r * math.sin(a)
        d.ellipse([mx - w / 2, my - w / 2, mx + w / 2, my + w / 2], fill=ring)
    # Three voice bars.
    bw = 46 * SS * scale
    for dx, h in ((-86, 120), (0, 232), (86, 120)):
        x, hh = c + dx * SS * scale, h * SS * scale / 2
        d.rounded_rectangle([x - bw / 2, c - hh, x + bw / 2, c + hh], radius=bw / 2, fill=bars)
    # Amber dot in the gap, on the ring line.
    a = math.radians(260)
    dx_, dy_ = c + r * math.cos(a), c + r * math.sin(a)
    dr = 40 * SS * scale
    d.ellipse([dx_ - dr, dy_ - dr, dx_ + dr, dy_ + dr], fill=dot)
    return img.resize((SIZE, SIZE), Image.LANCZOS)


def background():
    """Deep green with a soft lighter centre, like the hero card."""
    g = Image.radial_gradient("L").resize((SIZE, SIZE), Image.LANCZOS)  # 0 centre -> 255 edge
    g = ImageChops.invert(g).point(lambda v: int(v * 0.55))
    base = Image.new("RGB", (SIZE, SIZE), HERO_END)
    light = Image.new("RGB", (SIZE, SIZE), (58, 112, 94))
    return Image.composite(light, base, g).convert("RGBA")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    bg = background()
    bg.convert("RGB").save(OUT / "android-icon-background.png")

    fg = mark(WHITE, WHITE, ACCENT, 1.0)  # inside the adaptive safe zone
    fg.save(OUT / "android-icon-foreground.png")

    mono = mark(WHITE, WHITE, WHITE, 1.0)
    mono.save(OUT / "android-icon-monochrome.png")

    full = bg.copy()
    full.alpha_composite(mark(WHITE, WHITE, ACCENT, 1.28))
    full.convert("RGB").save(OUT / "icon.png")
    full.resize((512, 512), Image.LANCZOS).convert("RGB").save(OUT / "play-store-icon-512.png")
    full.resize((196, 196), Image.LANCZOS).convert("RGB").save(OUT / "favicon.png")

    # Splash mark: green ring and bars on a transparent canvas (shown on the cream background).
    mark(PRIMARY, PRIMARY, ACCENT, 1.0).save(OUT / "splash-icon.png")
    print("icons written to", OUT)


if __name__ == "__main__":
    main()
