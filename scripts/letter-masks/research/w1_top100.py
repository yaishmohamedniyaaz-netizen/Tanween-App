"""Rebuilt checkpoint demonstration: one low-confidence proposal per spelling."""
import json,time,pickle
from collections import defaultdict
from w1_registration import ROOT,HERE,CACHE,FONTS,predict
from common import load_units,read,ART
import border_guess_all as old

def run():
    start=time.time();reference=read(HERE/'reference_visual_pilot.json');withheld=set(reference['withheldIds']);approved={w['wid'] for w in read(HERE.parent/'approved/all-approvals-2026-11-06.json')['words']};excluded=withheld|approved;units=load_units();selected={}
    for spelling in reference['spellings']:
        for fam in sorted(spelling['families'],key=lambda f:(-len(f['members']),f['id'])):
            candidates=[fam['representative']]+sorted(fam['members'])
            wid=next((w for w in candidates if w not in excluded),None)
            if wid:selected[wid]={'spellingRank':spelling['rank'],'family':fam['id'],'spellingCount':spelling['count'],'familyCount':len(fam['members'])};break
    assert len(selected)==100
    pages=defaultdict(set)
    for p in range(1,605):
        for w in read(ART/f'p{p}.json')['words']:
            if w['wid'] in selected:pages[p].add(w['wid'])
    preds=[]
    for p,wids in sorted(pages.items()):
        cache=CACHE/f'page-{p}-selected.pkl'
        # Re-extract from immutable source on each run; never trust unchecked old crops.
        words={w['wid']:w for w in old.page_words(p,units) if w['wid'] in wids};pickle.dump(words,open(cache,'wb'))
        for wid in sorted(wids):
            try:rec,_=predict(words[wid],units[wid]['units'],FONTS['amiri'],'amiri')
            except Exception as e:rec={'wid':wid,'page':p,'tids':[u['tid'] for u in units[wid]['units']],'method':'w1-amiri-tvl1-2d','confidence':'low','reason':str(e)}
            rec.update(selected[wid]);preds.append(rec)
        print('page',p,'complete',len(preds),'/100',flush=True)
    output={'method':'w1-amiri-tvl1-2d','scope':'100 representative words, not 6068 families; all unapproved','predictions':sorted(preds,key=lambda p:p['spellingRank'])}
    (HERE/'w1_top100_predictions.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
    (CACHE/'top100_runtime.json').write_text(json.dumps({'seconds':time.time()-start})+'\n')
    print('DONE',len(preds),'emitted',sum('bars'in p for p in preds),'seconds',time.time()-start)
if __name__=='__main__':run()
