"""Render cluster representatives for human/agent visual decisions; no cuts inferred."""
import argparse
import json
from functools import lru_cache
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from build_guess_files import HERE, ROOT, ART, read, write
import style_render
from font_support import load_font
import unicodedata
import subprocess

# Read the rejected round from its immutable base, never from the progressively
# rebuilt visual output. It is a faint reference only, not an annotation source.
PREVIOUS_GUESS_REVISION='2837f6f'

FONT=load_font(22)
SMALL=load_font(17)
NAMES=dict(zip('ءاأإآٱبتثجحخدذرزسشصضطظعغفقكلمنهوىيؤئة',
    ['hamza','alif','alif','alif','alif','wasl','ba','ta','tha','jim','ha','kha','dal','dhal','ra','zay','sin','shin','sad','dad','ta','za','ayn','ghayn','fa','qaf','kaf','lam','mim','nun','ha','waw','alif-maqsura','ya','waw-hamza','ya-hamza','ta-marbuta']))


@lru_cache(maxsize=8)
def page(p): return Image.open(ART/f'p{p}.png').convert('RGB')


@lru_cache(maxsize=604)
def previous_guesses(p):
    result=subprocess.run(['git','show',f'{PREVIOUS_GUESS_REVISION}:public/letter-borders-guess/p{p}.json'],cwd=ROOT,capture_output=True,check=True,text=True,encoding='utf-8')
    return json.loads(result.stdout)['words']


def tile(cluster, decision=None):
    rep=cluster['representative']; wid=rep['wid']; p=rep['page']
    box=rep['body']; x0,y0,x1,y1=[round(v) for v in box]
    crop=page(p).crop((x0,y0,x1,y1))
    ratio=min(400/crop.height,1000/crop.width)
    crop=crop.resize((round(crop.width*ratio),round(crop.height*ratio)),Image.Resampling.LANCZOS)
    canvas=Image.new('RGB',(1080,590),'white'); draw=ImageDraw.Draw(canvas)
    draw.text((15,8),f'{cluster["id"]}  p{p} {wid}  members={len(cluster["memberIds"])}',font=FONT,fill='black')
    ox=(1080-crop.width)//2; oy=55
    if decision:
        # Tint paper only: retain black strokes and antialiased edge coverage.
        paper=Image.new('RGB',crop.size,'white'); painter=ImageDraw.Draw(paper)
        for i,(r,l) in enumerate(zip(decision['x'],decision['x'][1:])):
            painter.rectangle((round((l-x0)*ratio),0,round((r-x0)*ratio),crop.height),fill=(228,240,253) if i%2==0 else (253,239,220))
        crop=Image.fromarray((np.asarray(crop,dtype=float)*np.asarray(paper,dtype=float)/255).astype('uint8'))
    canvas.paste(crop,(ox,oy))
    prev=previous_guesses(p).get(wid) if not decision else None
    if prev and not decision:
        for v in prev['x']:
            xx=ox+round((v-x0)*ratio)
            for yy in range(oy,oy+crop.height,14): draw.line((xx,yy,xx,min(yy+6,oy+crop.height)),fill='#c4c4c4')
    if decision:
        for v in decision['x']:
            xx=ox+round((v-x0)*ratio); draw.line((xx,oy,xx,oy+crop.height),fill='#555555',width=1)
    ry=oy+crop.height+8; draw.line((ox,ry,ox+crop.width,ry),fill='#555555')
    for v in range((x0+4)//5*5,x1+1,5):
        xx=ox+round((v-x0)*ratio); major=v%20==0
        draw.line((xx,ry,xx,ry+(12 if major else 5)),fill='black')
        if major: draw.text((xx,ry+13),str(v),font=SMALL,fill='black',anchor='mt')
    units=rep['units']
    # Individual target boxes run right to left, independent of bidi punctuation.
    cell=min(140,1000/max(1,len(units)))
    for i,u in enumerate(units):
        cx=1040-i*cell-cell/2
        label=u.get('show',u.get('fullGlyph',u.get('primary','?')))
        label_image=Image.open(HERE/'pilot/labels'/f'{wid}-{i}.png').convert('RGB').resize((112,62))
        canvas.paste(label_image,(round(cx-56),496))
        name='+'.join(NAMES.get(ch,ch) for ch in label if unicodedata.category(ch).startswith('L') and ch!='ـ')
        draw.text((cx,565),f'{i+1} {name}'+(' silent' if u.get('silent') else ''),font=SMALL,fill='black',anchor='mm')
    return canvas


def render(ranks,primary_only=False):
    groups=read(HERE/'groups.json'); selected=[]
    for spelling in groups['spellings'].values():
        if spelling['rank'] not in ranks: continue
        clusters=sorted(spelling['clusters'],key=lambda c:(-len(c['memberIds']),c['id']))
        selected += clusters[:1] if primary_only else clusters
    out=HERE/'pilot'; out.mkdir(exist_ok=True)
    style_render.OUT=out
    style_render.render_gdi_labels([dict(key=f'{c["representative"]["wid"]}-{i}',text=u['show']) for c in selected for i,u in enumerate(c['representative']['units'])])
    manifests=[]
    for start in range(0,len(selected),6):
        batch=selected[start:start+6]; image=Image.new('RGB',(2160,590*3),'#eeeeee')
        for i,c in enumerate(batch): image.paste(tile(c),((i%2)*1080,(i//2)*590))
        path=out/f'reps-{min(ranks):03}-{max(ranks):03}-{start//6+1:04}.png'; image.save(path)
        manifests.append(dict(image=path.relative_to(ROOT).as_posix(),clusters=[dict(id=c['id'],representative=c['representative'],members=len(c['memberIds'])) for c in batch]))
    write(out/f'manifest-{min(ranks):03}-{max(ranks):03}.json',manifests)
    print(len(selected),'representatives;',len(manifests),'sheets')


if __name__=='__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('first',type=int); parser.add_argument('last',type=int)
    parser.add_argument('--primary-only',action='store_true'); args=parser.parse_args()
    render(set(range(args.first,args.last+1)),args.primary_only)
