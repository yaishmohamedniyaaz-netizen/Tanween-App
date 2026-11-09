"""Reconstructed shared checkpoint-1 data/metrics. Historic labels are DEVELOPMENT ONLY.
Explicit historical input allowlist prevents future heldout/batch leakage.
"""
from __future__ import annotations
import hashlib,json,os,pickle,subprocess,sys,unicodedata
from pathlib import Path
import numpy as np
HERE=Path(__file__).resolve().parent;MASKS=HERE.parent;ROOT=MASKS.parents[1]
TMP=ROOT/'tmp/letter-positions';ART=ROOT/'public/mushaf/1405-artwork-5a5f9f3846158475'
BASELINE='1166bedebe53c710607dee23647f2f479a5ed732';VISUAL_BASELINE='8d58d3ec37a89012ed641687b0ac34a4e84ffc19'
RULE='qpc-hafs-v1-targets-4.0.0';SEED=20261108;SCALE=473.6/1920
sys.path.insert(0,str(MASKS))
FROZEN_APPROVALS=('page1-approvals-2026-11-05.json','pages1-2-approvals-2026-11-05.json','all-approvals-2026-11-06.json')
def read(path):return json.loads(Path(path).read_text(encoding='utf-8'))
def write(path,value):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':'),allow_nan=False)+'\n',encoding='utf-8')
def sha256(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def numeric(wid):return tuple((0,int(s)) if s.isdecimal() else (1,s) for s in wid.split('.'))
def source_signature(paths):
    h=hashlib.sha256()
    for p in sorted(map(Path,paths)):
        h.update(str(p.relative_to(ROOT)).encode());h.update(bytes.fromhex(sha256(p)))
    return h.hexdigest()
def unit_signature():
    # Conservative invalidation of all local TS implementation dependencies.
    return source_signature([MASKS/'dump_units.mts',*sorted((ROOT/'src').rglob('*.ts')),*[ROOT/f'public/pages/p{p}.json' for p in range(1,605)]])
def load_units():
    TMP.mkdir(parents=True,exist_ok=True);path=TMP/'units.json';meta=TMP/'units-provenance.json';signature=unit_signature()
    if not path.exists() or not meta.exists() or read(meta).get('sourceSha256')!=signature:
        temp=path.with_name(f'units-{os.getpid()}.json')
        subprocess.run(['node','--experimental-strip-types',str(MASKS/'dump_units.mts'),*map(str,range(1,605)),'--out',str(temp)],check=True,capture_output=True)
        temp.replace(path)
        write(meta,{'sourceSha256':signature,'outputSha256':sha256(path)})
    if read(meta).get('outputSha256')!=sha256(path):raise ValueError('Unit cache checksum mismatch; remove cache and rebuild')
    return read(path)
def frozen_approval_docs():
    docs={}
    for name in FROZEN_APPROVALS:
        for d in read(MASKS/'approved'/name)['words']:
            if d.get('status')=='approved':docs[d['wid']]=d
    sample=read(MASKS/'approved'/FROZEN_APPROVALS[-1])['words'];original={d['wid'] for d in sample}
    pages=sorted({int(d['page']) for d in sample if int(d['page'])>2});excluded=set(pages[1::2])
    old30=sorted([wid for wid in original if int(docs[wid]['page']) in excluded],key=numeric)
    ids=sorted(original-set(old30),key=numeric)
    validation=sorted([wid for wid in ids if int(docs[wid]['page'])>2],key=numeric)
    return docs,ids,validation,old30

def load_development():
    import border_guess_all as old
    TMP.mkdir(parents=True,exist_ok=True);path=TMP/'dev-v1.pkl';meta=TMP/'dev-v1-provenance.json'
    units=load_units();docs,ids,validation,exposed=frozen_approval_docs()
    pages=sorted({int(docs[wid]['page']) for wid in ids})
    inputs=[HERE/'common.py',TMP/'units.json',*[MASKS/'approved'/n for n in FROZEN_APPROVALS],
            *sorted(MASKS.glob('*.py')),
            *[ART/f'p{p}.{ext}' for p in pages for ext in ('json','png')]]
    signature=source_signature(inputs)
    if path.exists() and meta.exists() and read(meta).get('sourceSha256')==signature:
        if read(meta).get('outputSha256')!=sha256(path):raise ValueError('Development cache checksum mismatch')
        with path.open('rb') as f:return pickle.load(f)
    words={}
    for page in sorted({int(docs[wid]['page']) for wid in ids}):
        words.update({w['wid']:w for w in old.page_words(page,units) if w['wid'] in ids})
    truth=old.truth_for(words,docs,ids)
    splits={'train65':[wid for wid in ids if words[wid]['page']<=2],'validation30':validation,'development95':ids,'old_exposed30':exposed}
    assert len(words)==95 and len(splits['train65'])==65 and len(validation)==30 and len(exposed)==30
    result=words,truth,units,splits;temp=path.with_name(f'dev-v1-{os.getpid()}.pkl')
    with temp.open('wb') as f:pickle.dump(result,f,protocol=5)
    temp.replace(path);write(meta,{'sourceSha256':signature,'outputSha256':sha256(path),'approvalAllowlist':list(FROZEN_APPROVALS)});return result

def plain(text):return ''.join(c for c in text if unicodedata.category(c).startswith('L'))
def stacked_risk(word):
    s=plain(word['text']).replace('ٱ','ا')
    return any(v in s for v in ('على','علي','لكم','لمح','بسم','لها','بما','لا','لأ','لإ','لآ'))
def from_cuts(word,cuts,method):
    x=[int(c+word['box'][0]) for c in cuts]
    return {'wid':word['wid'],'page':word['page'],'tids':word['tids'],'x':x,'bars':[[x[i+1],x[i]] for i in range(len(x)-1)],'confidence':'low','method':method}
def validate_prediction(pred,word,require_body=True):
    errors=[]
    if pred.get('wid')!=word['wid']:errors.append('word ID differs')
    if pred.get('page')!=word['page']:errors.append('page differs')
    if pred.get('tids')!=word['tids']:errors.append('target IDs differ from current app targets')
    bars=pred.get('bars')
    if bars is None and pred.get('x') is not None:
        x=pred['x']
        if isinstance(x,(list,tuple)):bars=[[x[i+1],x[i]] for i in range(len(x)-1)]
    if bars is None:return errors+['abstained']
    try:a=np.asarray(bars,dtype=float)
    except (TypeError,ValueError):return errors+['malformed bar array']
    if a.shape!=(len(word['tids']),2):return errors+['bar count or shape differs from targets']
    if not np.isfinite(a).all():errors.append('non-finite interval')
    if (a[:,1]<=a[:,0]).any():errors.append('empty or reversed interval')
    if require_body and ((a[:,0]<np.ceil(word['body'][0])).any() or (a[:,1]>np.floor(word['body'][2])).any()):errors.append('interval escapes immutable body box')
    if pred.get('x') is not None:
        try:x=np.asarray(pred['x'],dtype=float)
        except (TypeError,ValueError):errors.append('invalid cuts');return errors
        if x.shape!=(len(word['tids'])+1,) or not np.isfinite(x).all():errors.append('invalid cuts')
        elif not np.all(x[:-1]-x[1:]>=2):errors.append('cuts are not decreasing by at least 2 artwork pixels')
        elif require_body and (x[0]>np.floor(word['body'][2]) or x[-1]<np.ceil(word['body'][0])):errors.append('cuts escape immutable body box')
    return errors

def measure(predictions,words,truth,ids):
    """Historic-span proxy, NOT verified 2-D ink ownership. Abstentions stay counted."""
    predictions={p['wid']:p for p in predictions};rows=[]
    for wid in ids:
        w=words[wid];p=predictions.get(wid)
        row={'wid':wid,'page':w['page'],'stackedRisk':stacked_risk(w),'confidence':p.get('confidence','low') if p else 'missing','letters':len(w['tids'])}
        if not p or p.get('bars') is None:
            row.update(status='abstained',reason=p.get('reason','missing') if p else 'missing');rows.append(row);continue
        structure=validate_prediction(p,w)
        if structure:
            row.update(status='invalid',reason='; '.join(structure),structureErrors=structure);rows.append(row);continue
        bars=np.asarray(p['bars'],dtype=float)
        if bars.shape!=(len(w['tids']),2) or not np.isfinite(bars).all() or (bars[:,1]<=bars[:,0]).any():
            row.update(status='invalid',reason='malformed bar array');rows.append(row);continue
        t=np.asarray(truth[wid],dtype=float)+w['box'][0];lo,hi=t[1:],t[:-1]
        centres=bars.mean(1);radius=(bars[:,1]-bars[:,0])*.2
        contained=(centres-radius>=lo)&(centres+radius<=hi);inside=(centres>=lo)&(centres<=hi)
        row.update(status='scored',shortBarContained=int(contained.sum()),centreInside=int(inside.sum()),allBarsContained=bool(contained.all()),structureErrors=validate_prediction(p,w))
        x=p.get('x')
        if x is not None and len(x)==len(t):
            e=np.abs(np.asarray(x)-t)*SCALE
            row.update(innerBorderErrors=e[1:-1].tolist(),allBordersWithin2=bool((e<=2).all()),exactWord=bool((e==0).all()))
        rows.append(row)
    def summarize(rs):
        scored=[r for r in rs if r['status']=='scored'];n=sum(r['letters'] for r in scored);expected=sum(r['letters'] for r in rs)
        inner=[e for r in scored for e in r.get('innerBorderErrors',[])];br=[r for r in scored if 'innerBorderErrors' in r]
        rate=lambda a,b:a/b if b else None
        return {'requestedWords':len(rs),'scoredWords':len(scored),'abstainedOrInvalidWords':len(rs)-len(scored),'requestedLetters':expected,'scoredLetters':n,'shortBarContainedCount':sum(r['shortBarContained'] for r in scored),'shortBarContained':rate(sum(r['shortBarContained'] for r in scored),n),'shortBarContainedIncludingAbstentionsAsMisses':rate(sum(r['shortBarContained'] for r in scored),expected),'centreInside':rate(sum(r['centreInside'] for r in scored),n),'wholeWordBarsContained':rate(sum(r['allBarsContained'] for r in scored),len(scored)),'borderWords':len(br),'innerBorders':len(inner),'bordersWithin2':rate(sum(e<=2 for e in inner),len(inner)),'medianBorderErrorPx':float(np.median(inner)) if inner else None,'wholeWordBordersWithin2':rate(sum(r['allBordersWithin2'] for r in br),len(br)),'exactWords':sum(r.get('exactWord',False) for r in scored),'structurallyInvalidWords':sum(bool(r.get('structureErrors')) for r in rs)}
    return {'metricStatus':'development-only historic vertical-span proxy; no 2-D ground truth or fresh heldout yet','overall':summarize(rows),'byConfidence':{c:summarize([r for r in rows if r['confidence']==c]) for c in sorted({r['confidence'] for r in rows})},'stackedRisk':summarize([r for r in rows if r['stackedRisk']]),'nonStackedRisk':summarize([r for r in rows if not r['stackedRisk']]),'rows':rows}
if __name__=='__main__':
    words,truth,units,splits=load_development()
    write(HERE/'development_manifest.json',{'seed':SEED,'baseline':BASELINE,'ruleVersion':RULE,'sourceApprovalSha256':sha256(MASKS/'approved'/FROZEN_APPROVALS[-1]),'splits':splits,'freshHeldoutWords':0,'coordinateConvention':'artwork px for predictions; local crop px for in-memory truth','barConvention':'full support intervals; evaluate central 40 percent','stackedRiskRule':'unvocalized spelling contains on-list example or lam-alif; not per-instance ground truth','stackedRiskIds':[wid for wid in splits['development95'] if stacked_risk(words[wid])],'reconstructed':True,'approvalAllowlist':list(FROZEN_APPROVALS)})
    print(f'{len(words)} development words, {len(units)} semantic word units')
