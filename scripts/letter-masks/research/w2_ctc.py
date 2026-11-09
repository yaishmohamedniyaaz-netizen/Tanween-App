#!/usr/bin/env python3
"""Faithful reconstruction of retained W2 code; newly generated evidence, not recovered files.
Genuine raw-Unicode line CRNN/CTC. No approval geometry enters model training.
"""
import argparse,json,sys,time,random,unicodedata,hashlib
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
import torch
from torch import nn
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
sys.path.insert(0,str(HERE.parent))
ART=ROOT/'public/mushaf/1405-artwork-5a5f9f3846158475';CACHE=ROOT/'tmp/letter-positions/w2';SEED=20261108

def lines():
    out={};counts={'pages':0,'all_rows':0,'ayah_rows':0,'letter_words':0,'geometry_rows':0}
    for p in range(1,605):
        page=json.loads((ROOT/f'public/pages/p{p}.json').read_text());geo=json.loads((ART/f'p{p}.json').read_text())
        gg={w['wid']:w for w in geo['words']};counts['pages']+=1;counts['all_rows']+=len(page['lines']);counts['geometry_rows']+=len({w['line'] for w in geo['words']})
        for l in page['lines']:
            if l['type']!='ayah':continue
            ww=[w for w in l.get('words',[]) if w['wid'] in gg]
            if not ww:continue
            counts['ayah_rows']+=1;counts['letter_words']+=sum(w['role']=='letter' for w in ww)
            box=[min(gg[w['wid']]['body'][0] for w in ww),min(gg[w['wid']]['band'][1] for w in ww),max(gg[w['wid']]['body'][2] for w in ww),max(gg[w['wid']]['band'][3] for w in ww)]
            text='';offsets={}
            for w in ww:
                if text:text+=' '
                offsets[w['wid']]=len(text);text+=w['text']
            out[p,l['n']]={'page':p,'line':l['n'],'words':ww,'text':text,'offsets':offsets,'box':box}
    return out,counts

def image_line(d):
    im=Image.open(ART/f"p{d['page']}.png").convert('L').crop(tuple(map(round,d['box'])))
    width=max(64,round(im.width*48/im.height));im=im.resize((width,48),Image.Resampling.BILINEAR)
    a=np.asarray(im,dtype=np.float32)[:,::-1].copy()/255
    return torch.tensor(1-a)[None]

class Model(nn.Module):
    def __init__(self,n):
        super().__init__();self.cnn=nn.Sequential(nn.Conv2d(1,16,3,padding=1),nn.ReLU(),nn.MaxPool2d(2),nn.Conv2d(16,32,3,padding=1),nn.ReLU(),nn.MaxPool2d((2,1)),nn.Conv2d(32,48,3,padding=1),nn.ReLU(),nn.AdaptiveAvgPool2d((3,None)))
        self.rnn=nn.GRU(144,64,bidirectional=True,batch_first=True);self.out=nn.Linear(128,n)
    def forward(self,x):
        z=self.cnn(x);z=z.permute(0,3,1,2).flatten(2);z,_=self.rnn(z);return self.out(z).log_softmax(-1).transpose(0,1)

def cer(a,b):
    row=list(range(len(b)+1))
    for i,c in enumerate(a):
        nxt=[i+1]
        for j,d in enumerate(b):nxt.append(min(nxt[-1]+1,row[j+1]+1,row[j]+(c!=d)))
        row=nxt
    return row[-1]

def align(lp,ids):
    states=np.zeros(2*len(ids)+1,dtype=int);states[1::2]=ids
    S=len(states);prev=np.full(S,-1e30);prev[0]=lp[0,0]
    if S>1:prev[1]=lp[0,states[1]]
    back=np.zeros((len(lp),S),np.int8)
    skip=(np.arange(S)>1)&(states!=0)&(states!=np.roll(states,2))
    for t in range(1,len(lp)):
        choices=np.stack((prev,np.r_[-1e30,prev[:-1]],np.r_[-1e30,-1e30,prev[:-2]]));choices[2,~skip]=-1e30
        k=choices.argmax(0);back[t]=k;prev=choices[k,np.arange(S)]+lp[t,states]
    s=S-1 if prev[-1]>=prev[-2] else S-2
    if prev[s]<-1e20:raise ValueError('infeasible path')
    path=[]
    for t in range(len(lp)-1,-1,-1):path.append(s);s-=int(back[t,s])
    path=np.array(path[::-1]);return [np.flatnonzero(path==2*i+1) for i in range(len(ids))]

def state_hash(model):
    h=hashlib.sha256()
    for name,tensor in model.state_dict().items():
        h.update(name.encode());h.update(tensor.detach().cpu().contiguous().numpy().tobytes())
    return h.hexdigest()

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--epochs',type=int,default=180);ap.add_argument('--reuse',action='store_true');ap.add_argument('--run',choices=['primary','duplicate'],default='primary');args=ap.parse_args()
    cache=CACHE/args.run;cache.mkdir(parents=True,exist_ok=True)
    torch.set_num_threads(2);torch.manual_seed(SEED);np.random.seed(SEED);random.seed(SEED);torch.use_deterministic_algorithms(True)
    from common import load_development,measure,stacked_risk
    words,truth,units,splits=load_development();all_lines,counts=lines()
    development=set(splits['development95']);selected=[d for d in all_lines.values() if any(w['wid'] in development for w in d['words'])]
    val=[d for (p,n),d in all_lines.items() if p==3][:6]
    assert not ({(d['page'],d['line']) for d in selected}&{(d['page'],d['line']) for d in val})
    unseen=set(''.join(d['text'] for d in val))-set(''.join(d['text'] for d in selected))
    chars=sorted(set(''.join(d['text'] for d in selected+val)));vocab={c:i+1 for i,c in enumerate(chars)}
    for d in selected+val:d['image']=image_line(d);d['ids']=[vocab[c] for c in d['text']]
    model=Model(len(vocab)+1);opt=torch.optim.Adam(model.parameters(),lr=.002);lossfn=nn.CTCLoss(blank=0,zero_infinity=False)
    start=time.monotonic();history=[]
    def evaluate(ds):
        model.eval();errors=total=exact=0
        with torch.no_grad():
            for d in ds:
                ids=model(d['image'][None])[:,0].argmax(-1).tolist();last=None;got=[]
                for k in ids:
                    if k!=last and k:got.append(chars[k-1])
                    last=k
                got=''.join(got);errors+=cer(got,d['text']);total+=len(d['text']);exact+=got==d['text']
        return {'cer':errors/total,'edit_errors':errors,'characters':total,'exact_lines':exact,'lines':len(ds)}
    if args.reuse:
        model.load_state_dict(torch.load(cache/'model.pt',weights_only=True));history=json.loads((cache/'training.json').read_text())['history']
    else:
        for epoch in range(args.epochs):
            model.train();losses=[];order=np.random.permutation(len(selected))
            for ii in order:
                d=selected[ii];opt.zero_grad();lp=model(d['image'][None]);loss=lossfn(lp,torch.tensor(d['ids']),[len(lp)],[len(d['ids'])]);loss.backward();nn.utils.clip_grad_norm_(model.parameters(),5);opt.step();losses.append(float(loss.detach()))
            if epoch==0 or (epoch+1)%10==0 or epoch+1==args.epochs:
                row={'epoch':epoch+1,'loss':float(np.mean(losses)),'elapsed_s':time.monotonic()-start,'train':evaluate(selected),'validation':evaluate(val)};history.append(row);print(json.dumps(row),flush=True)
                torch.save(model.state_dict(),cache/'model.pt');(cache/'training.json').write_text(json.dumps({'history':history},indent=2))
    predictions=[];lookup={w['wid']:d for d in selected for w in d['words']};alignments={};model.eval()
    with torch.no_grad():
        for d in selected:
            lp=model(d['image'][None])[:,0].numpy();alignments[d['page'],d['line']]=(align(lp,d['ids']),lp)
    for wid in sorted(development):
        w=words[wid];entry={'wid':wid,'page':w['page'],'tids':w['tids'],'confidence':'low','method':'w2-raw-unicode-crnn-ctc-v1'}
        if wid not in lookup:entry['abstention_reason']='No selected line';predictions.append(entry);continue
        d=lookup[wid];paths,lp=alignments[d['page'],d['line']];centers=[];diagnostics=[];off=d['offsets'][wid]
        for u in units[wid]['units']:
            indices=[i for i in range(u['start'],u['end']) if i<len(w['text']) and not unicodedata.combining(w['text'][i]) and w['text'][i]!='ـ']
            if not indices:indices=list(range(u['start'],u['end']))
            frames=np.concatenate([paths[off+i] for i in indices])
            if not len(frames):break
            xx=d['box'][2]-(float(frames.mean())+.5)/len(lp)*(d['box'][2]-d['box'][0]);centers.append(xx)
            diagnostics.append({'unit_range':[u['start'],u['end']],'silent':u['silent'],'base_char_indices':indices,'center':xx,'frames':len(frames)})
        if len(centers)!=len(w['tids']):entry['abstention_reason']='Missing aligned character frames'
        else:
            boundaries=[float(w['body'][2])]+[(a+b)/2 for a,b in zip(centers,centers[1:])]+[float(w['body'][0])]
            if any(a<=b for a,b in zip(boundaries,boundaries[1:])):entry['abstention_reason']='Alignment escaped word or violated unit order'
            else:
                entry['bars']=[[round(boundaries[i+1],3),round(boundaries[i],3)] for i in range(len(centers))]
                entry['x']=[round(v,3) for v in boundaries]
        entry['diagnostics']=diagnostics
        if 'abstention_reason' in entry:entry['reason']=entry['abstention_reason']
        predictions.append(entry)
    serialized=json.dumps({'predictions':predictions},ensure_ascii=False,indent=2)+'\n'
    (cache/'predictions.json').write_text(serialized)
    if args.run=='primary':(HERE/'w2_predictions.json').write_text(serialized)
    report={'counts':counts,'seed':SEED,'torch':torch.__version__,'training_lines':len(selected),'validation_lines':len(val),'training_words':sum(len(d['words']) for d in selected),'vocabulary':len(vocab),'validation_unseen_classes':sorted(unseen),'validation_unseen_occurrences':sum(c in unseen for d in val for c in d['text']),'parameters':sum(p.numel() for p in model.parameters()),'history':history,'train':evaluate(selected),'validation':evaluate(val),'aligned_words':sum('bars' in p for p in predictions),'abstained_words':sum('bars' not in p for p in predictions),'line_ids_train':[[d['page'],d['line']] for d in selected],'line_ids_validation':[[d['page'],d['line']] for d in val]}
    report['metrics']={k:measure(predictions,words,truth,splits[k]) for k in ['train65','validation30','development95']}
    report['raw_peak_centres']={}
    for split in ['train65','validation30','development95']:
        correct=total=0
        for pred in predictions:
            if pred['wid'] not in splits[split]:continue
            w=words[pred['wid']];t=np.asarray(truth[pred['wid']])+w['box'][0]
            for k,diag in enumerate(pred.get('diagnostics',[])):
                total+=1;correct+=int(t[k+1]<=diag['center']<=t[k])
        report['raw_peak_centres'][split]={'inside':correct,'total':total,'rate':correct/total if total else None}
    report.update(reconstructed=True,run=args.run,model_tensor_sha256=state_hash(model),prediction_sha256=hashlib.sha256(serialized.encode()).hexdigest(),python=sys.version)
    (cache/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    if args.run=='primary':(HERE/'w2_results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:report[k] for k in ['run','train','validation','prediction_sha256','model_tensor_sha256']}),flush=True)
    if args.run!='primary':return
    for name,chosen in [('contact/w2_ctc_development.png',predictions[:24]),('contact/w2_ctc_stacked.png',[p for p in predictions if stacked_risk(words[p['wid']])])]:
        canvas=Image.new('RGB',(1000,len(chosen)*115),'white');draw=ImageDraw.Draw(canvas)
        for j,p in enumerate(chosen):
            w=words[p['wid']];im=Image.fromarray(np.uint8(255*(1-w['_ink']))).convert('RGB');scale=min(2,750/im.width,78/im.height);im=im.resize((int(im.width*scale),int(im.height*scale)))
            y=j*115;canvas.paste(im,(200,y+5));draw.text((8,y+10),p['wid'],fill='black');draw.text((8,y+28),'CTC train line',fill='black')
            for a,b in p.get('bars',[]):
                a=(a-w['box'][0])*scale+200;b=(b-w['box'][0])*scale+200;m=(a+b)/2;draw.line((a,y+90,b,y+90),fill='#f4d5ae',width=2);draw.line((m-(b-a)*.2,y+90,m+(b-a)*.2,y+90),fill='#bb5500',width=4)
            tr=truth[p['wid']]
            for a,b in zip(tr,tr[1:]):
                draw.line((200+b*scale,y+99,200+a*scale,y+99),fill='#008866',width=2)
                draw.line((200+b*scale,y+95,200+b*scale,y+103),fill='#008866',width=1)
                draw.line((200+a*scale,y+95,200+a*scale,y+103),fill='#008866',width=1)
        canvas.save(HERE.parent/name)
if __name__=='__main__':main()
