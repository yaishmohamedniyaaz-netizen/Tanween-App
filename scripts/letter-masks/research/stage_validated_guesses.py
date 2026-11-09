"""Stage a fail-closed research export. NEVER modifies public guess maps.
No method passed the trusted-placement gate, so all staged pages are empty.
The legacy app-facing maps remain byte-identical to the source baseline.
"""
from common import HERE,ROOT,RULE,read,write
OUT=HERE/'validated-guesses';METHOD='research-cp1-abstain'
if __name__=='__main__':
    for p in range(1,605):write(OUT/f'p{p}.json',{'page':p,'ruleVersion':RULE,'method':METHOD,'words':{}})
    write(OUT/'index.json',{'ruleVersion':RULE,'method':METHOD,'pages':[]})
    n=sum(len(read(ROOT/f'public/letter-borders-guess/p{p}.json').get('words',{})) for p in range(1,605))
    write(HERE/'export_status.json',{'stagedPath':'scripts/letter-masks/research/validated-guesses','stagedWords':0,'installed':False,'legacyPublicGuessWordsPreserved':n,'reason':'No method meets the 95% gate. Existing public guesses were explicitly preserved; staged research export was not installed.'})
    print('Staged 0 trusted words; preserved',n,'legacy public guesses')
