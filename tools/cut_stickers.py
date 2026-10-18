#!/usr/bin/env python3
"""Cuts a generated sheet of stickers (figures with a white outline on a plain grey background) into separate
transparent WebP files. Usage: python3 tools/cut_stickers.py sheet.png out_dir name1 name2 … (names in reading order:
top row left to right, then the next row). Figures are scaled to at most 420 px high."""
import sys, pathlib
import numpy as np
from PIL import Image
from scipy import ndimage

src, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]); names = sys.argv[3:]
out.mkdir(parents=True, exist_ok=True)
im = Image.open(src).convert('RGB'); a = np.asarray(im).astype(int)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
# background: grey (low saturation), not as bright as the white outline
greyish = ((mx - mn) < 22) & (mx > 150) & (mx < 236)
lab, n = ndimage.label(greyish)
edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
bg = np.isin(lab, list(edge))
# background seen through a gap (between a stick and a leg) is enclosed by the figure: same grey, big enough → background
ref = a[bg].mean(axis=0)
idx = np.arange(1, n + 1)
area = ndimage.sum(greyish, lab, idx)
means = np.stack([ndimage.mean(a[..., c], lab, idx) for c in range(3)], axis=1)
stds = np.stack([ndimage.standard_deviation(a[..., c], lab, idx) for c in range(3)], axis=1)
holes = [i for i, ar, mu, sd in zip(idx, area, means, stds) if i not in edge and ar > 600 and np.abs(mu - ref).max() < 10 and sd.max() < 12]
if holes: bg |= np.isin(lab, holes)
fg = ~bg
fg = ndimage.binary_opening(fg, iterations=2)
parts, k = ndimage.label(fg)
sizes = ndimage.sum(fg, parts, range(1, k + 1))
keep = [i + 1 for i, s in enumerate(sizes) if s > fg.size * 0.004]
boxes = []
for i in keep:
    ys, xs = np.where(parts == i)
    boxes.append((ys.min(), xs.min(), ys.max(), xs.max(), i))
# figures whose outlines touch come out as one blob: split a too-wide blob at its thinnest column
def split(box):
    y0, x0, y1, x1, i = box
    m = parts[y0:y1 + 1, x0:x1 + 1] == i
    w = x1 - x0 + 1
    if len(boxes) < 2: return [box]
    cols = m.sum(axis=0)
    lo, hi = int(w * 0.3), int(w * 0.7)
    cut = lo + int(np.argmin(cols[lo:hi]))
    out = []
    for xa, xb in ((0, cut), (cut, w)):
        sub = np.zeros_like(m); sub[:, xa:xb] = m[:, xa:xb]
        ys, xs = np.where(sub)
        global k
        k += 1; parts[y0:y1 + 1, x0:x1 + 1][sub] = k
        out.append((y0 + ys.min(), x0 + xs.min(), y0 + ys.max(), x0 + xs.max(), k))
    return out
med = sorted(b[3] - b[1] for b in boxes)[len(boxes) // 2]
while len(boxes) < len(names):
    widest = max(boxes, key=lambda b: b[3] - b[1])
    if widest[3] - widest[1] < med * 1.5: break
    boxes.remove(widest); boxes += split(widest)
# reading order: rows by vertical centre, then left to right
boxes.sort(key=lambda b: ((b[0] + b[2]) / 2) // (a.shape[0] / 3) * 10000 + b[1])
print(src.name, 'figures found:', len(boxes), 'names:', len(names))
alpha = np.where(fg, 255, 0).astype(np.uint8)
rgba = np.dstack([a.astype(np.uint8), alpha])
for (y0, x0, y1, x1, i), name in zip(boxes, names):
    m = (parts[y0:y1 + 1, x0:x1 + 1] == i)
    # keep only the main body: bits of a neighbour's stick left by a split are dropped
    cl, cn = ndimage.label(m)
    if cn > 1: m = cl == (1 + int(np.argmax(ndimage.sum(m, cl, range(1, cn + 1)))))
    ys, xs = np.where(m); m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; y0, x0, y1, x1 = y0 + ys.min(), x0 + xs.min(), y0 + ys.max(), x0 + xs.max()
    crop = rgba[y0:y1 + 1, x0:x1 + 1].copy(); crop[..., 3] = np.where(m, 255, 0)
    pic = Image.fromarray(crop, 'RGBA')
    if pic.height > 420: pic = pic.resize((round(pic.width * 420 / pic.height), 420), Image.LANCZOS)
    pic.save(out / (name + '.webp'), 'WEBP', quality=86, method=6)
    print(' ', name, pic.size, round((out / (name + '.webp')).stat().st_size / 1024), 'KB')
