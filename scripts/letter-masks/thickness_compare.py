"""Bar thickness comparison on real app screenshots: word block behind the ink, bar inside its bottom edge."""
import numpy as np
from PIL import Image, ImageDraw, ImageFont
exec(open('restructure.py').read().split("def render")[0])
BAR_DARK={'jali':(0xd8,0x6b,0x83),'khafi':(0xdd,0xa8,0x69),'fasaha':(0x73,0x8b,0xde)}
def render(theme, thick, round_ends=False, block=0.18):
    clean=np.array(Image.open(f'app/clean-{theme}.png').convert('RGB')).astype(float)
    x0,y0,x1,y1=[v*DPR for v in CROP]; base=clean[y0:y1,x0:x1]
    paper=np.array(MEAS[theme]['paper'],float); lum=base.sum(2)
    inkcol=base.reshape(-1,3)[lum.argmin() if theme=='light' else lum.argmax()]
    t=np.clip(((paper-base).mean(2))/(paper-inkcol).mean(),0,1)
    bg=np.broadcast_to(paper,base.shape).astype(float).copy()
    a=block*(1 if theme=='light' else 22/14)
    for (cat,x,y,w,h),sp in zip(MARKS,spans):
        X0,Y0,X1,Y1=[round((v-o)*DPR) for v,o in ((x,CROP[0]),(y,CROP[1]),(x+w,CROP[0]),(y+h,CROP[1]))]
        bg[Y0:Y1,X0:X1]=bg[Y0:Y1,X0:X1]*(1-a)+CC[cat]*a
        if sp is None: continue
        lx0=round((sp[0]*S+IX-CROP[0])*DPR); lx1=round((sp[1]*S+IX-CROP[0])*DPR)
        th=max(1,round(thick*DPR)); col=np.array(CC[cat] if theme=='light' else BAR_DARK[cat],float)
        for yy in range(Y1-th,Y1):
            for xx in range(lx0,lx1):
                if round_ends:
                    r=th/2; cy=Y1-th+r; cx=min(max(xx+.5,lx0+r),lx1-r)
                    if (xx+.5-cx)**2+(yy+.5-cy)**2>r*r: continue
                bg[yy,xx]=col
    out=bg*(1-t[...,None])+inkcol*t[...,None]
    return Image.fromarray(out.clip(0,255).astype(np.uint8))
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',24)
f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',20)
rows=[(1.5,False),(2,False),(2.5,False),(3,False),(4,False),(2.5,True)]
crop=(150,280,948,560)   # lines 5-7 at 2x
zoom=((1100-893)*2,(378-360)*2,(1225-893)*2,(432-360)*2)  # first line, 2 marked words
tiles=[]
for th,rd in rows:
    tiles.append([render('light',th,rd).crop(crop), render('dark',th,rd).crop(crop), render('light',th,rd).crop(zoom).resize((500,216),Image.LANCZOS)])
cw=[max(r[i].width for r in tiles) for i in range(3)]; ch=max(max(i.height for i in r) for r in tiles)
L=230; W=L+sum(cw)+3*30; H=60+len(rows)*(ch+30)
s=Image.new('RGB',(W,H),(246,245,241)); d=ImageDraw.Draw(s)
heads=['Desktop size, light','Desktop size, dark','Zoomed (line 1)']
x=L
for i,hd in enumerate(heads): d.text((x+8,18),hd,fill=(30,30,30),font=F); x+=cw[i]+30
for r,((th,rd),row) in enumerate(zip(rows,tiles)):
    y=60+r*(ch+30); d.text((20,y+ch//2-28),f'{th} px',fill=(30,30,30),font=F); d.text((20,y+ch//2+4),'round ends' if rd else 'square ends',fill=(100,100,100),font=f)
    x=L
    for i,im in enumerate(row): s.paste(im,(x,y)); x+=cw[i]+30
s.save('app/thickness.png'); print(s.size)
