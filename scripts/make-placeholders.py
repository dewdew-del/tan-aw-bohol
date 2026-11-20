"""Make placeholder 360° (equirectangular, 2:1) images so the walk-through works before real photos exist.
Run: python scripts/make-placeholders.py   (needs Pillow: pip install pillow)
Replace the files in images/pano/ with your real 360° photos later (same names, or edit js/tours.js).
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W, H = 4096, 2048
OUT = Path(__file__).resolve().parent.parent / "images" / "pano"
STOPS = [
    ("baclayon-1-gate.jpg", "Stop 1: Gate", (120, 170, 210)),
    ("baclayon-2-plaza.jpg", "Stop 2: Plaza", (140, 185, 160)),
    ("baclayon-3-door.jpg", "Stop 3: Church door", (200, 160, 120)),
]

def font(size):
    for name in ("arialbd.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()

def make(name, label, ground):
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    for y in range(H // 2):  # sky gradient
        t = y / (H / 2)
        d.line([(0, y), (W, y)], fill=(int(90 + 120 * t), int(150 + 80 * t), int(225 + 20 * t)))
    for y in range(H // 2, H):  # ground gradient
        t = (y - H / 2) / (H / 2)
        d.line([(0, y), (W, y)], fill=tuple(int(c * (1 - 0.45 * t)) for c in ground))
    big, mid = font(150), font(80)
    # x = W/2 is yaw 0 (straight ahead); W*3/4 is yaw 90 (right); 0 and W are yaw 180 (behind).
    for yaw, txt in ((0, "FORWARD"), (90, "RIGHT"), (-90, "LEFT"), (180, "BEHIND"), (-180, "BEHIND")):
        x = W / 2 + yaw / 360 * W
        d.text((x, H / 2 - 40), txt, font=mid, fill="white", anchor="ms", stroke_width=4, stroke_fill="black")
        d.line([(x, H / 2 - 20), (x, H / 2 + 20)], fill="white", width=6)
    d.text((W / 2, H / 2 - 260), label, font=big, fill="white", anchor="ms", stroke_width=6, stroke_fill="black")
    d.text((W / 2, H / 2 + 200), "PLACEHOLDER - replace with your 360 photo", font=mid, fill="white", anchor="ms", stroke_width=4, stroke_fill="black")
    img.save(OUT / name, quality=82)

OUT.mkdir(parents=True, exist_ok=True)
for s in STOPS:
    make(*s)
print("made", len(STOPS), "placeholders in", OUT)
