"""Font-guided borders: render the word in the Hafs font (letter borders known
from shaping), then align its column profile to the artwork word with dynamic
time warping (the 1405 artwork stretches letters differently), and carry the
font's borders across. Needs no approved data."""
import os, tempfile, numpy as np, uharfbuzz as hb, freetype, unicodedata as ud
from fontTools.ttLib import TTFont
_ttf = os.path.join(tempfile.gettempdir(), 'tanween-hafs18.ttf')
tt = TTFont(os.path.join(os.path.dirname(__file__), '../../public/fonts/hafs.18.woff2')); tt.flavor = None; tt.save(_ttf)
names = tt.getGlyphOrder(); gcls = tt['GDEF'].table.GlyphClassDef.classDefs
face = hb.Face(hb.Blob.from_file_path(_ttf)); font = hb.Font(face); upem = face.upem
ft = freetype.Face(_ttf)
def render(text, units, px):
    ft.set_char_size(int(px*64))
    buf=hb.Buffer(); buf.add_str(text); buf.guess_segment_properties(); buf.cluster_level=hb.BufferClusterLevel.CHARACTERS
    hb.shape(font,buf,{})
    unit_of=lambda ci: next(k for k,(a,b,_) in enumerate(units) if a<=ci<b)
    gl=[]; x=0
    for info,pos in zip(buf.glyph_infos,buf.glyph_positions):
        mark = gcls.get(names[info.codepoint])==3 or ud.category(text[info.cluster])=='Mn'
        ft.load_glyph(info.codepoint, freetype.FT_LOAD_RENDER|freetype.FT_LOAD_NO_HINTING); g=ft.glyph; bm=g.bitmap
        a=np.array(bm.buffer,np.uint8).reshape(bm.rows,bm.width) if bm.rows else np.zeros((0,0),np.uint8)
        gl.append(dict(u=unit_of(info.cluster),mark=mark,a=a>100,x=round((x+pos.x_offset)*px/upem)+g.bitmap_left,y=-round(pos.y_offset*px/upem)-g.bitmap_top,
                       ox=x*px/upem, adv=pos.x_advance*px/upem))
        x+=pos.x_advance
    bases=[g for g in gl if not g['mark'] and g['a'].size]
    x0=min(g['x'] for g in bases); x1=max(g['x']+g['a'].shape[1] for g in bases)
    y0=min(g['y'] for g in bases); y1=max(g['y']+g['a'].shape[0] for g in bases)
    img=np.zeros((y1-y0,x1-x0),bool); own=np.full(x1-x0,-1)
    for g in bases:
        h,w=g['a'].shape; img[g['y']-y0:g['y']-y0+h, g['x']-x0:g['x']-x0+w]|=g['a']
    # unit extents from pen positions (glyph advance boxes), in image columns
    n=len(units); lo=[1e9]*n; hi=[-1e9]*n
    for g in gl:
        if g['mark'] or g['adv']<=0: continue
        lo[g['u']]=min(lo[g['u']],g['ox']-x0); hi[g['u']]=max(hi[g['u']],g['ox']+g['adv']-x0)
    # borders right->left: c[0]=right end, c[i]= left edge of unit i-1 ... use unit extents
    cuts=[img.shape[1]]
    for i in range(n-1):
        b = lo[i] if lo[i]<1e8 else (hi[i+1] if hi[i+1]>-1e8 else None)
        cuts.append(b)
    cuts.append(0)
    # units with no glyph of their own (ligatures): spread evenly between known borders
    i=0
    while i<len(cuts):
        if cuts[i] is not None: i+=1; continue
        j=i
        while cuts[j] is None: j+=1
        a,b=cuts[i-1],cuts[j]
        for k in range(i,j): cuts[k]=a+(b-a)*(k-i+1)/(j-i+1)
        i=j
    return img, -y0, cuts   # baseline row = -y0
def prof(ink, bl, lh, bins=16):
    h,W=ink.shape; edges=np.linspace(bl-0.75*lh, bl+0.35*lh, bins+1).round().astype(int); F=np.zeros((bins,W))
    for k in range(bins):
        a,b=max(0,edges[k]),min(h,edges[k+1])
        if b>a: F[k]=ink[a:b].mean(0)
    return F
def dtw(A,B,band=None):
    n,m=A.shape[1],B.shape[1]
    C=np.abs(A[:,:,None]-B[:,None,:]).sum(0)   # n x m
    D=np.full((n+1,m+1),np.inf); D[0,0]=0
    for i in range(1,n+1):
        Di=D[i]; Dp=D[i-1]; Ci=C[i-1]
        for j in range(1,m+1):
            Di[j]=Ci[j-1]+min(Dp[j-1],Dp[j],Di[j-1])
    # backtrack
    i,j=n,m; path=[]
    while i>0 and j>0:
        path.append((i-1,j-1)); k=np.argmin([D[i-1,j-1],D[i-1,j],D[i,j-1]])
        if k==0: i-=1;j-=1
        elif k==1: i-=1
        else: j-=1
    return path[::-1]
def guess(w, units, scale_try=(0.9,1.0,1.1)):
    ink=w['_ink']; pcs=w['_pcs'].reshape(w['h'],w['w']); sk=np.isin(pcs,w['skeleton'])&ink
    cols=np.where(ink.any(0))[0]; R=int(cols.max())+1; L=int(cols.min())
    rows=sk.sum(1); bl=int(np.argmax(rows))
    lh=w['h']
    art=sk[:,L:R]
    # font size: match base-ink height
    ys=np.where(sk.any(1))[0]; art_h=ys.max()-ys.min()+1
    best=None
    for f in scale_try:
        img,fbl,fc=render(w['text'],units,64)
        fh=img.shape[0]; px=64*art_h/fh*f
        img,fbl,fc=render(w['text'],units,px)
        A=prof(art.astype(float),bl,lh); B=prof(img.astype(float),fbl,lh)
        # both read right-to-left: flip so index 0 is the right end
        A=A[:,::-1]; B=B[:,::-1]; Wf=img.shape[1]
        p=dtw(A,B)
        cost=sum(np.abs(A[:,i]-B[:,j]).sum() for i,j in p)/len(p)
        if best is None or cost<best[0]: best=(cost,p,fc,Wf)
    cost,p,fc,Wf=best
    # map font column (from right) -> mean artwork column (from right)
    mp={}
    for i,j in p: mp.setdefault(j,[]).append(i)
    def map_col(fx):   # fx = font column from left
        j=int(round(Wf-fx)); j=min(max(j,0),Wf-1)
        while j not in mp: j-=1
        return R-np.mean(mp[j])
    cuts=[R]+[int(round(map_col(c))) for c in fc[1:-1]]+[L]
    for k in range(1,len(cuts)):
        if cuts[k]>cuts[k-1]-1: cuts[k]=cuts[k-1]-1
    return cuts,cost
