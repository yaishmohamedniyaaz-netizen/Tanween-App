"""Same candidates, but every tint sits behind the ink: ink pixels keep their own colour."""
import numpy as np
from PIL import Image, ImageDraw
exec(open('restructure.py').read().split("def render")[0])
def render(theme, opt, col_k=3.4):
    clean=np.array(Image.open(f'app/clean-{theme}.png').convert('RGB')).astype(float)
    x0,y0,x1,y1=[v*DPR for v in CROP]; base=clean[y0:y1,x0:x1]
    paper=np.array(MEAS[theme]['paper'],float)
    lum=base.sum(2); inkcol=base.reshape(-1,3)[lum.argmin() if theme=='light' else lum.argmax()]
    t=np.clip(((paper-base).mean(2))/(paper-inkcol).mean(),0,1)          # ink coverage per pixel
    bg=np.broadcast_to(paper,base.shape).astype(float).copy()            # paper layer we tint
    aw=ALPHA[theme]*(1.3 if theme=='light' else 1.0)
    for (cat,x,y,w,h),sp in zip(MARKS,spans):
        X0,Y0,X1,Y1=[round((v-o)*DPR) for v,o in ((x,CROP[0]),(y,CROP[1]),(x+w,CROP[0]),(y+h,CROP[1]))]
        bg[Y0:Y1,X0:X1]=bg[Y0:Y1,X0:X1]*(1-aw)+CC[cat]*aw
        if sp is None: continue
        lx0=round((sp[0]*S+IX-CROP[0])*DPR); lx1=round((sp[1]*S+IX-CROP[0])*DPR)
        if opt in ('column','both'):
            a=min(.85,ALPHA[theme]*col_k) if theme=='light' else 0.42; bg[Y0:Y1,lx0:lx1]=bg[Y0:Y1,lx0:lx1]*(1-a)+CC[cat]*a
        if opt in ('bar','both'):
            tt=round(2.5*DPR); bg[Y1-tt:Y1,lx0:lx1]=CC[cat]
    out=bg*(1-t[...,None])+inkcol*t[...,None]                            # ink drawn on top, untouched
    return Image.fromarray(out.clip(0,255).astype(np.uint8))
from PIL import ImageFont
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',26)
names=[('word','1  Word block only'),('column','2  Word block + letter column'),('bar','2b Word block + letter bar'),('both','3  Column + bar')]
for theme in ['light','dark']:
    tiles=[(n,render(theme,o).crop((150,40,948,560))) for o,n in names]
    W,Hh=tiles[0][1].size; bgc=(255,255,255) if theme=='light' else (33,31,28)
    sheet=Image.new('RGB',(W*2+30,(Hh+50)*2+10),bgc); dr=ImageDraw.Draw(sheet)
    for i,(n,im) in enumerate(tiles):
        X=(i%2)*(W+30); Y=(i//2)*(Hh+50); dr.text((X+10,Y+10),n,fill=(30,30,30) if theme=='light' else (235,235,230),font=font); sheet.paste(im,(X,Y+46))
    sheet.save(f'app/behind-{theme}.png')
box=((1100-893)*2,(378-360)*2,(1225-893)*2,(432-360)*2)
rows=[]
for theme in ['light','dark']:
    tiles=[(n,render(theme,o).crop(box).resize((500,216),Image.LANCZOS)) for o,n in names]
    rows.append(tiles)
W,Hh=500,216; sheet=Image.new('RGB',(W*4+90,(Hh+50)*2),'white'); dr=ImageDraw.Draw(sheet)
for r,tiles in enumerate(rows):
    for i,(n,im) in enumerate(tiles): dr.text((i*(W+30)+10,r*(Hh+50)+8),n,fill=(30,30,30),font=font); sheet.paste(im,(i*(W+30),r*(Hh+50)+46))
sheet.save('app/behind-zoom.png')
