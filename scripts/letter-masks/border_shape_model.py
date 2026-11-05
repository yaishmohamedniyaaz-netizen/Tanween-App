"""Border guess by matching letter shapes learned from approved words.

For a word with N letters and known outer ends, choose N-1 inner borders by
dynamic programming. Cost of letter i spanning columns [a, b):
  shape:  distance between the segment's ink (aligned on the word baseline,
          resampled to a fixed grid) and approved shapes of the same letter
          in the same joining form;
  width:  deviation from approved widths (relative to line height);
  joint:  ink thickness at the border column (borders sit on thin joints).
"""
import numpy as np, unicodedata as ud
S=473.624/1920
JOIN_BACK_NOT=set('ء')
JOIN_FWD_NOT=set('اأإآٱدذرزوؤةءى')   # ى treated as final-only in this text style
GW,GH=12,20          # shape grid: columns x rows
def base(t): return ''.join(c for c in t if ud.category(c)!='Mn' and c not in 'ـ‍')
def forms(letters):
    b=[base(t) or '?' for t in letters]; n=len(b); out=[]
    for i in range(n):
        r = i>0 and b[i-1][-1] not in JOIN_FWD_NOT and b[i][0] not in JOIN_BACK_NOT
        l = i<n-1 and b[i][-1] not in JOIN_FWD_NOT and b[i+1][0] not in JOIN_BACK_NOT
        out.append((b[i], ('r' if r else '')+('l' if l else '')))
    return out
def baseline(ink):
    rows=ink.sum(1); return int(np.argmax(rows))
def colfeat(w):
    """Per-column vertical profile on a fixed grid of rows around the baseline (in line-height units)."""
    ink=w['_ink'].astype(float); h,W=ink.shape; bl=baseline(w['_ink']); lh=w.get('_lh',h)
    # rows from bl-0.7*lh to bl+0.35*lh in GH bins
    edges=np.linspace(bl-0.75*lh, bl+0.4*lh, GH+1).round().astype(int)
    F=np.zeros((GH,W))
    for k in range(GH):
        a,b=max(0,edges[k]),min(h,edges[k+1])
        if b>a: F[k]=ink[a:b].mean(0)
    return F
def seg(Fc, a, b):
    """Resample columns [a,b) of a cumulative feature (GH x W+1) to GW columns."""
    xs=np.linspace(a,b,GW+1); lo=xs[:-1]; hi=xs[1:]
    def cum(x):
        i=np.floor(x).astype(int); f=x-i; i2=np.minimum(i+1,Fc.shape[1]-1)
        return Fc[:,i]*(1-f)+Fc[:,i2]*f
    return (cum(hi)-cum(lo))/np.maximum(hi-lo,1e-6)
def prep(w):
    F=colfeat(w); w['_F']=F; w['_Fc']=np.concatenate([np.zeros((GH,1)),np.cumsum(F,1)],1)
    w['_col']=w['_ink'].sum(0).astype(float)
class Model:
    def __init__(self, words, truth, ids):
        self.shapes={}; self.widths={}; self.lw={}
        for wid in ids:
            w=words[wid]; c=truth[wid]; fs=forms(w['letters']); h=w['h']
            for i,(b,f) in enumerate(fs):
                a,bb=c[i+1],c[i]
                if bb-a<1: continue
                s=seg(w['_Fc'],a,bb); r=(bb-a)/h
                for k in [(b,f),(b,'*')]:
                    self.shapes.setdefault(k,[]).append(s); self.widths.setdefault(k,[]).append(r)
                self.lw.setdefault('all',[]).append(r)
    def guess(self,w,ws=1.0,wj=0.5,wsh=1.0,step=1,wf=0.0,T=12):
        fs=forms(w['letters']); n=len(fs); h=w['h']
        xs=np.where(w['_ink'].any(0))[0]; R=int(xs.max())+1; L=int(xs.min())
        if n==1: return [R,L],0.0
        col=w['_col']/max(1.0,np.percentile(w['_col'][w['_col']>0],90))
        pos=np.arange(L,R+1,step); P=len(pos)
        # per letter: cost matrix over (right border index, left border index)
        D=np.full(P,np.inf); D[P-1]=0.0   # border 0 at R (index P-1)
        back=[]
        gmed=np.median(self.lw['all'])
        for i,(b,f) in enumerate(fs):
            key=(b,f) if (b,f) in self.shapes else ((b,'*') if (b,'*') in self.shapes else None)
            temps=np.array(self.shapes[key]) if key else None
            wmed=np.median(self.widths[key]) if key else gmed
            ND=np.full(P,np.inf); NB=np.full(P,-1)
            last=(i==n-1)
            for rj in np.where(np.isfinite(D))[0]:
                b_=pos[rj]
                lefts=[0] if last else range(0,rj)
                for lj in lefts:
                    a_=pos[lj]
                    if b_-a_<1: continue
                    wd=(b_-a_)/h
                    c=D[rj]+ws*abs(np.log(wd/wmed))
                    if temps is not None:
                        s=seg(w['_Fc'],a_,b_); c+=wsh*np.min(np.abs(temps-s).mean((1,2)))*4
                    if not last:
                        c+=wj*col[min(a_,len(col)-1)]
                        if wf: c+=wf*min(abs(a_-w['_first'][i+1]),T)/T
                    if c<ND[lj]: ND[lj]=c; NB[lj]=rj
            back.append(NB); D=ND
        # trace back from left end
        cuts=[pos[0]]; j=0
        for i in range(n-1,-1,-1):
            j=back[i][j]; cuts.append(pos[j])
        return cuts[::-1], float(D[0])
