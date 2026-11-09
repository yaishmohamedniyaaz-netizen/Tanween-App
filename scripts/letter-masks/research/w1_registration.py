"""Faithful behavioral rebuild of W1 source history, not recovered original bytes."""
from pathlib import Path
import json,time
import numpy as np
from scipy.ndimage import gaussian_filter,map_coordinates
from skimage.registration import optical_flow_tvl1
from skimage.transform import resize
from PIL import Image,ImageDraw
from w1_render import render_unit_masks
ROOT=Path(__file__).resolve().parents[3];CACHE=ROOT/'tmp/letter-positions/w1';HERE=Path(__file__).parent
FONTS={'oldmadina':CACHE/'oldmadinafont/fonts/oldmadina.ttf','amiri':CACHE/'amiri/fonts/AmiriQuran.ttf'}

def register(ink,masks,target):
    ys,xs=np.where(target);y0,y1=ys.min(),ys.max()+1;x0,x1=xs.min(),xs.max()+1
    initial=np.zeros(target.shape,np.float32)
    initial[y0:y1,x0:x1]=resize(ink.astype(float),(y1-y0,x1-x0),order=1,anti_aliasing=True,preserve_range=True)
    imasks=[]
    for m in masks:
        a=np.zeros(target.shape,np.float32);a[y0:y1,x0:x1]=resize(m.astype(float),(y1-y0,x1-x0),order=1,anti_aliasing=True,preserve_range=True);imasks.append(a)
    v,u=optical_flow_tvl1(gaussian_filter(target.astype(np.float32),1),gaussian_filter(initial,1),attachment=12,tightness=.3,num_warp=5,num_iter=10,tol=1e-4,prefilter=True)
    yy,xx=np.indices(target.shape,dtype=np.float32);coords=np.array([yy+v,xx+u])
    warped=map_coordinates(initial,coords,order=1,mode='constant')>.5
    wm=np.array([map_coordinates(a,coords,order=1,mode='constant')>.5 for a in imasks])
    vy,vx=np.gradient(v);uy,ux=np.gradient(u);folds=((1+vy)*(1+ux)-vx*uy)<=0
    iou=lambda a:float((a&target).sum()/max(1,(a|target).sum()))
    return initial>.5,warped,wm,{'iou_affine':iou(initial>.5),'iou_2d':iou(warped),'fold_fraction':float(folds.mean()),'rms_flow_px':float(np.sqrt((u*u+v*v).mean()))}

def support(m):
    ys,xs=np.where(m)
    if len(xs)==0:return None
    low=ys>=np.quantile(ys,.6);return [int(xs[low].min()),int(xs[low].max()+1)]

def predict(w,uu,path,name):
    rec={'wid':w['wid'],'page':w['page'],'tids':[u['tid'] for u in uu],'confidence':'low','method':'w1-'+name+'-tvl1-2d'}
    target=w['_ink']&(w['_pcs'].reshape(w['h'],w['w'])>0)
    ink,masks,d=render_unit_masks(w['text'],uu,path)
    affine,warped,wm,score=register(ink,masks,target);d.update(score)
    spans=[support(m) for m in wm];reasons=[k for k in ('ambiguous_clusters','missing_glyph_clusters','empty_units') if d[k]]
    if any(b is None for b in spans):reasons.append('empty_warped_unit')
    if not reasons:
        bars=[[float(max(a+w['box'][0],np.ceil(w['body'][0]))),float(min(b+w['box'][0],np.floor(w['body'][2])))] for a,b in spans]
        if any(a>=b for a,b in bars):reasons.append('empty interval after body clipping')
        else:rec['bars']=bars
    if reasons:rec['reason']='; '.join(reasons)
    rec['diagnostics']=d
    return rec,(target,affine,warped,wm)

def run():
    from common import load_development,stacked_risk,measure
    start=time.time();words,truth,units,splits=load_development()
    if isinstance(words,list):words={w['wid']:w for w in words}
    ids=list(splits['development95']);rng=np.random.default_rng(20261108);sample=list(rng.choice(sorted(ids),size=min(50,len(ids)),replace=False));sample.sort()
    predictions={k:[] for k in FONTS};diagnostics={k:[] for k in FONTS};pictures={}
    for wid in ids:
        w=words[wid]
        for name,path in FONTS.items():
            try:
                rec,pic=predict(w,units[wid]['units'],path,name)
                diagnostics[name].append({'wid':wid,**rec['diagnostics'],'abstained':'bars' not in rec})
                if wid in sample or stacked_risk(w):pictures[(wid,name)]=pic
            except Exception as e:
                rec={'wid':wid,'page':w['page'],'tids':[u['tid'] for u in units[wid]['units']],'confidence':'low','method':'w1-'+name+'-tvl1-2d','reason':str(e)}
                diagnostics[name].append({'wid':wid,'error':str(e),'abstained':True})
            predictions[name].append(rec)
    for name,preds in predictions.items():(HERE/f'w1_{name}_predictions.json').write_text(json.dumps({'predictions':preds},ensure_ascii=False,indent=2)+'\n')
    measures={name:{s:measure(preds,words,truth,splits[s]) for s in ('train65','validation30','development95')} for name,preds in predictions.items()}
    (HERE/'w1_scores.json').write_text(json.dumps(measures,indent=2)+'\n')
    (HERE/'w1_metrics.json').write_text(json.dumps({'seed':20261108,'sample50':sample,'seconds':time.time()-start,'fonts':diagnostics},indent=2)+'\n')
    out=ROOT/'scripts/letter-masks/contact';out.mkdir(exist_ok=True)
    for page in range(5):
        sheet=Image.new('RGB',(1500,1900),'white');draw=ImageDraw.Draw(sheet)
        for row,wid in enumerate(sample[page*10:page*10+10]):
            y=row*190;draw.text((8,y+4),wid,fill='black')
            for col,name in enumerate(FONTS):
                if (wid,name) not in pictures:continue
                target,aff,warp,wm=pictures[(wid,name)]
                tiles=[np.repeat((255-a.astype(np.uint8)*255)[...,None],3,2) for a in [target,aff,warp]]
                overlay=np.full((*target.shape,3),255,np.uint8);overlay[target]=[30,30,30];overlay[warp&~target]=[220,70,70];overlay[target&~warp]=[50,110,220];tiles.append(overlay)
                for k,a in enumerate(tiles):
                    im=Image.fromarray(a);im.thumbnail((165,135));x=90+col*700+k*170;sheet.paste(im,(x,y+32));draw.text((x,y+15),name+[' artwork',' affine',' 2-D',' overlay'][k],fill='black')
        sheet.save(out/f'w1_compare50_{page+1:02}.png')
    stack=[wid for wid in ids if stacked_risk(words[wid])]
    sheet=Image.new('RGB',(1400,len(stack)*180),'white');draw=ImageDraw.Draw(sheet)
    palette=np.array([[200,50,50],[40,120,210],[30,170,70],[170,70,190],[230,150,20],[20,170,170]],np.uint8)
    for row,wid in enumerate(stack):
        y=row*180;draw.text((8,y+4),wid,fill='black')
        for col,name in enumerate(FONTS):
            if (wid,name) not in pictures:continue
            target,aff,warp,wm=pictures[(wid,name)];a=np.full((*target.shape,3),255,np.uint8);a[target]=[190,190,190]
            for i,m in enumerate(wm):a[m]=palette[i%len(palette)]
            a[wm.sum(0)>1]=[0,0,0];im=Image.fromarray(a);im.thumbnail((570,135));x=70+col*670;sheet.paste(im,(x,y+25));draw.text((x,y+8),name+' transported glyph masks (overlaps black)',fill='black')
    sheet.save(out/'w1_stacked_masks.png')
    print(json.dumps({name:{'words':len(ds),'abstained':sum(d['abstained'] for d in ds),'mean_iou_affine':np.mean([d['iou_affine'] for d in ds if 'iou_affine'in d]),'mean_iou_2d':np.mean([d['iou_2d'] for d in ds if 'iou_2d'in d])} for name,ds in diagnostics.items()},indent=2))
if __name__=='__main__':run()
