#!/usr/bin/env python3
"""Cuts a comic page (a 2x2 grid with white gutters) into four panels.

Usage: python3 tools/cut_comic.py <page.png> <out_dir> <page_number>
Writes <out_dir>/p<page>_<1..4>.webp in reading order (left to right, top to bottom).
The gutters are found as the whitest band near the middle; white page margins are trimmed."""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

WHITE = 235


def white_band(frac, lo, hi):
    """Longest run of white lines between lo and hi (indexes of `frac`, the share of white pixels per line)."""
    best, cur, start = (0, 0), 0, 0
    for i in range(lo, hi):
        if frac[i] > 0.97:
            if cur == 0:
                start = i
            cur += 1
            if cur > best[1] - best[0]:
                best = (start, i + 1)
        else:
            cur = 0
    return best


def trim(a, box):
    """Shrinks box (x0, y0, x1, y1) while its edge lines are almost all white, then 2px more against seams."""
    x0, y0, x1, y1 = box
    w = a > WHITE
    while y0 < y1 and w[y0, x0:x1].mean() > 0.9: y0 += 1
    while y1 > y0 and w[y1 - 1, x0:x1].mean() > 0.9: y1 -= 1
    while x0 < x1 and w[y0:y1, x0].mean() > 0.9: x0 += 1
    while x1 > x0 and w[y0:y1, x1 - 1].mean() > 0.9: x1 -= 1
    return x0 + 2, y0 + 2, x1 - 2, y1 - 2


def main(src, out_dir, page):
    img = Image.open(src).convert('RGB')
    a = np.asarray(img.convert('L')).astype(int)
    h, w = a.shape
    r0, r1 = white_band((a > WHITE).mean(1), int(h * .35), int(h * .65))
    c0, c1 = white_band((a > WHITE).mean(0), int(w * .35), int(w * .65))
    if r1 - r0 < 3 or c1 - c0 < 3:
        sys.exit('no gutters found in ' + src)
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    boxes = [(0, 0, c0, r0), (c1, 0, w, r0), (0, r1, c0, h), (c1, r1, w, h)]
    for n, box in enumerate(boxes, 1):
        x0, y0, x1, y1 = trim(a, box)
        panel = img.crop((x0, y0, x1, y1))
        side = min(panel.size)  # panels are square; crop any leftover to the centre square
        if abs(panel.size[0] - panel.size[1]) > 4:
            l, t = (panel.size[0] - side) // 2, (panel.size[1] - side) // 2
            panel = panel.crop((l, t, l + side, t + side))
        if max(panel.size) > 800:
            panel = panel.resize((800, 800), Image.LANCZOS)
        dst = out / f'p{page}_{n}.webp'
        panel.save(dst, 'WEBP', quality=80, method=6)
        print(dst, panel.size, dst.stat().st_size // 1024, 'KB')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3])
