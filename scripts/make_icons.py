"""Generate the app icons: a red seal with 「修」 on rice paper."""
from PIL import Image, ImageDraw, ImageFont
import os, sys

OUT = os.path.join(os.path.dirname(__file__), '..', 'icons')
FONT = '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc'
PAPER = (239, 233, 220)
RED = (168, 50, 42)
LIGHT = (247, 239, 225)


def icon(size, pad_ratio, path):
    img = Image.new('RGB', (size, size), PAPER)
    d = ImageDraw.Draw(img)
    pad = int(size * pad_ratio)
    r = int(size * 0.06)
    d.rounded_rectangle([pad, pad, size - pad, size - pad], radius=r, fill=RED)
    inset = pad + int(size * 0.045)
    d.rounded_rectangle([inset, inset, size - inset, size - inset], radius=r // 2, outline=LIGHT, width=max(2, size // 64))
    font = ImageFont.truetype(FONT, int((size - 2 * pad) * 0.62))
    text = '修'
    box = d.textbbox((0, 0), text, font=font)
    w, h = box[2] - box[0], box[3] - box[1]
    d.text(((size - w) / 2 - box[0], (size - h) / 2 - box[1]), text, font=font, fill=LIGHT)
    img.save(path, optimize=True)


icon(512, 0.06, os.path.join(OUT, 'icon-512.png'))
icon(192, 0.06, os.path.join(OUT, 'icon-192.png'))
icon(512, 0.16, os.path.join(OUT, 'icon-maskable-512.png'))
icon(180, 0.08, os.path.join(OUT, 'apple-touch-icon.png'))
icon(64, 0.04, os.path.join(OUT, 'favicon-64.png'))
print('ok')
