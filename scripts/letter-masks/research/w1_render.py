"""Reconstructed from retained W1 source history. Honest glyph ownership.
Returns ink bool[H,W], masks bool[N,H,W], diagnostics. Ambiguous clusters
remain in union ink but unassigned. Shared glyph pixels require ignore labels.
"""
import numpy as np
import uharfbuzz as hb
import freetype

def render_unit_masks(text, units, font_path, px=64):
    units=[(u['start'],u['end'],u.get('tid','')) if isinstance(u,dict) else u for u in units]
    ft=freetype.Face(str(font_path));ft.set_char_size(int(px*64))
    face=hb.Face(hb.Blob.from_file_path(str(font_path)));font=hb.Font(face);hb.ot_font_set_funcs(font)
    buf=hb.Buffer();buf.add_str(text);buf.guess_segment_properties();buf.cluster_level=hb.BufferClusterLevel.CHARACTERS
    hb.shape(font,buf,{})
    infos=buf.glyph_infos;positions=buf.glyph_positions
    clusters=sorted(set(g.cluster for g in infos));ends=dict(zip(clusters,clusters[1:]+[len(text)]))
    gl=[];x=0;ambiguous=[];missing=[]
    for info,pos in zip(infos,positions):
        start=info.cluster;end=ends[start]
        owners=sorted(set(i for i,(a,b,*_) in enumerate(units) if a<end and b>start))
        ft.load_glyph(info.codepoint,freetype.FT_LOAD_RENDER|freetype.FT_LOAD_NO_HINTING)
        g=ft.glyph;bm=g.bitmap
        a=np.array(bm.buffer,dtype=np.uint8).reshape(bm.rows,abs(bm.pitch))[:,:bm.width]>100 if bm.rows else np.zeros((0,0),bool)
        gl.append((owners,a,round((x+pos.x_offset)*px/face.upem)+g.bitmap_left,-round(pos.y_offset*px/face.upem)-g.bitmap_top))
        x+=pos.x_advance
        if info.codepoint==0:missing.append(start)
        if len(owners)!=1 and a.any():ambiguous.append({'cluster':[start,end],'units':owners,'glyph':info.codepoint})
    valid=[g for g in gl if g[1].any()]
    if not valid:raise ValueError('empty rendering')
    x0=min(g[2] for g in valid);y0=min(g[3] for g in valid)
    x1=max(g[2]+g[1].shape[1] for g in valid);y1=max(g[3]+g[1].shape[0] for g in valid)
    ink=np.zeros((y1-y0,x1-x0),bool);masks=np.zeros((len(units),*ink.shape),bool)
    for owners,a,x,y in valid:
        ys=slice(y-y0,y-y0+a.shape[0]);xs=slice(x-x0,x-x0+a.shape[1]);ink[ys,xs]|=a
        if len(owners)==1:masks[owners[0],ys,xs]|=a
    return ink,masks,{'ambiguous_clusters':ambiguous,'missing_glyph_clusters':missing,'empty_units':[i for i,m in enumerate(masks) if not m.any()],'overlapping_unit_pixels':int((masks.sum(0)>1).sum()),'baseline':-y0,'cluster_level':'CHARACTERS','exact_scope':'glyph identity only; shared overlapping pixels excluded from categorical labels'}
