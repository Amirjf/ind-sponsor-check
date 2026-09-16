"""Turn src/assets/icons/logo.png into the manifest icon sizes.

Crops the outer white margin down to the rounded card, makes the area
outside the card corners transparent, then downsamples with Lanczos.
"""
from PIL import Image, ImageDraw, ImageOps

SRC = "src/assets/icons/logo.png"
SIZES = [16, 32, 48, 128]

img = Image.open(SRC).convert("RGB")
# bounding box of everything that is not (near-)white = the card incl. its border
gray = ImageOps.invert(img.convert("L")).point(lambda v: 255 if v > 12 else 0)
box = gray.getbbox()
card = img.crop(box)
w, h = card.size
side = max(w, h)
card = ImageOps.pad(card, (side, side), color="white")

# rounded-rect mask so the corners are transparent in dark toolbars
radius = int(side * 0.18)
mask = Image.new("L", (side, side), 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, side - 1, side - 1), radius=radius, fill=255)
rgba = card.convert("RGBA")
rgba.putalpha(mask)

for s in SIZES:
    out = rgba.resize((s, s), Image.LANCZOS)
    out.save(f"src/assets/icons/icon-{s}.png", optimize=True)
    print(f"wrote src/assets/icons/icon-{s}.png")
print("card bbox", box, "->", side, "px")
