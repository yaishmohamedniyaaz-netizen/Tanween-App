"""Independent corpus/export integrity checks; no new approval inference."""
from common import *
from integrate import corpus
import random,subprocess

def main():
    words,units=corpus();ref=read(HERE/'reference_visual_pilot.json');r=read(MASKS/'review/proposals-001.json');new=read(MASKS/'review/proposals-001-new2d.json')['words'];families=read(MASKS/'review/families-001.json')['families']
    membership={}
    for f in families:
        assert len(f['members'])==len(set(f['members'])) and f['representative'] in f['members']
        for wid in f['members']:
            assert wid not in membership and wid in words
            assert words[wid]['text']==f['spelling'];membership[wid]=(f['id'],f['spellingRank'])
    approved=set(frozen_approval_docs()[0]);withheld=set(ref['withheldIds']);ids=[p['wid'] for p in r['words']]
    assert len(ids)==len(set(ids))==22577 and set(ids)==set(membership)-approved-withheld
    for p in r['words']:
        assert (p['family'],p['spellingRank'])==membership[p['wid']]
        assert p['confidence']=='low';assert not validate_prediction(p,words[p['wid']]),p['wid']
    assert len(new)==100 and len({p['spellingRank'] for p in new})==100
    assert all(p in r['words'] and p['source']=='new-2d-representative' for p in new)
    assert sum(p['source']=='historical-reference' for p in r['words'])==22477
    assert len(families)==6068 and len(membership)==22648 and len(withheld)==32
    # Fresh dump from actual application code, independent of cached dump.
    tmp=TMP/'units-independent-verification.json'
    subprocess.run(['node','--experimental-strip-types',str(MASKS/'dump_units.mts'),*map(str,range(1,605)),'--out',str(tmp)],check=True,capture_output=True)
    assert read(tmp)==units
    contact=read(HERE/'contact_manifest.json');population=sorted(set(membership)-approved)
    assert contact['selectedRandomIds']==random.Random(SEED).sample(population,200)
    for im in contact['images']:assert sha256(ROOT/im['path'])==im['sha256']
    for page in range(1,605):assert not read(HERE/f'validated-guesses/p{page}.json')['words']
    assert read(HERE/'validated-guesses/index.json')['pages']==[]
    # Baseline is an ancestor even in a shallow clone: fetch it if necessary.
    if subprocess.run(['git','cat-file','-e',BASELINE+'^{commit}'],cwd=ROOT,capture_output=True).returncode:
        subprocess.run(['git','fetch','--depth','1','origin',BASELINE],cwd=ROOT,check=True,capture_output=True)
    protected=['src/','public/mushaf/','public/pages/','public/letter-borders/','public/letter-borders-guess/','scripts/letter-masks/approved/']
    subprocess.run(['git','diff','--exit-code',BASELINE,'--',*protected],cwd=ROOT,check=True,capture_output=True)
    view=HERE/'visual_review.json';viewed=0
    if view.exists():
        for im in read(view)['images']:assert im['actuallyOpened'] and sha256(ROOT/im['path'])==im['sha256'];viewed+=1
    report={'status':'passed','reconstructed':True,'artworkWords':len(words),'semanticUnitRecords':len(units),'proposals':len(ids),'targets':sum(len(p['tids']) for p in r['words']),'families':len(families),'new2d':len(new),'historical':len(ids)-len(new),'approvedPilotExcluded':len(set(membership)&approved),'withheld':len(withheld),'contactImagesChecked':len(contact['images']),'rootActualViewsChecked':viewed,'freshHeldoutWords':0,'stagedTrustedWords':0,'publicGuessFilesPreserved':True,'protectedPathsChanged':0,'independentCurrentAppDumpEqual':True}
    write(HERE/'validation.json',report);print(report)
if __name__=='__main__':main()
