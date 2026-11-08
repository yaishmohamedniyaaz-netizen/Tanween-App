"""Blind crop renderer. Reads test IDs, artwork and app units, never approval cuts."""
import json, math, os, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from font_support import load_font
ROOT = HERE.parents[3]
ART = ROOT / 'public/mushaf/1405-artwork-5a5f9f3846158475'
NAMES = dict(zip('ءاأإآبتثجحخدذرزسشصضطظعغفقكلمنهويىؤئٱة',
 ['hamza','alif','alif hamza','alif hamza','alif madd','ba','ta','tha','jim','ha','kha','dal','dhal','ra','zay','sin','shin','sad','dad','ta emph','za emph','ayn','ghayn','fa','qaf','kaf','lam','mim','nun','ha','waw','ya','alif maqs','waw hamza','ya hamza','alif wasl','ta marb']))
font = load_font(22)
small = load_font(16)
arabic = load_font(28, arabic=os.name != 'nt')
arabic_options = {} if os.name == 'nt' else {'direction': 'rtl', 'language': 'ar'}
ids = json.loads((HERE/'test-ids.json').read_text())
units = json.loads((HERE/'units.json').read_text(encoding='utf8'))
decisions = {}
if (HERE/'decisions.jsonl').exists():
    decisions={d['wid']:d for d in [json.loads(s) for s in (HERE/'decisions.jsonl').read_text().splitlines()]}
meta=[]
for wi, ident in enumerate(sorted(ids,key=lambda x:(x['page'],x['wid']))):
    wid,p=ident['wid'],ident['page']
    page=json.loads((ART/f'p{p}.json').read_text(encoding='utf8'))
    word=next(w for w in page['words'] if w['wid']==wid)
    x0,y0,x1,y1=word['body']
    bx0,by0,bx1,by1=word['band']
    # Word body is immutable horizontal range. Show whole vertical band for marks.
    cropbox=(math.floor(x0),math.floor(by0),math.ceil(x1),math.ceil(by1))
    crop=Image.open(ART/f'p{p}.png').convert('RGB').crop(cropbox)
    factor=min(4,400/max(1,y1-y0))
    W,H=round(crop.width*factor),round(crop.height*factor)
    crop=crop.resize((W,H),Image.Resampling.NEAREST)
    width=max(W+100,1000); left=(width-W)//2; top=90
    canvas=Image.new('RGB',(width,H+280),'white'); canvas.paste(crop,(left,top))
    draw=ImageDraw.Draw(canvas)
    draw.text((20,12),f"{wi+1:02d}. {wid} | page {p} | body x {x0} .. {x1} | {len(units[wid]['units'])} targets",font=font,fill='black')
    labels=[]
    for i,u in enumerate(units[wid]['units']):
        labels.append(f"{i+1}:{NAMES.get(u['primary'],u['primary'])}"+(' (silent)' if u['silent'] else ''))
    draw.text((20,45),'RTL: '+ ' | '.join(labels),font=small,fill='black')
    if wid in decisions:
        d=decisions[wid]; xs=d['x']
        overlay=Image.new('RGBA',canvas.size,(0,0,0,0)); od=ImageDraw.Draw(overlay)
        for k,(r,l) in enumerate(zip(xs,xs[1:])):
            color=[(100,170,255,45),(255,175,110,45)][k%2]
            od.rectangle((left+(l-cropbox[0])*factor,top,left+(r-cropbox[0])*factor,top+H),fill=color)
        canvas=Image.alpha_composite(canvas.convert('RGBA'),overlay).convert('RGB'); draw=ImageDraw.Draw(canvas)
        for x in xs:
            xp=left+(x-cropbox[0])*factor
            draw.line((xp,top,xp,top+H),fill=(60,100,160),width=1)
        draw.text((20,H+245),f"Pass review: {d['confidence']} | {xs}",font=small,fill='black')
    baseline=top+H+10
    draw.line((left,baseline,left+W,baseline),fill='black')
    for x in range(math.ceil(x0/5)*5,math.floor(x1/5)*5+1,5):
        xp=left+(x-cropbox[0])*factor
        draw.line((xp,baseline,xp,baseline+(16 if x%20==0 else 7)),fill='black')
        if x%20==0: draw.text((xp,baseline+18),str(x),font=small,fill='black',anchor='mt')
    # RTL target cells numbered consistently with decisions list.
    n=len(units[wid]['units']); cell=(width-40)/n
    for i,u in enumerate(units[wid]['units']):
        cx=width-20-cell*(i+.5)
        draw.text((cx,baseline+48),u['show'],font=arabic,fill='black',anchor='mt',**arabic_options)
        draw.text((cx,baseline+86),labels[i],font=small,fill='black',anchor='mt')
    suffix=(sys.argv[1] if len(sys.argv)>1 else 'review1') if wid in decisions else 'crop'
    path=HERE/f'{wi+1:02d}_{wid}_{suffix}.png'; canvas.save(path)
    meta.append({'index':wi+1,**ident,'body':word['body'],'band':word['band'],'text':word['text'],'units':units[wid]['units'],'image':path.name})
(HERE/'word-metadata.json').write_text(json.dumps(meta,indent=2,ensure_ascii=False),encoding='utf8')
print(f'Rendered {len(meta)} blind crops/reviews')
