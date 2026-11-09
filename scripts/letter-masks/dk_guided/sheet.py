import sys, json, random, time
import numpy as np
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
import dkguide as G

PAL = [(202, 36, 77), (51, 88, 212), (213, 142, 58), (55, 123, 96), (140, 60, 180), (0, 150, 170), (190, 90, 20), (90, 90, 90)]
FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)


def word_tile(p, wid, scale=2.2):
    t = time.time()
    r = G.label_print(p, wid)
    lab, ink = r['labels'], r['ink']
    H, W = lab.shape
    img = np.full((H, W, 3), 255, np.uint8)
    img[ink] = (30, 30, 30)
    for k in range(len(r['tids'])):
        if r['tids'][k] != '__none__': img[lab == k + 1] = PAL[k % len(PAL)]
    # bars under the word
    bh = 10
    canvas = np.full((H + 3 * bh, W, 3), 255, np.uint8)
    canvas[:H] = img
    for k, (t_, b) in enumerate(G.bars(r).items()):
        if b and t_ != '__none__':
            canvas[H + bh + (k % 2) * 4: H + bh + (k % 2) * 4 + 5, b[0]:b[1]] = PAL[k % len(PAL)]
    # the DigitalKhatt word, same colours, on the left
    dw, dbox, masks = G.dk_letters(p, wid)
    sh = next(iter(masks.values())).shape
    dimg = np.full((sh[0], sh[1], 3), 255, np.uint8)
    for k, t_ in enumerate(r['tids']):
        dimg[masks[t_]] = (30, 30, 30) if t_ == '__none__' else PAL[k % len(PAL)]
    both = np.full((max(canvas.shape[0], sh[0]), canvas.shape[1] + sh[1] + 16, 3), 255, np.uint8)
    both[:sh[0], :sh[1]] = dimg
    both[:canvas.shape[0], sh[1] + 16:] = canvas
    im = Image.fromarray(both).resize((int(both.shape[1] * scale * 0.8), int(both.shape[0] * scale * 0.8)), Image.LANCZOS)
    return im, r, time.time() - t


def sheet(items, path, cols=3):
    tiles = []
    for p, wid in items:
        try:
            im, r, dt = word_tile(p, wid)
            unlabeled = int(((r['labels'] == 0) & r['ink']).sum())
            empty = [t for k, t in enumerate(r['tids']) if not (r['labels'] == k + 1).any()]
            tiles.append((im, f"p{p} {wid} {r['word']['text']}  fit={r['fit']:.1f} empty={len(empty)}", r))
        except Exception as e:
            print('fail', p, wid, e)
    cw = max(t[0].width for t in tiles) + 20
    rows = [tiles[i:i + cols] for i in range(0, len(tiles), cols)]
    rh = [max(t[0].height for t in row) + 30 for row in rows]
    out = Image.new('RGB', (cw * cols, sum(rh)), 'white')
    d = ImageDraw.Draw(out)
    y = 0
    for row, h in zip(rows, rh):
        for c, (im, cap, _) in enumerate(row):
            out.paste(im, (c * cw + (cw - im.width) // 2, y + 22))
            d.text((c * cw + 6, y + 2), cap, fill=(0, 0, 0), font=FONT)
        y += h
    out.save(path)
    return tiles


if __name__ == '__main__':
    items = json.loads(sys.argv[1])
    sheet([tuple(x) for x in items], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 3)
