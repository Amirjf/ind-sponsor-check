#!/usr/bin/env python3
"""Derive both sets of screenshots from the full-size captures in store/screenshots/.

Two outputs, one source:

- `store/screenshots/1280x800/` — the Chrome Web Store wants exactly 1280x800
  (or 640x400), so each capture is scaled to fit and centred on a canvas
  painted with the colour of its own top edge (the browser chrome), which reads
  as one continuous image rather than as letterboxing.
- `src/assets/screenshots/` — the copies the intro page imports and Vite ships
  inside the extension. Scaled to 1600px wide to keep the package small.

Both are blurred in the regions listed in REDACT: names, faces and account
activity that must not go on a public listing or into the shipped package.
Coordinates are fractions of the source capture (0..1), so they survive both
resizes — but re-check them whenever a capture is replaced.

Needs Pillow:  pip3 install Pillow
"""
from pathlib import Path
from statistics import median

from PIL import Image, ImageFilter

SRC = Path('store/screenshots')
STORE_OUT = SRC / '1280x800'
INTRO_OUT = Path('src/assets/screenshots')
STORE_W, STORE_H = 1280, 800
INTRO_W = 1600

# (x0, y0, x1, y1) as fractions of the source capture.
REDACT = {
    'company-website.jpg': [
        (0.7070, 0.0058, 0.8242, 0.0684),  # signed-in account name + avatar
        (0.1734, 0.6601, 0.8266, 0.8063),  # "How was <hotel>?" — past booking
    ],
    'linkedin-company-page.jpg': [
        (0.7250, 0.0225, 0.9703, 0.2095),  # promoted card: first name + member photo
        (0.0484, 0.4394, 0.3086, 0.4811),  # "<name> & 3 other connections work here"
        (0.7797, 0.5606, 0.9625, 0.6137),  # "<name> follows this page"
        (0.7797, 0.8310, 0.9625, 0.8840),  # "<name> & 3 others follow this page"
    ],
    'linkedin-job-page.jpg': [
        (0.1117, 0.5775, 0.3125, 0.6096),  # "4 connections work here" + avatars
        (0.4492, 0.9010, 0.7305, 0.9785),  # "People you can reach out to" faces + name
    ],
}

BLUR_AT_1280 = 11  # radius, scaled with the image so both outputs blur equally hard


def blur(img: Image.Image, regions, x0: float, y0: float, w: float, h: float) -> int:
    """Blur each fractional region, mapped onto the box the capture occupies."""
    radius = max(4, round(BLUR_AT_1280 * w / STORE_W))
    for fx0, fy0, fx1, fy1 in regions:
        box = (round(x0 + fx0 * w), round(y0 + fy0 * h),
               round(x0 + fx1 * w), round(y0 + fy1 * h))
        img.paste(img.crop(box).filter(ImageFilter.GaussianBlur(radius)), box)
    return len(regions)


def main() -> None:
    STORE_OUT.mkdir(parents=True, exist_ok=True)
    INTRO_OUT.mkdir(parents=True, exist_ok=True)

    for src in sorted(SRC.glob('*.jpg')):
        im = Image.open(src).convert('RGB')
        w, h = im.size
        regions = REDACT.get(src.name, [])
        if not regions:
            print(f'{src.name}: no redaction regions listed — check it by eye')

        # Store: fit onto the fixed canvas, padded with the top-edge colour.
        scale = min(STORE_W / w, STORE_H / h)
        scaled = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
        top = [im.getpixel((x, 1)) for x in range(0, w, 7)]
        bg = tuple(int(median(c[i] for c in top)) for i in range(3))
        canvas = Image.new('RGB', (STORE_W, STORE_H), bg)
        ox, oy = (STORE_W - scaled.width) // 2, (STORE_H - scaled.height) // 2
        canvas.paste(scaled, (ox, oy))
        n = blur(canvas, regions, ox, oy, scaled.width, scaled.height)
        canvas.save(STORE_OUT / src.name, 'JPEG', quality=86, optimize=True)
        print(f'{STORE_OUT / src.name}  {STORE_W}x{STORE_H}  bg={bg}  {n} blurred')

        # Intro page: plain resize, same regions.
        intro = im.resize((INTRO_W, round(h * INTRO_W / w)), Image.LANCZOS)
        blur(intro, regions, 0, 0, intro.width, intro.height)
        intro.save(INTRO_OUT / src.name, 'JPEG', quality=78, optimize=True)
        print(f'{INTRO_OUT / src.name}  {intro.width}x{intro.height}  {n} blurred')

    print('\nLook at every image before shipping: a capture that moved blurs the wrong pixels.')


if __name__ == '__main__':
    main()
