import pymupdf as fitz, re, subprocess, json, base64, io, sys
from PIL import Image
import os
# Usage: DK_PDF=path/to/oldmadinafont/old_Madinah_mushaf.pdf python3 build.py 3 582
# PDF page index n (0-based) = Mushaf page n. Needs PyMuPDF, Pillow and pdftocairo (poppler).
DK=os.environ['DK_PDF']
ART=os.path.join(os.path.dirname(os.path.abspath(__file__)),'../../../public/mushaf/1405-artwork-5a5f9f3846158475/p{}.png')
OUT=os.environ.get('OUT','./out/')
os.makedirs(OUT,exist_ok=True)
doc=fitz.open(DK)
BASE={'alef','behshape','lam','meem','waw','heh','fehshape','noon','hah','dal','reh','seen','ain','kaf','hamza','sad','yehshape','tah','alefmaksura','qafshape','qaf','sheen','dad','zah','thal','zain','jeem','khah','teh','theh','ghain','feh','yeh','beh','lamalef','tehmarbuta'}
SKIP={'space','endofaya','waqf','surah_','surah','basmala','cgj'}
def fam(nm): return re.sub(r'[\d.\-_]+$','',nm.split('.')[0]) if not nm.startswith('surah_') else 'surah_'
def names_for_font(xref):
    obj=doc.xref_object(xref); m=re.search(r'/Encoding (\d+) 0 R',obj); enc=doc.xref_object(int(m.group(1)))
    diff=re.search(r'/Differences \[(.*)\]',enc,re.S).group(1).split(); t={}; code=0
    for tok in diff:
        if tok.startswith('/'): t[code]=tok[1:]; code+=1
        else: code=int(tok)
    return t
pages={}
MARKS={'fatha','kasra','damma','sukun','shadda','onedotup','onedotdown','twodotsdown','twodotsup','three_dots','wasla','hamzaabove','hamzabelow','smallalef','maddahabove','smallhighroundedzero','fathatan','fathatanidgham','dammatan','dammatanidgham','kasratan','kasratanidgham','meemiqlab','smallyeh','smallwaw','smallhighmeem','smallhighseen','smalllowseen','smallhighnoon','smalllowmeem','smallhighupright','smallhighyeh','smallhighrect','emptycenterhigh','emptycenterlow','roundedfilledhigh','smallhighwaw','threedots','waqf'}
def label(base,marks):
    f=fam(base); m=set(marks)
    if f=='alef':
        return 'أ' if 'hamzaabove' in m else 'إ' if 'hamzabelow' in m else 'ٱ' if 'wasla' in m else 'آ' if 'maddahabove' in m else 'ا'
    if f=='behshape':
        if 'hamzaabove' in m: return 'ئ'
        return 'ب' if 'onedotdown' in m else 'ت' if 'twodotsup' in m else 'ث' if ('three_dots' in m or 'threedots' in m) else 'ن' if 'onedotup' in m else 'ي' if 'twodotsdown' in m else 'ٮ'
    if f=='hah': return 'ج' if 'onedotdown' in m else 'خ' if 'onedotup' in m else 'ح'
    if f in ('dal','thal'): return 'ذ' if 'onedotup' in m else 'د'
    if f in ('reh','zain'): return 'ز' if 'onedotup' in m else 'ر'
    if f in ('seen','sheen'): return 'ش' if ('three_dots' in m or 'threedots' in m) else 'س'
    if f in ('sad','dad'): return 'ض' if 'onedotup' in m else 'ص'
    if f in ('tah','zah'): return 'ظ' if 'onedotup' in m else 'ط'
    if f in ('ain','ghain'): return 'غ' if 'onedotup' in m else 'ع'
    if f in ('fehshape','feh'): return 'ق' if 'twodotsup' in m else 'ف'
    if f in ('qafshape','qaf'): return 'ق'
    if f=='kaf': return 'ك'
    if f=='lam': return 'ل'
    if f=='meem': return 'م'
    if f=='noon': return 'ن'
    if f=='heh': return 'ة' if 'twodotsup' in m else 'ه'
    if f=='waw': return 'ؤ' if 'hamzaabove' in m else 'و'
    if f=='yehshape': return 'ئ' if 'hamzaabove' in m else 'ي' if 'twodotsdown' in m else 'ى'
    if f=='alefmaksura': return 'ى'
    if f=='hamza': return 'ء'
    return '?'
for P in [int(a) for a in sys.argv[1:]]:
    pg=doc[P]; fonts={f[3]:f[0] for f in pg.get_fonts()}; tabs={n:names_for_font(x) for n,x in fonts.items()}
    trace=[]
    for s in pg.get_texttrace():
        t=tabs.get(s['font'],{})
        for ch in s['chars']: trace.append((t.get(ch[1],'?'), round(ch[2][0],2), round(ch[2][1],2)))
    svgp=OUT+f'p{P}.svg'
    subprocess.run(['pdftocairo','-svg','-f',str(P+1),'-l',str(P+1),DK,svgp],check=True,capture_output=True)
    svg=open(svgp).read()
    uses=list(re.finditer(r'<use xlink:href="#(glyph-[\d-]+)" x="([\d.]+)" y="([\d.]+)"/>',svg))
    assert len(uses)==len(trace),(P,len(uses),len(trace))
    # group letters and words (words end at a space or an ayah marker)
    group=[]; word=[]; g=-1; w=0; unknown=set(); bases=0; letters=[]; wordHas=False; prevX=None; prevY=0
    for (nm,x,y),u in zip(trace,uses):
        assert abs(float(u.group(2))-x)<0.05 and abs(float(u.group(3))-y)<0.05,(nm,x,y,u.group(0))
        f=fam(nm)
        # A jump back to the right edge means a new line: that also ends the word.
        if wordHas and f not in ('space','endofaya') and prevX is not None and x>prevX+25 and abs(y-prevY)>6:
            w+=1; wordHas=False
        if f not in ('space','endofaya') and f not in SKIP and f in BASE: prevX=x; prevY=y
        if f in ('space','endofaya'):
            if wordHas: w+=1; wordHas=False
            group.append(None); word.append(None); continue
        if f in SKIP or nm=='?': group.append(None); word.append(None); continue
        if f in BASE:
            g+=1; bases+=1; letters.append({'w':w,'base':nm,'marks':[]}); wordHas=True
            group.append(g); word.append(w); continue
        if f not in MARKS: unknown.add(nm)
        if g>=0: letters[g]['marks'].append(f)
        group.append(g if g>=0 else None); word.append(w if g>=0 else None)
    for L in letters: L['label']=label(L['base'],L['marks']); del L['base']; del L['marks']
    i=0
    def rep(m):
        global i
        gi=group[i]; i+=1
        wi=word[i-1]
        return m.group(0)[:-2]+(f' data-l="{gi}" data-w="{wi}"/>' if gi is not None else '/>')
    i=0
    svg2=re.sub(r'<use xlink:href="#glyph-[\d-]+" x="[\d.]+" y="[\d.]+"/>',rep,svg)
    # Recolour only text glyph runs (a <g fill> wrapping <use> glyphs); leave ornaments and headers as drawn.
    svg2=re.sub(r'<g fill="rgb\([^)]*\)"( fill-opacity="[\d.]+")?>(\s*<use )',lambda m:'<g fill="currentColor"'+(m.group(1) or '')+'>'+m.group(2),svg2)
    svg2=re.sub(r'<\?xml[^>]*>\s*','',svg2)
    svg2=svg2.replace('id="glyph-',f'id="p{P}g-').replace('href="#glyph-',f'href="#p{P}g-')
    svg2=re.sub(r'(id|href)="#?(clip|image|pattern|source|mask)(-?\d+)',lambda m:f'{m.group(1)}="{"#" if m.group(0)[len(m.group(1))+2]=="#" else ""}p{P}{m.group(2)}{m.group(3)}',svg2)
    svg2=re.sub(r'width="[\d.]+" height="[\d.]+" viewBox','viewBox',svg2,count=1)
    # artwork
    im=Image.open(ART.format(P)).convert('RGBA'); bg=Image.new('RGBA',im.size,(255,255,255,0)); bg.alpha_composite(im)
    im=bg.resize((960,int(960*im.height/im.width)))
    buf=io.BytesIO(); im.save(buf,'WEBP',quality=80); art='data:image/webp;base64,'+base64.b64encode(buf.getvalue()).decode()
    pages[P]={'svg':svg2,'art':art,'letters':letters}
    print(P,'glyphs',len(uses),'letters',bases,'words',w,'labels',''.join(L['label'] for L in letters[:40]),'unknown',sorted(unknown)[:20],'svgKB',len(svg2)//1024,'artKB',len(art)//1024)
json.dump(pages,open(OUT+'pages.json','w'))
