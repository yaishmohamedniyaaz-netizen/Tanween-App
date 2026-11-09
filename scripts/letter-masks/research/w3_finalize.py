"""Only final body-clipped, structurally validated supports are exported."""
from w3_segmentation import *
from common import stacked_risk,validate_prediction
import hashlib
words,truth,splits,vocab,data,_,_=get_data();torch.set_num_threads(2)
train=splits['train65'];val=splits['validation30'];ids=train+val;report={}
contact=ROOT/'scripts/letter-masks/contact';contact.mkdir(parents=True,exist_ok=True)
colors=np.array([[230,60,60],[60,100,230],[60,180,80],[180,70,180],[230,150,20],[30,180,180],[120,90,40],[130,130,130]],dtype=np.uint8)
for tag in ['geometry','sequence','synthetic-sequence']:
    model=TinyUNet(len(vocab)+1,'sequence' in tag);model.load_state_dict(torch.load(OUT/f'{tag}.pt',weights_only=True));model.eval()
    _,pred=score(model,ids,data,words,truth)
    for p in pred:
        p['method']='w3-'+tag
        if p['bars'] is not None:
            errors=validate_prediction(p,words[p['wid']])
            if errors:p['bars']=None;p['reason']='structural rejection: '+ '; '.join(errors)
    report[tag]={'train':measure(pred,words,truth,train),'validation':measure(pred,words,truth,val),'parameters':sum(p.numel() for p in model.parameters())}
    name='w3_predictions.json' if tag=='sequence' else f'w3_{tag}_predictions.json'
    (HERE/name).write_text(json.dumps({'predictions':pred},ensure_ascii=False,indent=2)+'\n')
    chosen=[wid for wid in ids if stacked_risk(words[wid])][:12]
    sheet=Image.new('RGB',(900,len(chosen)*145),'white');draw=ImageDraw.Draw(sheet)
    for row,wid in enumerate(chosen):
        p=infer(model,data[wid]);ink=data[wid][2]>0
        for j,label in enumerate([data[wid][1].argmax(0),p.argmax(0)]):
            rgb=np.full((H,W,3),255,dtype=np.uint8);rgb[ink]=colors[label[ink]%len(colors)]
            sheet.paste(Image.fromarray(rgb).resize((384,128),Image.Resampling.NEAREST),(j*430,row*145+17))
        draw.text((1,row*145),wid+' weak span label | predicted argmax (display only)',fill='black')
    sheet.save(contact/f'w3-{tag}-stacked-masks.png')
    if tag=='geometry':continue
    chosen=sorted(val,key=lambda wid:len(words[wid]['tids']),reverse=True)[:12];sheet=Image.new('RGB',(1000,150*len(chosen)),'white');draw=ImageDraw.Draw(sheet);byid={p['wid']:p for p in pred}
    for row,wid in enumerate(chosen):
        w=words[wid];im=Image.fromarray(np.uint8(~w['_ink'])*255).convert('RGB');scale=min(3,900/w['w'],100/w['h']);im=im.resize((int(w['w']*scale),int(w['h']*scale)));sheet.paste(im,(30,row*150+25));draw.text((30,row*150+5),wid,fill='black')
        for k,bar in enumerate(byid[wid]['bars'] or []):
            a,b=bar;c=(a+b)/2;half=.2*(b-a);draw.line((30+(c-half-w['box'][0])*scale,row*150+130,30+(c+half-w['box'][0])*scale,row*150+130),fill=tuple(colors[k%len(colors)]),width=4)
    sheet.save(contact/('w3-validation.png' if tag=='sequence' else 'w3-synthetic-validation.png'))
(HERE/'w3_shared_metrics.json').write_text(json.dumps(report,indent=2)+'\n')
files=list(OUT.glob('*.pt'))+[HERE/'w3_predictions.json',HERE/'w3_shared_metrics.json']
(HERE/'w3_hashes.json').write_text(json.dumps({str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files},indent=2)+'\n')
print({k:{s:v[s]['overall'] for s in ['train','validation']} for k,v in report.items()})
