"""Render owner-review evidence only after the complete, once-scored pilot.

Uses the saved evaluation result; never reads approvals or recomputes scores.
Generating images does not record them as visually reviewed.
"""
import hashlib
import random
from PIL import Image, ImageDraw
import annotation_grouping as ag
from build_guess_files import load_decisions
from check_checkpoint import audit

SEED = 20261107


def main():
    report = audit()
    if not report['complete']:
        raise SystemExit('Pilot incomplete: no checkpoint artifacts generated.')
    result = ag.read(ag.HERE/'checkpoint-a-test.json')
    frozen = hashlib.sha256((ag.HERE/'blind/decisions.jsonl').read_bytes()).hexdigest()
    if frozen != result['blindSha256']:
        raise ValueError('Frozen predictions changed')
    groups = ag.read(ag.HERE/'groups.json')
    decisions = load_decisions(ag.HERE/'decisions.jsonl')
    byword = {}
    pilot = set()
    for spelling in groups['spellings'].values():
        for cluster in spelling['clusters']:
            for wid in cluster['memberIds']:
                byword[wid] = (spelling, cluster)
                if spelling['pilot']:
                    pilot.add(wid)
    eligible = sorted(pilot & set(decisions))
    selected = random.Random(SEED).sample(eligible, 200)
    out = ag.HERE/'contact'
    out.mkdir(exist_ok=True)
    ag.pr.HERE = out
    ag.style_render.OUT = out/'pilot'
    all_ids = selected + [row['wid'] for row in result['worst']]
    labels = []
    for wid in all_ids:
        spelling, cluster = byword[wid]
        labels += [dict(key=f'{wid}-{i}', text=u['show'])
                   for i,u in enumerate(spelling['unitVariants'][cluster['unitVariant']])]
    ag.style_render.render_gdi_labels(labels)

    def tile(wid, decision):
        spelling, original = byword[wid]
        cluster = dict(original)
        cluster['representative'] = ag.metadata(cluster, wid, groups, spelling)
        return ag.pr.tile(cluster, decision)

    manifest = dict(seed=SEED, sampling='random.Random(seed).sample(sorted(decided pilot IDs),200)',
                    eligibleWords=len(eligible), withheldExcluded=report['reviewedWithheldCount'],
                    generatedOnly=True, pilotSheets=[], worstImages=[])
    for start in range(0, 200, 20):
        batch = selected[start:start+20]
        canvas = Image.new('RGB', (1728,1180), '#eeeeee')
        for i,wid in enumerate(batch):
            canvas.paste(tile(wid, decisions[wid]).resize((432,236), Image.Resampling.LANCZOS),
                         ((i%4)*432,(i//4)*236))
        path = out/f'visual-pilot-{start//20+1:02}.png'
        canvas.save(path)
        manifest['pilotSheets'].append(dict(image=path.relative_to(ag.ROOT).as_posix(), words=batch,
                                             sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    for i,row in enumerate(result['worst'], 1):
        canvas = Image.new('RGB',(2160,640),'white')
        draw = ImageDraw.Draw(canvas)
        draw.text((15,8),f"Frozen blind prediction — {row['confidence']} confidence",font=ag.pr.FONT,fill='black')
        draw.text((1095,8),f"Existing approval — max error {row['maxErrorPx']:.2f} display px",font=ag.pr.FONT,fill='black')
        canvas.paste(tile(row['wid'], row),(0,50))
        canvas.paste(tile(row['wid'],dict(row,x=row['approved'])),(1080,50))
        path=out/f"visual-test-worst-{i:02}-{row['wid']}.png"
        canvas.save(path)
        manifest['worstImages'].append(dict(image=path.relative_to(ag.ROOT).as_posix(),words=[row['wid']],
                                             sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    ag.write(out/'checkpoint-a-manifest.json',manifest)
    print('Generated 10 seeded pilot sheets (200 words) and 10 worst-test comparison images; no view claims added.')


if __name__ == '__main__':
    main()
