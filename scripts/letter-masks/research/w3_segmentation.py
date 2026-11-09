"""Reconstructed from retained W3 source calls; fresh results, not recovered files.
Weak vertical spans are not genuine 2-D letter truth. See W3_REPORT.md.
"""
from pathlib import Path
import json,time,random,argparse
import numpy as np
from PIL import Image,ImageDraw
import torch
from torch import nn
from torch.nn import functional as F
from common import load_development,measure
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
OUT=ROOT/'tmp/letter-positions/w3'
H,W=32,96
SEED=20261108

def resize(a):
    return np.asarray(Image.fromarray(a.astype(np.float32),mode='F').resize((W,H),Image.Resampling.NEAREST)).copy()

def prepare(w,cuts,vocab):
    ink=w['_ink'] & (np.asarray(w['_pcs']).reshape(w['h'],w['w'])>0)
    mask=resize(ink)>0.5;n=len(w['tids']);xx=np.arange(w['w'])[None,:]
    weak=np.stack([resize(ink & (xx>=cuts[k+1]) & (xx<cuts[k])) for k in range(n)])
    y,x=np.mgrid[0:H,0:W].astype(np.float32);x=x/(W-1);y=y/(H-1)
    feats=np.stack([np.stack([mask,x,y,np.full_like(x,(k+.5)/n),np.full_like(x,n/12)]) for k in range(n)]).astype(np.float32)
    ids=np.array([vocab.get(t,0) for t in w['letters']])
    return feats,weak.astype(np.float32),mask.astype(np.float32),ids

class TinyUNet(nn.Module):
    def __init__(self,nv,conditioned=False):
        super().__init__();self.conditioned=conditioned;self.emb=nn.Embedding(nv,4)
        self.a=nn.Sequential(nn.Conv2d(13 if conditioned else 5,8,3,padding=1),nn.ReLU(),nn.Conv2d(8,8,3,padding=1),nn.ReLU())
        self.b=nn.Sequential(nn.Conv2d(8,16,3,padding=1),nn.ReLU(),nn.Conv2d(16,16,3,padding=1),nn.ReLU())
        self.c=nn.Sequential(nn.Conv2d(24,8,3,padding=1),nn.ReLU(),nn.Conv2d(8,1,1))
    def forward(self,x,ids,seq):
        if self.conditioned:
            e=torch.cat([self.emb(ids),seq],1)[:,:,None,None].expand(-1,-1,H,W);x=torch.cat([x,e],1)
        a=self.a(x);b=self.b(F.avg_pool2d(a,2))
        return self.c(torch.cat([a,F.interpolate(b,size=(H,W),mode='bilinear',align_corners=False)],1))[:,0]

def batch(data,model):
    xs=[];ys=[];ms=[];ids=[];seq=[]
    for x,y,m,i in data:
        xs.append(torch.tensor(x));ys.append(torch.tensor(y));ms.append(torch.tensor(np.repeat(m[None],len(i),0)));ids.append(torch.tensor(i));seq.append(model.emb(torch.tensor(i)).mean(0).expand(len(i),-1))
    return torch.cat(xs),torch.cat(ys),torch.cat(ms),torch.cat(ids),torch.cat(seq)

def infer(model,d):
    with torch.no_grad():
        x,y,m,i,s=batch([d],model);p=model(x,i,s).sigmoid().numpy()
    return p

def score(model,ids,data,words,truth):
    loss=[];correct=total=0;pred=[];empty=0;letters=0
    for wid in ids:
        w=words[wid];d=data[wid];p=infer(model,d);y=d[1];m=d[2]>0
        correct+=int(((p.argmax(0)==y.argmax(0)) & m).sum());total+=int(m.sum());eps=1e-6
        loss.append(float((-(y*np.log(p+eps)+(1-y)*np.log(1-p+eps))*m).sum()/max(1,len(p)*m.sum())))
        bars=[]
        for pk in p:
            letters+=1;region=(pk>=.5)&m
            if not region.any():bars.append(None);empty+=1;continue
            yy,xx=np.where(region);xx=xx[yy>=np.quantile(yy,.6)]
            l=max(float(xx.min()/W*w['w']),float(np.ceil(w['body'][0])-w['box'][0]))
            r=min(float((xx.max()+1)/W*w['w']),float(np.floor(w['body'][2])-w['box'][0]))
            if r<=l:bars.append(None);empty+=1;continue
            bars.append([round(l+w['box'][0],3),round(r+w['box'][0],3)])
        reason='one or more units has no predicted ink mask within immutable body' if any(v is None for v in bars) else None
        pred.append(dict(wid=wid,page=w['page'],tids=w['tids'],bars=bars if reason is None else None,reason=reason,confidence='low',method='w3-weak-unet-sequence' if model.conditioned else 'w3-weak-unet',diagnostics=dict(abstentionReason=reason,supervision='see run labelType; no genuine artwork 2-D truth',maskThreshold=.5)))
    return dict(words=len(ids),letters=letters,emptyUnitMasks=empty,inkPixelAccuracy=correct/max(total,1),BCE=float(np.mean(loss))),pred

def get_data(synthetic=False):
    words,truth,units,splits=load_development();train=splits['train65'];val=splits['validation30'];allids=train+val
    vocab={s:i+1 for i,s in enumerate(sorted({s for wid in train for s in words[wid]['letters']}))}
    data={wid:prepare(words[wid],truth[wid],vocab) for wid in allids};fitdata=data;fittrain=train
    if synthetic:
        z=np.load(OUT/'synthetic.npz');fitdata={}
        for wid in allids:
            key=next((f+'|'+wid for f in ['oldmadina','amiri'] if f+'|'+wid+'|ink' in z),None)
            if key is None:continue
            ink=z[key+'|ink'];masks=z[key+'|masks'];w=dict(words[wid]);w['_ink']=ink;w['_pcs']=ink.ravel();w['h'],w['w']=ink.shape
            d=prepare(w,np.linspace(w['w'],0,len(w['tids'])+1),vocab)
            fitdata[wid]=(d[0],np.stack([resize(a) for a in masks]),d[2],d[3])
        fittrain=[wid for wid in train if wid in fitdata]
    return words,truth,splits,vocab,data,fitdata,fittrain

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--epochs',type=int,default=60);ap.add_argument('--synthetic',action='store_true');args=ap.parse_args()
    start=time.time();torch.set_num_threads(2);torch.use_deterministic_algorithms(True);OUT.mkdir(parents=True,exist_ok=True)
    words,truth,splits,vocab,data,fitdata,fittrain=get_data(args.synthetic);train=splits['train65'];val=splits['validation30'];results={}
    for conditional in ([True] if args.synthetic else [False,True]):
        random.seed(SEED);np.random.seed(SEED);torch.manual_seed(SEED)
        model=TinyUNet(len(vocab)+1,conditional);opt=torch.optim.Adam(model.parameters(),lr=.003);history=[]
        for epoch in range(args.epochs):
            order=np.random.default_rng(SEED+epoch).permutation(len(fittrain));losses=[];model.train()
            for j in range(0,len(order),8):
                ds=[fitdata[fittrain[z]] for z in order[j:j+8]];x,y,m,i,s=batch(ds,model)
                if epoch%2==0:
                    theta=torch.eye(2,3)[None].repeat(len(x),1,1);theta[:,0,0]=float(np.random.uniform(.9,1.1));theta[:,0,1]=float(np.random.uniform(-.08,.08))
                    grid=F.affine_grid(theta,x.size(),align_corners=False);x=F.grid_sample(x,grid,align_corners=False)
                    y=F.grid_sample(y[:,None],grid,mode='nearest',align_corners=False)[:,0];m=F.grid_sample(m[:,None],grid,mode='nearest',align_corners=False)[:,0]
                x[:,0]=(x[:,0]+torch.randn_like(x[:,0])*.025).clamp(0,1)
                raw=F.binary_cross_entropy_with_logits(model(x,i,s),y,reduction='none');weight=1+2*y
                loss=(raw*m*weight).sum()/(m*weight).sum().clamp_min(1);opt.zero_grad();loss.backward();opt.step();losses.append(float(loss.detach()))
            if epoch in [0,9,29,args.epochs-1]:
                model.eval();tr,tp=score(model,train,data,words,truth);va,vp=score(model,val,data,words,truth)
                history.append(dict(epoch=epoch+1,loss=float(np.mean(losses)),train=tr,validation=va,trainBars=measure(tp,words,truth,train),validationBars=measure(vp,words,truth,val)))
                print(conditional,epoch+1,tr,va,flush=True)
        tag=('synthetic-' if args.synthetic else '')+('sequence' if conditional else 'geometry')
        results[tag]=dict(parameters=sum(p.numel() for p in model.parameters()),history=history)
        torch.save(model.state_dict(),OUT/f'{tag}.pt')
        if args.synthetic:
            for name,ids in [('syntheticPixelTrain',fittrain),('syntheticPixelValidation',[wid for wid in val if wid in fitdata])]:
                results[tag][name]=score(model,ids,fitdata,words,truth)[0]
    results.update(seconds=round(time.time()-start,2),seed=SEED,epochs=args.epochs,trainingWords=len(fittrain),validationWords=len(val),labelType='unambiguous synthetic glyph masks' if args.synthetic else 'weak vertical-span masks',freshTest=False,reconstruction='new execution from retained source calls; not recovered original files')
    (HERE/('w3_synthetic_metrics.json' if args.synthetic else 'w3_metrics.json')).write_text(json.dumps(results,indent=2)+'\n')
if __name__=='__main__':main()
