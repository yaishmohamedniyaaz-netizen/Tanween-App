"""Render highlight style options on page 1 from approved letter maps.

Usage: python3 compare_styles.py <folder of saved review JSON files>
"""
import json, glob, numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage
D='/home/claude/tw-main/public/mushaf/1405-artwork-5a5f9f3846158475'
SCALE=2*496/1920          # retina desktop page
MARGIN=1.5/(496/1920)     # 1.5 screen px in artwork px
PAD=8
C={'jali':(0xca,0x24,0x4d),'khafi':(0xd5,0x8e,0x3a),'fasaha':(0x33,0x58,0xd4)}
STRONG={'jali':(0x9a,0x21,0x3d),'khafi':(0x8f,0x62,0x2c),'fasaha':(0x2d,0x47,0x9e)}
MISTAKES={'1.1.0':(2,'khafi'),'1.1.2':(4,'jali'),'1.6.2':(6,'jali'),'1.7.0':(1,'fasaha'),'1.7.2':(3,'khafi'),'1.7.3':(4,'jali')}
def unrle(s,n):
    a=list(map(int,s.split(','))); out=np.zeros(n,np.uint8); i=0
    for k in range(0,len(a),2): out[i:i+a[k+1]]=a[k]; i+=a[k+1]
    return out
page=np.array(Image.open(f'{D}/p1.png').convert('L')).astype(float)
geo={w['wid']:w for w in json.load(open(f'{D}/p1.json'))['words']}
reviews={json.load(open(f))['wid']:json.load(open(f)) for f in glob.glob(__import__('sys').argv[1] + '/*.json')}
H,W=page.shape
# per-pixel letter ownership for the marked letters (artwork coords)
letter_ink=np.zeros((H,W),bool); letter_area=np.zeros((H,W),bool); cat_map=np.zeros((H,W),np.uint8)
word_boxes=[]
cats=list(C)
for wid,(L,cat) in MISTAKES.items():
    r=reviews[wid]; x0,y0,x1,y1=r['box']; lab=unrle(r['labels'],r['w']*r['h']).reshape(r['h'],r['w'])
    ink=page[y0:y1,x0:x1]<250                      # include soft edge pixels
    hard=lab>0
    # every ink pixel (soft edges too) belongs to its nearest labelled pixel
    dist,(iy,ix)=ndimage.distance_transform_edt(~hard,return_indices=True)
    owner=lab[iy,ix]
    li=ink&(owner==L)&(dist<=2)
    # margin: blank pixels nearer to this letter than to any other ink, within MARGIN
    anyink=page[y0:y1,x0:x1]<128
    d_all,(ay,ax)=ndimage.distance_transform_edt(~anyink,return_indices=True)
    own_all=np.where(lab[ay,ax]>0,lab[ay,ax],255)
    area=((own_all==L)&(d_all<=MARGIN))|li
    letter_ink[y0:y1,x0:x1]|=li; letter_area[y0:y1,x0:x1]|=area; cat_map[y0:y1,x0:x1][area|li]=cats.index(cat)+1
    b=geo[wid]['body']; word_boxes.append((b,cat))
def render(opt):
    rgb=np.ones((H,W,3))*255
    def tint(mask,col,a):
        for c in range(3): rgb[...,c][mask]=255-(255-col[c])*a
    if opt in ('A','D','E'):
        a=0.14 if opt=='A' else 0.07
        for b,cat in word_boxes:
            x0,y0,x1,y1=[int(v) for v in b]; m=np.zeros((H,W),bool); m[y0-10:y1+10,x0:x1]=True
            tint(m,C[cat],a)
    if opt in ('B','E'):
        for i,cat in enumerate(cats,1): tint(letter_area&(cat_map==i),C[cat],0.26)
    k=page/255
    out=rgb*k[...,None]                            # ink multiplied on top
    if opt in ('C','D'):
        for i,cat in enumerate(cats,1):
            m=letter_ink&(cat_map==i); dark=(255-page)/255
            for c in range(3): out[...,c][m]=(255*(1-dark)+STRONG[cat][c]*dark)[m]*(rgb[...,c][m]/255)
    return Image.fromarray(out.clip(0,255).astype(np.uint8))
ys=[geo[w]['body'][1] for w in MISTAKES]+[geo[w]['body'][3] for w in MISTAKES]
crop=(380,int(min(ys))-60,1560,int(max(ys))+50)
names={'A':'A  Now: whole-word block','B':'B  Letter block (letter shape + 1.5 px margin)','C':'C  Letter ink in criteria colour','D':'D  Letter ink colour + light word block','E':'E  Letter block + light word block'}
tiles=[]
for o in 'ABCDE':
    im=render(o).crop(crop); im=im.resize((int(im.width*SCALE),int(im.height*SCALE)),Image.LANCZOS)
    im.save(f'opt_{o}.png'); tiles.append((o,im))
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',18) if __import__('os').path.exists('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf') else ImageFont.load_default()
Wt=tiles[0][1].width; Ht=sum(t.height+40 for _,t in tiles)
sheet=Image.new('RGB',(Wt,Ht),(255,255,255)); dr=ImageDraw.Draw(sheet); y=0
for o,t in tiles:
    dr.text((10,y+10),names[o],fill=(30,30,30),font=font); sheet.paste(t,(0,y+38)); y+=t.height+40
sheet.save('highlight-options.png'); print(sheet.size)
