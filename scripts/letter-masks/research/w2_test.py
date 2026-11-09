"""Structural tests, not visual certification. Reconstructed from retained test source."""
import numpy as np
from w2_ctc import align,lines
from common import load_development,FROZEN_APPROVALS,validate_prediction
seq=[0,1,1,0,1,0,2];lp=np.full((len(seq),3),-20.0);lp[np.arange(len(seq)),seq]=0
assert [v.tolist() for v in align(lp,[1,1,2])]==[[1,2],[4],[6]]
ls,c=lines();assert c['ayah_rows']==c['geometry_rows']==8820 and c['letter_words']==77433
words,truth,units,splits=load_development()
assert all(ord(ch)<65536 for d in ls.values() for ch in d['text'])
for wid,w in words.items():
    us=units[wid]['units'];assert [u['tid'] for u in us]==w['tids']
    for u in us:assert 0<=u['start']<u['end']<=len(w['text'])
assert sum(u['silent'] for wid in words for u in units[wid]['units'])==11
assert len(FROZEN_APPROVALS)==3 and not any('heldout' in n or 'batch' in n for n in FROZEN_APPROVALS)
assert len(splits['development95'])==95 and not set(splits['development95'])&set(splits['old_exposed30'])
print('PASS: repeated-label CTC path, corpus inventory, BMP ranges, 95 app mappings, 11 silent targets, frozen historical allowlist')
