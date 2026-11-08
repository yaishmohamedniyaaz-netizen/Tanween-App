"""Pilot visual-review workbench. Interior cuts are entered by the observer.

Transfer is monotone x-alignment of an already visually decided representative;
pending transfers never become decisions until their rendered sheet is viewed.
"""
from __future__ import annotations
import argparse
from collections import defaultdict
from datetime import datetime, timezone
from functools import lru_cache
import hashlib
import json
from pathlib import Path
import sys
import subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

VISUAL=Path(__file__).resolve().parent.parent
RANK=int(sys.argv[1])
HERE=VISUAL/'reviews'/f'rank{RANK:03d}'
ROOT=VISUAL.parents[2]
ART=ROOT/'public/mushaf/1405-artwork-5a5f9f3846158475'
sys.path.insert(0,str(VISUAL))
import style_render
from font_support import load_font
FONT=load_font(22)
SMALL=load_font(17)
TINY=load_font(14)

def read(p): return json.loads(Path(p).read_text(encoding='utf8'))
def write(p,v):
    p=Path(p);p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def now():return datetime.now(timezone.utc).isoformat()

def deferred_ids():
    p=HERE/'pending-owner.json'
    return {d['wid'] for d in read(p)} if p.exists() else set()

def prepare():
    raw=(VISUAL/'groups.json').read_bytes(); g=json.loads(raw)
    assert g['method']=='exact-text-complete-link-skeleton-v1'
    hidden={x['wid'] for x in read(VISUAL/'blind/test-ids.json')}
    spelling,entry=next((k,v) for k,v in g['spellings'].items() if v['rank']==RANK)
    words={}; clusters=[];excluded=[]
    for c in entry['clusters']:
        c=dict(c); ids=[w for w in c['memberIds'] if w not in hidden]
        excluded.extend(w for w in c['memberIds'] if w in hidden)
        if not ids:continue
        c['memberIds']=ids
        if c['representative']['wid'] in hidden:
            wid=ids[0];c['representative']={**g['words'][wid],'wid':wid,'units':[
                {**u,'tid':f'{wid}@r{u["start"]}'} for u in entry['unitVariants'][g['words'][wid]['unitVariant']]]}
        for wid in ids:
            words[wid]={**g['words'][wid],'wid':wid,'cluster':c['id'],'units':[
                {**u,'tid':f'{wid}@r{u["start"]}'} for u in entry['unitVariants'][g['words'][wid]['unitVariant']]]}
        clusters.append(c)
    out={'rank':RANK,'spelling':spelling,'groupsSha256':hashlib.sha256(raw).hexdigest(),
         'excludedHiddenIds':excluded,'clusters':clusters,'words':words}
    write(HERE/'manifest.json',out)
    style_render.OUT=HERE
    style_render.render_gdi_labels([dict(key=f'{c["representative"]["wid"]}-{i}',text=u['show']) for c in clusters for i,u in enumerate(c['representative']['units'])])
    print(json.dumps({'rank':RANK,'clusters':len(clusters),'words':len(words),'excludedHiddenIds':excluded}))

@lru_cache(maxsize=8)
def page(p):return Image.open(ART/f'p{p}.png').convert('L')

def crop_word(w):
    box=[round(v) for v in w['body']]
    return page(w['page']).crop(box),box

@lru_cache(maxsize=604)
def page_ends(p):
    # Exact retained outer-edge contract; never derives interior boundaries.
    import math
    sys.path.insert(0,str(VISUAL.parent))
    from pieces2 import page_pieces
    parts,lab=page_pieces(p);ink=np.asarray(page(p))<128;out={}
    for item in parts:
        w=item['word'];x0,y0,x1,y1=[round(v) for v in w['body']]
        ya,yb=max(0,y0-8),min(lab.shape[0],y1+8)
        own=np.isin(lab[ya:yb,x0:x1],[q['id'] for q in item['pieces']])&ink[ya:yb,x0:x1]
        if not own.any():own=ink[ya:yb,x0:x1]
        cols=np.flatnonzero(own.any(0));assert len(cols)
        out[w['wid']]=[min(int(cols[-1])+x0+1,math.floor(w['body'][2])),max(int(cols[0])+x0,math.ceil(w['body'][0]))]
    return out

def ends(w):return page_ends(w['page'])[w['wid']]

@lru_cache(maxsize=604)
def previous_guess(p):
    # Immutable rejected round: faint visual reference only, never a cut source.
    raw=subprocess.check_output(['git','show',f'2837f6f:public/letter-borders-guess/p{p}.json'],cwd=ROOT)
    return json.loads(raw)['words']

def tile(w,cuts=None,large=False):
    crop,box=crop_word(w);x0,y0,x1,y1=box
    W,H=(1000,590) if large else (520,300)
    desired=400 if large else 210
    scale=min(desired/crop.height,(W-50)/crop.width)
    crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
    canvas=Image.new('RGB',(W,H),'white');d=ImageDraw.Draw(canvas)
    label=f'{w["cluster"]} p{w["page"]} {w["wid"]}'
    d.text((12,6),label,font=SMALL if large else TINY,fill='black')
    ox=(W-crop.width)//2;oy=42 if large else 30
    if cuts:
        bg=np.full((crop.height,crop.width,3),255,dtype=np.uint8)
        for i,(r,l) in enumerate(zip(cuts,cuts[1:])):
            bg[:,max(0,round((l-x0)*scale)):min(crop.width,round((r-x0)*scale))]=[(234,244,255),(255,241,219)][i%2]
        shaded=Image.fromarray((bg.astype(float)*(np.asarray(crop)[:,:,None]/255)).astype('uint8'))
        canvas.paste(shaded,(ox,oy))
        for v in cuts:
            xx=ox+round((v-x0)*scale);d.line((xx,oy,xx,oy+crop.height),fill='#58748b',width=1)
    else:
        canvas.paste(crop.convert('RGB'),(ox,oy))
        # A starting hint only, never an input to a visual decision or transfer.
        old=previous_guess(w['page']).get(w['wid'])
        if old:
            for v in old['x'][1:-1]:
                xx=ox+round((v-x0)*scale)
                for yy in range(oy,oy+crop.height,14):d.line((xx,yy,xx,min(yy+5,oy+crop.height)),fill='#cccccc')
    ruler=oy+crop.height+7
    d.line((ox,ruler,ox+crop.width,ruler),fill='#555555')
    for v in range((x0+4)//5*5,x1+1,5):
        xx=ox+round((v-x0)*scale);major=v%20==0
        d.line((xx,ruler,xx,ruler+(10 if major else 4)),fill='black')
        if major:d.text((xx,ruler+11),str(v),font=SMALL if large else TINY,fill='black',anchor='mt')
    if large:
        for i,u in enumerate(w['units']):
            cx=920-(i+.5)*840/len(w['units'])
            label=Image.open(HERE/'labels'/f'{w["wid"]}-{i}.png').resize((140,78))
            canvas.paste(label,(round(cx-70),491))
            d.text((cx,572),f'{i+1} '+w['units'][i]['primary']+(' silent' if u.get('silent') else ''),font=SMALL,fill='black',anchor='mm')
    else:
        d.text((W//2,H-13),str(cuts) if cuts else 'RTL targets '+str(len(w['units'])),font=TINY,fill='#445566',anchor='mm')
    return canvas

def render_reps(first=0,count=6):
    m=read(HERE/'manifest.json'); pending=read(HERE/'representative-cuts.json') if (HERE/'representative-cuts.json').exists() else {}
    deferred=deferred_ids()
    stage='check' if all(c['representative']['wid'] in pending or c['representative']['wid'] in deferred for c in m['clusters'][first:first+count]) else 'original'
    sheets=[]
    for start in range(first,min(first+count,len(m['clusters'])),6):
        batch=m['clusters'][start:min(start+6,first+count)];canvas=Image.new('RGB',(2000,1770),'#eee')
        ids=[]
        for i,c in enumerate(batch):
            w=m['words'][c['representative']['wid']];wid=w['wid'];ids.append(wid)
            piece=tile(w,pending.get(wid,{}).get('x'),True)
            if wid in deferred:ImageDraw.Draw(piece).text((12,25),'PENDING OWNER: missing body target',font=SMALL,fill='#b32020')
            canvas.paste(piece,((i%2)*1000,(i//2)*590))
        name=f'representatives-{stage}-{start//6+1:03}.png';canvas.save(HERE/name)
        sheets.append({'image':name,'words':ids,'stage':stage})
    write(HERE/f'representatives-{stage}-{first:03d}-sheets.json',sheets)
    print(json.dumps(sheets))

def set_cuts(values):
    """values maps numeric cluster suffix to [global cut, confidence, note]."""
    m=read(HERE/'manifest.json');out=read(HERE/'representative-cuts.json') if (HERE/'representative-cuts.json').exists() else {}
    for c in m['clusters']:
        num=int(c['id'].split('-c')[-1])
        if str(num) not in values:continue
        cuts,confidence,note=values[str(num)];w=m['words'][c['representative']['wid']];r,l=ends(w)
        xs=[r,*cuts,l];assert len(xs)==len(w['units'])+1 and all(a-b>=2 for a,b in zip(xs,xs[1:]))
        out[w['wid']]={'wid':w['wid'],'page':w['page'],'x':xs,'confidence':confidence,'source':'visual','cluster':c['id'],'note':note}
    write(HERE/'representative-cuts.json',out)

def skeleton(w):
    box=[round(v) for v in w['shapeComparisonBox']]
    mask=np.asarray(page(w['page']).crop(box))<128
    left,right,top,bottom=0,mask.shape[1],0,mask.shape[0]
    # Shape alignment only. This never selects a boundary absent a visual cut.
    norm=np.array(Image.fromarray((mask[top:bottom,left:right]*255).astype('uint8')).resize((right-left,32),Image.Resampling.BILINEAR))/255
    return norm,box[0]+left,box[0]+right

def warp(src,dst,cuts):
    a,al,ar=skeleton(src);b,bl,br=skeleton(dst)
    n,m=a.shape[1],b.shape[1];cost=np.abs(a[:,:,None]-b[:,None,:]).mean(0)
    dp=np.full((n+1,m+1),np.inf);dp[0,0]=0
    for i in range(1,n+1):
        for j in range(1,m+1):dp[i,j]=cost[i-1,j-1]+min(dp[i-1,j-1],dp[i-1,j]+.02,dp[i,j-1]+.02)
    mapping=defaultdict(list);i,j=n,m
    while i>0 and j>0:
        mapping[i-1].append(j-1)
        move=int(np.argmin([dp[i-1,j-1],dp[i-1,j]+.02,dp[i,j-1]+.02]))
        if move!=2:i-=1
        if move!=1:j-=1
    xs=[]
    for cut in cuts:
        key=min(max(cut-al,0),n-1);xs.append(round(bl+np.mean(mapping[key])))
    r,l=ends(dst);out=[r,*xs,l]
    if any(a-b<2 for a,b in zip(out,out[1:])):raise ValueError(f'Needs manual cut: {dst["wid"]} {out}')
    return out

def transfer():
    m=read(HERE/'manifest.json');reps=read(HERE/'representative-cuts.json')
    approved=final_records()
    out={}
    for c in m['clusters']:
        rep=c['representative']['wid']
        if rep not in approved:continue
        assert approved[rep]['x']==reps[rep]['x'],f'Representative not visually checked: {rep}'
        for wid in c['memberIds']:
            if wid==rep or wid in approved:continue
            w=m['words'][wid];d=reps[rep]
            out[wid]={'wid':wid,'page':w['page'],'x':warp(m['words'][rep],w,d['x'][1:-1]),
              'confidence':d['confidence'],'source':'visual-copy','cluster':c['id'],
              'note':f'X-warp from visually decided {rep}; destination requires sheet review.'}
    write(HERE/'member-cuts.json',out)
    print('Pending transfers',len(out))

def render_members():
    m=read(HERE/'manifest.json');pending=read(HERE/'member-cuts.json')
    final=final_records();ordered=sorted((w for w in pending if w not in final),key=lambda wid:(pending[wid]['cluster'],pending[wid]['page'],wid))
    sheets=[]
    for start in range(0,len(ordered),25):
        batch=ordered[start:start+25];canvas=Image.new('RGB',(2600,1500),'#eee')
        for i,wid in enumerate(batch):canvas.paste(tile(m['words'][wid],pending[wid]['x']),((i%5)*520,(i//5)*300))
        name=f'members-after{len(final):05d}-{start//25+1:03}.png';canvas.save(HERE/name);sheets.append({'image':name,'words':batch,'stage':'members'})
    write(HERE/f'member-after{len(final):05d}-sheets.json',sheets);print(json.dumps(sheets))

def final_records():
    p=VISUAL/f'annotations/rank{RANK:03d}.jsonl'
    return {d['wid']:d for d in (json.loads(s) for s in p.read_text(encoding='utf8').splitlines())} if p.exists() else {}

def record_view(names, corrections=None):
    """Call only AFTER actual image-tool inspection of every named image."""
    manifests=[]
    for p in HERE.glob('*-sheets.json'):manifests.extend(read(p))
    by_image={s['image']:s for s in manifests};final=final_records();corrections=corrections or {}
    reps=read(HERE/'representative-cuts.json') if (HERE/'representative-cuts.json').exists() else {}
    members=read(HERE/'member-cuts.json') if (HERE/'member-cuts.json').exists() else {}
    audit=VISUAL/f'audit/rank{RANK:03d}.jsonl';audit.parent.mkdir(exist_ok=True)
    for name in names:
        s=by_image[name]
        with audit.open('a',encoding='utf8') as f:f.write(json.dumps({'event':'visually-reviewed','image':(HERE/name).relative_to(ROOT).as_posix(),
            'words':s['words'],'observer':'blind_test','at':now(),'stage':s['stage'],'sha256':hashlib.sha256((HERE/name).read_bytes()).hexdigest()},ensure_ascii=False)+'\n')
        if s['stage']=='original':continue
        for wid in s['words']:
            if wid in deferred_ids():continue
            d=dict((reps if s['stage']=='check' else members)[wid])
            if wid in corrections:
                cuts,confidence,note=corrections[wid];d.update(x=[d['x'][0],*cuts,d['x'][-1]],confidence=confidence,source='visual',note=note)
                # Corrections need a separate rendered self-check before finalising.
                members[wid]=d;write(HERE/'member-cuts.json',members)
                continue
            if d['source']=='visual-copy':d['note']=d['note'].replace('destination requires sheet review.','destination visually checked on '+name+'.')
            final[wid]=d
    out=VISUAL/f'annotations/rank{RANK:03d}.jsonl';out.parent.mkdir(exist_ok=True)
    out.write_text(''.join(json.dumps(final[w],ensure_ascii=False)+'\n' for w in sorted(final)),encoding='utf8')
    print(json.dumps({'rank':RANK,'finalDecisions':len(final),'visual':sum(d['source']=='visual' for d in final.values()),'visual-copy':sum(d['source']=='visual-copy' for d in final.values())}))

if __name__=='__main__':
    command=sys.argv[2]
    if command=='reps':render_reps(int(sys.argv[3]),int(sys.argv[4]))
    elif command=='set':set_cuts(read(sys.argv[3]))
    elif command=='record':record_view(sys.argv[3:])
    else:{'prepare':prepare,'transfer':transfer,'members':render_members}[command]()
