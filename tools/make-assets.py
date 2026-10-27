#!/usr/bin/env python3
"""Generates the app icons and the social share image into ./assets (needs Pillow).
Run:  python3 tools/make-assets.py
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "..", "assets")
os.makedirs(OUT, exist_ok=True)
BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SS = 4  # supersample factor for smooth edges


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient(w, h, top, bot):
    img = Image.new("RGB", (w, h))
    px = img.load()
    for y in range(h):
        c = lerp(top, bot, y / (h - 1))
        for x in range(w):
            px[x, y] = c
    return img


def draw_mark(d, cx, cy, s):
    """Stumps + bails + red ball, centred at (cx,cy), s = overall scale (height of stumps)."""
    wood, wood_hi = (236, 214, 160), (255, 240, 200)
    sw, gap = s * 0.075, s * 0.12            # stump width / spacing
    top, bot = cy - s * 0.50, cy + s * 0.42
    for i in (-1, 0, 1):
        x = cx + i * (sw + gap)
        d.rounded_rectangle([x - sw / 2, top, x + sw / 2, bot], radius=sw * 0.45, fill=wood)
        d.rounded_rectangle([x - sw / 2, top, x - sw * 0.1, bot], radius=sw * 0.45, fill=wood_hi)
    # bails
    bw, bh = sw + gap + sw * 0.1, s * 0.035
    for i in (-0.5, 0.5):
        x = cx + i * (sw + gap)
        d.rounded_rectangle([x - bw / 2, top - bh * 1.2, x + bw / 2, top - bh * 0.2], radius=bh / 2, fill=(255, 250, 225))
    # ground line
    d.rounded_rectangle([cx - s * 0.55, bot - s * 0.005, cx + s * 0.55, bot + s * 0.035], radius=s * 0.017, fill=(18, 60, 30))
    # ball (red, with seam + highlight), flying in front, lower right
    r = s * 0.2
    bx, by = cx + s * 0.34, cy + s * 0.2
    d.ellipse([bx - r, by - r, bx + r, by + r], fill=(196, 28, 36))
    d.arc([bx - r * 0.78, by - r * 1.0, bx + r * 1.5, by + r * 1.0], 115, 245, fill=(250, 245, 235), width=max(2, int(r * 0.07)))
    d.arc([bx - r * 1.5, by - r * 1.0, bx + r * 0.78, by + r * 1.0], -65, 65, fill=(250, 245, 235), width=max(2, int(r * 0.07)))
    d.ellipse([bx - r * 0.55, by - r * 0.7, bx - r * 0.1, by - r * 0.3], fill=(236, 90, 96))


def icon(size, maskable=False, rounded=True):
    n = size * SS
    img = gradient(n, n, (24, 92, 48), (10, 44, 22)).convert("RGBA")
    d = ImageDraw.Draw(img)
    # soft sun glow
    glow = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([n * 0.15, n * 0.0, n * 0.85, n * 0.6], fill=(255, 230, 140, 70))
    img = Image.alpha_composite(img, glow.filter(ImageFilter.GaussianBlur(n * 0.08)))
    d = ImageDraw.Draw(img)
    # maskable icons need the artwork inside the central 80% safe zone
    scale = (0.54 if maskable else 0.68) * n
    draw_mark(d, n * 0.47, n * 0.5, scale)
    if rounded and not maskable:
        mask = Image.new("L", (n, n), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, n - 1, n - 1], radius=n * 0.22, fill=255)
        img.putalpha(mask)
    return img.resize((size, size), Image.LANCZOS)


def og():
    w, h = 1200 * 2, 630 * 2
    img = gradient(w, h, (22, 84, 44), (8, 38, 20)).convert("RGBA")
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([w * 0.45, -h * 0.2, w * 1.05, h * 0.8], fill=(255, 226, 130, 80))
    img = Image.alpha_composite(img, glow.filter(ImageFilter.GaussianBlur(120)))
    d = ImageDraw.Draw(img)
    # pitch strip
    d.polygon([(0, h * 0.86), (w, h * 0.86), (w, h), (0, h)], fill=(34, 110, 56))
    d.polygon([(w * 0.12, h * 0.9), (w * 0.88, h * 0.9), (w * 0.9, h * 0.95), (w * 0.1, h * 0.95)], fill=(214, 190, 130))
    draw_mark(d, w * 0.77, h * 0.5, h * 0.62)
    f1, f2, f3 = (ImageFont.truetype(BOLD, s) for s in (184, 62, 46))
    d.text((90 * 2, 110 * 2), "Stumps", font=f1, fill=(255, 255, 255))
    d.text((90 * 2, 260 * 2), "& Sixes", font=f1, fill=(255, 214, 90))
    d.text((94 * 2, 440 * 2), "Free 2D cricket batting game", font=f2, fill=(226, 240, 228))
    d.text((94 * 2, 495 * 2), "Real ball physics · Time your shot · 5 levels", font=f3, fill=(170, 210, 178))
    return img.convert("RGB").resize((1200, 630), Image.LANCZOS)


icon(512).save(os.path.join(OUT, "icon-512.png"), optimize=True)
icon(192).save(os.path.join(OUT, "icon-192.png"), optimize=True)
icon(512, maskable=True).save(os.path.join(OUT, "icon-maskable-512.png"), optimize=True)
icon(180, rounded=False).convert("RGB").save(os.path.join(OUT, "apple-touch-icon.png"), optimize=True)
icon(64).save(os.path.join(OUT, "favicon-64.png"), optimize=True)
icon(32).save(os.path.join(OUT, "favicon-32.png"), optimize=True)
og().save(os.path.join(OUT, "og-image.png"), optimize=True)
print("assets written to", os.path.abspath(OUT))
