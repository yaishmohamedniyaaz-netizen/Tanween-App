"""Regression: invalid predictions must never contribute successful geometry scores."""
import copy
from common import measure,validate_prediction
w={'wid':'1.1.0','page':1,'tids':['a','b'],'body':[0,0,100,40],'box':[0,0,100,40],'text':'بسم'}
p={'wid':w['wid'],'page':1,'tids':w['tids'],'bars':[[50,100],[0,50]],'x':[100,50,0],'confidence':'low'}
words={w['wid']:w};truth={w['wid']:[100,50,0]};ids=[w['wid']]
assert measure([p],words,truth,ids)['overall']['shortBarContained']==1
for field,value in [('tids',['wrong','b']),('page',2),('bars',[[50,101],[0,50]]),('bars',[[50,100],[0,float('nan')]]),('bars',[[50,50],[0,50]]),('x',[100,99,0])]:
    bad=copy.deepcopy(p);bad[field]=value
    out=measure([bad],words,truth,ids)['overall']
    assert out['scoredWords']==0 and out['requestedWords']==1 and out['requestedLetters']==2 and out['shortBarContainedIncludingAbstentionsAsMisses']==0,(field,out)
bad=copy.deepcopy(p);bad['wid']='different';assert 'word ID differs' in validate_prediction(bad,w)
print('PASS: wrong IDs/page, escaped/nonfinite/empty bars and invalid cuts rejected before scoring; denominators retained')
