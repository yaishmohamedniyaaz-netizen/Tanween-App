"""Render highlight options on top of real app screenshots (desktop, DPR 2) and at artwork zoom."""
import json, base64, io, numpy as np
from PIL import Image
exec(open('compare.py').read().split("def render")[0])   # letter_ink, letter_area, cat_map, cats (artwork px)
S=473.624/1920; IX,IY=893.188,306.758; DPR=2
MEAS={'light':{'paper':[251,250,247],'khafi':[245,234,220],'jali':[244,219,223],'fasaha':[222,226,242]},
      'dark':{'paper':[33,31,28],'khafi':[72,55,34],'jali':[69,32,38],'fasaha':[37,45,69]}}
INKC={'light':{'jali':(0xca,0x24,0x4d),'khafi':(0xc0,0x78,0x22),'fasaha':(0x33,0x58,0xd4)},
      'dark':{'jali':(0xe2,0x6f,0x89),'khafi':(0xe6,0xb0,0x6e),'fasaha':(0x7d,0x95,0xe8)}}
MARKS=[("khafi",1170.8,389.4,41.8,35.0),("jali",1119.9,389.4,33.8,35.0),("jali",1147.6,544.1,68.3,45.5),
       ("fasaha",1076.0,544.1,42.1,45.5),("khafi",994.6,544.1,48.1,45.5),("jali",1190.2,589.6,40.4,39.4)]
OPTS=[('A','Now: whole-word block',dict(word=1,area=0,ink=False)),
      ('F','Word block + stronger letter block',dict(word=1,area=3.5,ink=False)),
      ('E','Light word block + stronger letter block',dict(word=.5,area=3.5,ink=False)),
      ('B','Stronger letter block only',dict(word=0,area=3.5,ink=False)),
      ('G','Letter block only, same strength as today',dict(word=0,area=1,ink=False)),
      ('D','Word block + letter ink colour',dict(word=1,area=0,ink=True))]
CROP=(893,360,1367,650)   # CSS px on screen
def tintcol(theme,cat,k):
    p=np.array(MEAS[theme]['paper'],float); m=np.array(MEAS[theme][cat],float); return np.clip(p+(m-p)*k,0,255)
def to_png(a):
    buf=io.BytesIO(); Image.fromarray(a.astype(np.uint8)).save(buf,'PNG',optimize=True); return base64.b64encode(buf.getvalue()).decode()
CC={'jali':np.array([0xca,0x24,0x4d],float),'khafi':np.array([0xd5,0x8e,0x3a],float),'fasaha':np.array([0x33,0x58,0xd4],float)}
ALPHA={'light':0.14,'dark':0.22}   # app: color-mix(--c 14% / 22%) laid over ink and paper alike
def compose(base, paper, inkcol, wordcov, areacov, inkcov, opt, theme):
    out=base.astype(float).copy()
    if opt['ink']:
        den=(paper-inkcol).mean(); den=den if abs(den)>1e-3 else 1e-3
        t=np.clip(((paper-base).mean(2))/den,0,1)[...,None]
        for cat in cats:
            a=(inkcov[cat][...,None]*t); out=out*(1-a)+INKC[theme][cat]*a if False else out*(1-a)+np.array(INKC[theme][cat],float)*a
    for cat in cats:
        if opt['word']: a=np.clip(wordcov[cat]*ALPHA[theme]*opt['word'],0,.9)[...,None]; out=out*(1-a)+CC[cat]*a
        if opt['area']: a=np.clip(areacov[cat]*ALPHA[theme]*opt['area'],0,.9)[...,None]; out=out*(1-a)+CC[cat]*a
    return out
def catmask(mask,cat): return mask&(cat_map==cats.index(cat)+1)
out={'desktop':{},'zoom':{}}
for theme in ['light','dark']:
    clean=np.array(Image.open(f'app/clean-{theme}.png').convert('RGB')).astype(float)
    x0,y0,x1,y1=[v*DPR for v in CROP]; base=clean[y0:y1,x0:x1]
    paper=np.array(MEAS[theme]['paper'],float)
    lum=base.sum(2); inkcol=base[lum.argmin()//base.shape[1], lum.argmin()%base.shape[1]] if theme=='light' else base[lum.argmax()//base.shape[1], lum.argmax()%base.shape[1]]
    H,W=base.shape[:2]
    # artwork -> screen crop transform
    sc=S*DPR; ox=(IX-CROP[0])*DPR; oy=(IY-CROP[1])*DPR
    def to_screen(mask):
        im=Image.fromarray((mask*255).astype(np.uint8))
        big=im.resize((round(mask.shape[1]*sc),round(mask.shape[0]*sc)),Image.BOX)
        canvas=Image.new('L',(W,H),0); canvas.paste(big,(round(ox),round(oy))); return np.array(canvas)/255.
    wordcov={c:np.zeros((H,W)) for c in cats}
    for cat,x,y,w,h in MARKS:
        X0,Y0,X1,Y1=[round((v-o)*DPR) for v,o in ((x,CROP[0]),(y,CROP[1]),(x+w,CROP[0]),(y+h,CROP[1]))]
        wordcov[cat][Y0:Y1,X0:X1]=1
    areacov={c:to_screen(catmask(letter_area,c)) for c in cats}
    inkcov={c:np.clip(to_screen(catmask(letter_ink,c))*1.6,0,1) for c in cats}
    for oid,_,opt in OPTS:
        out['desktop'][f'{oid}-{theme}']=to_png(compose(base,paper,inkcol,wordcov,areacov,inkcov,opt,theme))
    # zoom: artwork resolution, same colours, word block from artwork word boxes
    Z0,Z1,Z2,Z3=380,300,1560,1110
    g=page[Z1:Z3,Z0:Z2]
    zpaper=paper; zink=np.array([0x1c,0x1b,0x16] if theme=='light' else [0xea,0xe7,0xde],float)
    zbase=zpaper+(zink-zpaper)*((255-g)/255.)[...,None]
    zw={c:np.zeros(g.shape) for c in cats}
    for b,cat in word_boxes:
        bx0,by0,bx1,by1=[int(v) for v in b]; zw[cat][max(0,by0-20-Z1):by1+20-Z1, max(0,bx0-Z0):bx1-Z0]=1
    za={c:catmask(letter_area,c)[Z1:Z3,Z0:Z2].astype(float) for c in cats}
    zi={c:catmask(letter_ink,c)[Z1:Z3,Z0:Z2].astype(float) for c in cats}
    for oid,_,opt in OPTS:
        out['zoom'][f'{oid}-{theme}']=to_png(compose(zbase,zpaper,zink,zw,za,zi,opt,theme))
out['opts']=[(o,n) for o,n,_ in OPTS]
json.dump(out,open('real-data.json','w')); print(round(len(open('real-data.json').read())/1e6,2),'MB')
for k in ['A-light','F-light','E-light','B-light']:
    Image.open(io.BytesIO(base64.b64decode(out['desktop'][k]))).save(f'app/out-{k}.png')
