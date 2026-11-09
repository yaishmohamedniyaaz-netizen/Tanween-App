"""Reconstructed Checkpoint 1 integration. No new approvals or automatic scale-up.
Full support bars are artwork coordinates; central 40% is applied only in scoring
and diagnostic rendering. Historical decisions are explicitly marked and low.
"""
from __future__ import annotations
import argparse,math,random
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
from common import *
REVIEW=MASKS/'review';CONTACT=MASKS/'contact'
METHOD='research-cp1-abstain'

def corpus():
    units=load_units();out={}
    for p in range(1,605):
        for w in read(ART/f'p{p}.json')['words']:
            if w.get('role')!='letter':continue
            assert w['wid'] not in out
            out[w['wid']]={**w,'page':p,'tids':[u['tid'] for u in units[w['wid']]['units']]}
    assert len(out)==77433
    return out,units

def supports(p):
    return p.get('bars') or [[b,a] for a,b in zip(p['x'],p['x'][1:])]

def review():
    words,units=corpus();ref=read(HERE/'reference_visual_pilot.json')
    approved=set(frozen_approval_docs()[0]);withheld=set(ref['withheldIds']);families=[];membership={}
    for s in ref['spellings']:
        for f in s['families']:
            families.append({**f,'spelling':s['text'],'spellingRank':s['rank'],'spellingCount':s['count']})
            for wid in f['members']:
                assert wid not in membership
                assert words[wid]['text']==s['text']
                membership[wid]=(f['id'],s['rank'])
    assert len(families)==6068 and len(membership)==22648
    raw=read(HERE/'w1_top100_predictions.json')['predictions'];new={};abstained=[]
    for p in raw:
        wid=p['wid'];assert wid in membership and wid not in approved|withheld
        if p.get('bars') is None:abstained.append({'wid':wid,'reason':p.get('reason','abstained')});continue
        errors=validate_prediction(p,words[wid]);assert not errors,(wid,errors)
        new[wid]={k:p[k] for k in ('wid','page','tids','bars','method')}
    proposals=[]
    for wid,(family,rank) in sorted(membership.items(),key=lambda kv:(kv[1][1],kv[1][0],numeric(kv[0]))):
        if wid in approved|withheld:continue
        if wid in new:p=dict(new[wid]);p['source']='new-2d-representative'
        else:
            d=ref['decisions'][wid]
            p={'wid':wid,'page':words[wid]['page'],'tids':words[wid]['tids'],'x':d['x'],'method':'historical-visual-v1','source':'historical-reference'}
            if d.get('reviewFlags'):p['reviewFlags']=d['reviewFlags']
        p.update(family=family,spellingRank=rank,confidence='low')
        errors=validate_prediction(p,words[wid]);assert not errors,(wid,errors)
        proposals.append(p)
    assert len(proposals)==22648-len(approved&set(membership))-len(withheld)
    base={'schemaVersion':1,'ruleVersion':RULE,'checkpoint':1,'reconstructed':True,'sourceBaseline':BASELINE,'historicalSourceCommit':ref['sourceCommit'],'seed':SEED,'confidencePolicy':'All low; no fresh heldout data and no method reached the 95% gate. A proposal is never an approval.','coordinateConvention':'absolute artwork pixels; bars are full supports, overlapping bars allowed; central 40% applied only for diagnostic measure','scope':'top100 spelling pilot only; 100 new representative attempts, no new 2-D family propagation'}
    write(REVIEW/'proposals-001.json',{**base,'words':proposals,'new2dWords':len(new),'historicalWords':len(proposals)-len(new),'withheldIds':sorted(withheld),'new2dAbstentions':abstained})
    write(REVIEW/'proposals-001-new2d.json',{**base,'words':[p for p in proposals if p['wid'] in new],'abstentions':abstained})
    write(REVIEW/'families-001.json',{'schemaVersion':1,'sourceCommit':ref['sourceCommit'],'method':'unchanged historical strict shape grouping; not new cluster assignments','families':families})
    # Public guess files are deliberately untouched here. Clearing their legacy
    # data is a separately confirmed operation, not a side effect of review generation.
    population=sorted(set(membership)-approved)
    selected=random.Random(SEED).sample(population,200)
    newids=[p['wid'] for p in proposals if p['wid'] in new]
    byid={p['wid']:p for p in proposals};images=[]
    for label,ids in [('research-random',selected),('research-new2d',newids)]:
        for start in range(0,len(ids),20):
            path=CONTACT/f'{label}-{start//20+1:02d}.png';draw_sheet(ids[start:start+20],byid,words,path)
            images.append({'path':str(path.relative_to(ROOT)),'sha256':sha256(path),'wids':ids[start:start+20]})
    manifest={'seed':SEED,'randomPopulation':'all unapproved top100 pilot words, including withheld; this is not whole-Mushaf random inference','populationSize':len(population),'selectedRandomIds':selected,'randomWithheldCount':len(set(selected)&withheld),'new2dIds':newids,'images':images,'generatedOnly':True,'actualInspection':'separate visual_review.json records actual later views'}
    write(HERE/'contact_manifest.json',manifest)
    counts={'artworkWords':len(words),'semanticUnitRecords':len(units),'top100Words':len(membership),'families':len(families),'approvedPilotExcluded':len(approved&set(membership)),'withheld':len(withheld),'proposals':len(proposals),'new2dProposals':len(new),'historicalProposals':len(proposals)-len(new),'new2dAbstentions':len(abstained),'highWords':0,'highCorpusCoverage':0,'freshHeldoutWords':0,'randomReviewWords':len(selected)}
    write(HERE/'coverage.json',counts);print(counts)

def draw_sheet(ids,proposals,words,path):
    path.parent.mkdir(parents=True,exist_ok=True)
    sheet=Image.new('RGB',(1600,1800),'white');draw=ImageDraw.Draw(sheet)
    colors=['#D63B3B','#2266CC','#249348','#A943B2','#C78900','#159A9A','#7B542D','#666666']
    pagecache={}
    for k,wid in enumerate(ids):
        w=words[wid];p=proposals.get(wid);x=(k%2)*800;y=(k//2)*180;body=w['body']
        if w['page'] not in pagecache:pagecache[w['page']]=Image.open(ART/f"p{w['page']}.png").convert('RGB')
        left,top,right,bottom=map(int,(math.floor(body[0])-4,math.floor(body[1])-4,math.ceil(body[2])+4,math.ceil(body[3])+4))
        im=pagecache[w['page']].crop((left,top,right,bottom));scale=min(3,740/im.width,104/im.height)
        im=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS);ox=x+25;oy=y+27;sheet.paste(im,(ox,oy))
        draw.rectangle((ox+(body[0]-left)*scale,oy+(body[1]-top)*scale,ox+(body[2]-left)*scale,oy+(body[3]-top)*scale),outline='#B53030',width=1)
        label=(f"rank {p['spellingRank']:03d} {p['source']} low" if p else 'WITHHELD: absent target body; no proposed bar')
        draw.text((x+12,y+6),f"p{w['page']}  {wid}  {label}",fill='black')
        if p:
            for i,(a,b) in enumerate(supports(p)):
                c=(a+b)/2;half=.2*(b-a);bar_y=y+140+(i%2)*9;color=colors[i%len(colors)]
                draw.line((ox+(a-left)*scale,bar_y,ox+(b-left)*scale,bar_y),fill='#D9D9D9',width=2)
                draw.line((ox+(c-half-left)*scale,bar_y,ox+(c+half-left)*scale,bar_y),fill=color,width=4)
            draw.text((x+12,y+160),'RTL target offsets: '+', '.join(t.split('@')[-1] for t in p['tids'])+'  | colored = central 40%',fill='#444444')
    sheet.save(path)

def wilson_lower(success,total):
    if not total:return None
    z=1.959963984540054;p=success/total
    return (p+z*z/(2*total)-z*math.sqrt(p*(1-p)/total+z*z/(4*total*total)))/(1+z*z/total)

def metrics():
    import border_guess_all as old
    import border_shift
    words,truth,units,splits=load_development();methods={}
    methods['first-guess-reference']=[from_cuts(w,old.constrain(w['_first'],w),'first-guess-reference') for w in words.values()]
    methods['method-A-reference']=[from_cuts(w,old.constrain(border_shift.guess(w),w),'method-A-reference') for w in words.values()]
    for name,fn in [('W1-oldmadina','w1_oldmadina_predictions.json'),('W1-Amiri','w1_amiri_predictions.json'),('W2-CTC','w2_predictions.json'),('W3-geometry','w3_geometry_predictions.json'),('W3-sequence','w3_predictions.json'),('W3-synthetic-sequence','w3_synthetic-sequence_predictions.json')]:
        methods[name]=read(HERE/fn)['predictions']
    scored={name:{split:measure(pred,words,truth,splits[split]) for split in ['train65','validation30','development95']} for name,pred in methods.items()}
    write(HERE/'checkpoint_metrics.json',{'reconstructed':True,'status':'newly regenerated development measurements; historic span proxy, not independent 2-D truth','methods':scored,'coverage':read(HERE/'coverage.json')})
    agreement=[]
    for name in ['W1-oldmadina','W1-Amiri']:
        aa={p['wid']:p for p in methods[name] if p.get('bars') is not None and not validate_prediction(p,words[p['wid']])};bb={p['wid']:p for p in methods['W2-CTC'] if p.get('bars') is not None and not validate_prediction(p,words[p['wid']])}
        for ct,et in [(2,4),(1,2)]:
            combined=[]
            for wid in sorted(set(aa)&set(bb)):
                a=np.asarray(aa[wid]['bars']);b=np.asarray(bb[wid]['bars'])
                if abs(a.mean(1)-b.mean(1)).max()*SCALE>ct or abs(a-b).max()*SCALE>et:continue
                combined.append({'wid':wid,'page':words[wid]['page'],'tids':words[wid]['tids'],'bars':((a+b)/2).tolist(),'confidence':'low','method':name+'+CTC-mean-support'})
            ids={p['wid'] for p in combined};res={}
            for split in ['development95','validation30']:
                subset=[i for i in splits[split] if i in ids];m=measure(combined,words,truth,subset);ok=sum(r.get('allBarsContained',False) for r in m['rows']);m['wholeWord95WilsonLower']=wilson_lower(ok,len(subset));res[split]=m
            agreement.append({'methods':[name,'W2-CTC'],'centreToleranceDisplayPx':ct,'endpointToleranceDisplayPx':et,'selectionUsesPredictionsOnly':True,'candidate':'arithmetic mean of full support intervals','confidence':'low','results':res})
    write(HERE/'agreement.json',{'status':'development calibration only; small conditional subsets cannot certify95%; zero high predictions','agreement':agreement})
    for name,m in scored.items():print(name,m['development95']['overall']['shortBarContained'],m['validation30']['overall']['shortBarContained'])

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('stage',choices=['review','metrics','all'],nargs='?',default='all');a=p.parse_args()
    if a.stage in ('review','all'):review()
    if a.stage in ('metrics','all'):metrics()
