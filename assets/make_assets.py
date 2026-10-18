#!/usr/bin/env python3
"""Compose portal covers/thumbnails from real in-game renders (dev source, ?cover=1&env=city&time=night&cz=<dist>).
Renders are produced by tests/render_covers.js into /tmp/rend; this script only crops, scales and adds the title."""
import sys, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
R = sys.argv[1] if len(sys.argv) > 1 else '/tmp/rend'
OUT = sys.argv[2] if len(sys.argv) > 2 else '.'
FONT = '/usr/share/fonts/truetype/sand-box/google/Chakra Petch/ChakraPetch-Bold.ttf'

def fit(img, w, h):  # cover-crop to w:h, then Lanczos scale
    W, H = img.size; s = max(w / W, h / H)
    img = img.resize((round(W * s), round(H * s)), Image.LANCZOS)
    W, H = img.size; x, y = (W - w) // 2, (H - h) // 2
    return img.crop((x, y, x + w, y + h))

def title(img, cy, size, track=0.18, shade=True):
    img = img.convert('RGBA'); W, H = img.size
    if shade:  # soft dark band for legibility (no border)
        band = Image.new('L', (W, H), 0); d = ImageDraw.Draw(band)
        d.rectangle((0, int(cy - size * 1.1), W, int(cy + size * 1.1)), fill=150)
        band = band.filter(ImageFilter.GaussianBlur(size * 0.8))
        img = Image.composite(Image.new('RGBA', (W, H), (5, 3, 12, 255)), img, band)
    f = ImageFont.truetype(FONT, size); txt = 'ROADSUCTION'
    widths = [f.getlength(c) for c in txt]; gap = size * track
    while sum(widths) + gap * (len(txt) - 1) > W * 0.9:
        size = int(size * 0.94); f = ImageFont.truetype(FONT, size); widths = [f.getlength(c) for c in txt]; gap = size * track
    total = sum(widths) + gap * (len(txt) - 1); x0 = (W - total) / 2; y = cy - size * 0.62
    def draw(layer, fill, dx=0, dy=0, stroke=0, sf=None):
        d = ImageDraw.Draw(layer); x = x0
        for c, w in zip(txt, widths):
            d.text((x + dx, y + dy), c, font=f, fill=fill, stroke_width=stroke, stroke_fill=sf); x += w + gap
    glow = Image.new('RGBA', img.size, (0, 0, 0, 0))
    draw(glow, (255, 43, 214, 210), dx=-size * .04); draw(glow, (0, 229, 255, 210), dx=size * .04)
    glow = glow.filter(ImageFilter.GaussianBlur(max(2, size * .12)))
    img = Image.alpha_composite(img, glow)
    top = Image.new('RGBA', img.size, (0, 0, 0, 0)); draw(top, (255, 255, 255, 255), stroke=max(1, size // 28), sf=(10, 6, 24, 255))
    return Image.alpha_composite(img, top).convert('RGB')

def no_mint(img):  # Poki: keep pixels away from the playground colour #83FFE7
    a = np.asarray(img).astype(float); d = np.sqrt(((a - [0x83, 0xFF, 0xE7]) ** 2).sum(-1))
    m = np.clip((110 - d) / 50, 0, 1)[..., None]           # pixels within ~110 of mint get pushed toward deep sky blue
    a = a * (1 - m) + np.array([70, 150, 255]) * m
    return Image.fromarray(a.clip(0, 255).astype('uint8'))

L = lambda n: Image.open(f'{R}/{n}.png').convert('RGB')
land, port, sq, r43, wide, r53 = L('land_b'), L('port_a'), L('sq_a'), L('r43_b'), L('wide_b'), L('r53_a')
out = {
  'crazygames-landscape-1920x1080.png': title(fit(land, 1920, 1080), 1080 * .84, 150),
  'crazygames-portrait-800x1200.png':   title(fit(port, 800, 1200), 1200 * .80, 96),
  'crazygames-square-800x800.png':      title(fit(sq, 800, 800), 800 * .86, 84),
  'poki-square-628x628.png':            no_mint(fit(sq, 628, 628)),
  'gd-512x512.png':                     title(fit(sq, 512, 512), 512 * .87, 54),
  'gd-512x384.png':                     title(fit(r43, 512, 384), 384 * .86, 50),
  'gd-200x120.png':                     title(fit(r53, 200, 120), 120 * .84, 22, shade=True),
  'gd-1280x720.png':                    title(fit(land, 1280, 720), 720 * .84, 100),
  'gd-1280x550.png':                    title(fit(wide, 1280, 550), 550 * .84, 84),
}
for n, im in out.items():
    im.save(f'{OUT}/{n}', optimize=True); print(n, im.size)
a = np.asarray(out['poki-square-628x628.png']).astype(int); d = np.sqrt(((a - [0x83, 0xFF, 0xE7]) ** 2).sum(-1))
print('poki: share of pixels within 60 of #83FFE7 =', round(float((d < 60).mean()), 5))
