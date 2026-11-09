"""Export W1 masks only for unambiguous glyph ownership, not artwork truth."""
from pathlib import Path
import json,numpy as np
from common import load_development
from w1_render import render_unit_masks
ROOT=Path(__file__).resolve().parents[3];HERE=Path(__file__).resolve().parent
out=ROOT/'tmp/letter-positions/w3';out.mkdir(parents=True,exist_ok=True)
words,truth,units,splits=load_development();report={};arrays={}
for name,font in [('oldmadina',ROOT/'tmp/letter-positions/w1/oldmadinafont/fonts/oldmadina.ttf'),('amiri',ROOT/'tmp/letter-positions/w1/amiri/fonts/AmiriQuran.ttf')]:
    items=[]
    for wid in splits['development95']:
        try:
            ink,masks,diag=render_unit_masks(words[wid]['text'],units[wid]['units'],font)
            okay=not any(diag[k] for k in ['ambiguous_clusters','missing_glyph_clusters','empty_units'])
            if okay:
                ink=ink & (masks.sum(0)==1);masks=masks & ink
                arrays[name+'|'+wid+'|ink']=ink;arrays[name+'|'+wid+'|masks']=masks
            items.append(dict(wid=wid,accepted=okay,diagnostics=diag))
        except Exception as e:items.append(dict(wid=wid,accepted=False,error=str(e)))
    report[name]=dict(accepted=sum(x['accepted'] for x in items),total=len(items),items=items)
np.savez_compressed(out/'synthetic.npz',**arrays)
(HERE/'w3_synthetic_audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print({k:(v['accepted'],v['total']) for k,v in report.items()})
