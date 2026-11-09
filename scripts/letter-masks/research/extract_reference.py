"""Extract the immutable historical visual pilot. No model/annotation is rerun.
This is a newly generated projection of the saved visual commit, not recovery
of the lost research file. Never merge or checkout the visual branch.
"""
from pathlib import Path
import hashlib,json,subprocess
HERE=Path(__file__).resolve().parent; ROOT=HERE.parents[2]
SOURCE='8d58d3ec37a89012ed641687b0ac34a4e84ffc19'
BASE='scripts/letter-masks/visual/'
def raw(name):
    return subprocess.check_output(['git','show',SOURCE+':'+BASE+name],cwd=ROOT)
def main():
    try:graw=raw('groups.json')
    except subprocess.CalledProcessError:
        subprocess.run(['git','fetch','--depth','1','origin',SOURCE],cwd=ROOT,check=True)
        graw=raw('groups.json')
    draw=raw('decisions.jsonl');g=json.loads(graw)
    spellings=[];pilot=set()
    for text,s in sorted(g['spellings'].items(),key=lambda kv:kv[1]['rank']):
        if s['rank']>100:continue
        families=[]
        for c in s['clusters']:
            members=c['memberIds'];pilot.update(members)
            families.append({'id':c['id'],'representative':c['representative']['wid'],'members':members})
        spellings.append({'text':text,'rank':s['rank'],'count':s['count'],'families':families})
    decisions={}
    for line in draw.splitlines():
        d=json.loads(line)
        if d['wid'] in pilot:
            assert d['wid'] not in decisions
            decisions[d['wid']]={'x':d['x'],'historicalConfidence':d['confidence'],'reviewFlags':d.get('reviewFlags',[])}
    withheld=sorted(pilot-set(decisions))
    assert len(spellings)==100 and len(pilot)==22648 and len(decisions)==22616 and len(withheld)==32
    assert sum(len(s['families']) for s in spellings)==6068
    out={'schemaVersion':1,'sourceCommit':SOURCE,'provenance':'historical visual pilot; source confidence calibration failed; not new 2-D inference or approvals','sourceSha256':{'groups.json':hashlib.sha256(graw).hexdigest(),'decisions.jsonl':hashlib.sha256(draw).hexdigest()},'withheldIds':withheld,'spellings':spellings,'decisions':decisions}
    path=HERE/'reference_visual_pilot.json';path.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'),sort_keys=True)+'\n')
    print('Historical projection',path.stat().st_size,'bytes;',len(pilot),'pilot words;',len(withheld),'withheld')
if __name__=='__main__':main()
