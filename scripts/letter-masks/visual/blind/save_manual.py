"""Transcribe manual visual choices. No inferred or fallback interior cuts."""
import json
from pathlib import Path
HERE=Path(__file__).resolve().parent
# Each interior coordinate below was chosen by examining its original crop and
# ruler, after reading STYLE_GUIDE.md and the relevant rendered training examples.
manual={
 '3.19.13':([], 'high', 'One merged mim-alif target; the complete body retains one span.'),
 '3.20.10':([806,758,738], 'low', 'Detached waw tail overlaps the following ta/waw group; cuts favour the letter cores, not the low tail.'),
 '3.22.1':([862,840,802,784], 'high', 'Alif gap and lam-dhal join are clear; final nun owns its broad bowl.'),
 '4.155.11':([1257,1236,1183,1163], 'medium', 'Qaf-lam junction is the uncertain cut; the two remaining groups have clear bodies and merged final alif.'),
 '4.161.12':([818,739], 'high', 'Ayn ends at its baseline join; dhal retains its merged alif, followed by the detached ba-alif target.'),
 '4.162.20':([1344,1322,1298,1282,1227], 'low', 'Waw tails overlap the nearby alif and final mim; the ya tooth stays compact and the left waw owns its bridge.'),
 '7.56.0':([576], 'high', 'Detached waw and merged lam-alif have a visible separation between their principal bodies.'),
 '7.57.11':([297,170], 'high', 'Sin keeps its three teeth; ha-alif takes the long inserted join; the ba-alif group is detached.'),
 '7.57.8':([759,733], 'low', 'Ha, ta and final maqsura stack; the two cuts divide their perceived cores while necessarily crossing overhangs.'),
 '8.1.13':([740,694], 'high', 'Separate alif and combined lam target follow the training Allah pattern; ha retains its loop.'),
 '8.2.11':([1025,1005,962], 'high', 'Hamza target includes its madd alif; ya and ta remain compact at their teeth; ha owns the left join and small waw.'),
 '8.2.13':([631,616,567], 'high', 'Initial alif-hamza is detached; ya keeps its right tooth while mim owns the bridge; final nun-alif remains broad.'),
 '16.91.12':([835,788], 'high', 'Allah uses the app combined lam target; shaded review moved the ha cut to its shoulder rather than the middle of the lam bowl.'),
 '16.92.29':([789,780,739], 'low', 'Kaf upper stroke crosses the compact nun slot; nun and ta teeth lead left-owned bridges into the final mim.'),
 '16.92.31':([519,479,455,423,379,330], 'low', 'The initial ta-kha stack and detached waw tail both cross spans; all seven cores retain ordered usable slots.'),
 '20.78.0':([493,475,462,442,396,349], 'medium', 'Ayn-ha is the doubtful join; shaded review moved the cut slightly to retain the ayn core. Other teeth and loops are distinct.'),
 '20.83.4':([1621,1558,1506,1473], 'low', 'Waw tail overlaps sin; final sin-maqsura is compressed. Ya tooth is compact and mim owns the long join.'),
 '20.86.8':([1613,1598], 'high', 'Hamza-bearing alif is detached; lam retains its upright and the final mim owns the long horizontal bridge.'),
 '23.102.5':([865,847,812,773,736,659,620], 'low', 'Long final nun bowl is retained; waw tail overlaps it, while each preceding core and left-owned join gets a separate span.'),
 '23.97.1':([1662], 'low', 'Detached ra sweeps below ba; the division follows their core positions, matching the training rabb overlap principle.'),
 '23.97.6':([913,895,851,811,704,682], 'high', 'Silent lam keeps its upright slot; shin and ya keep their teeth; the long bridge belongs to the emphatic ta target.'),
 '35.12.21':([891,881], 'high', 'Fa loop and compact ya tooth are clear; final ha owns the long inserted bridge and its complete loop.'),
 '35.13.23':([1355,1306,1297], 'low', 'Waw tail runs below the compact nun entry; final ha keeps the long bridge, loop and attached small mark.'),
 '35.14.12':([1417,1364,1314,1270,1230], 'low', 'Kaf diagonal and detached ra/waw tails overlap neighboring positions; cuts follow core slots instead of sweeping tails.'),
 '43.35.0':([417,383,320,276], 'low', 'Several detached tails overlap, and kha joins ra; boundaries preserve the core order and the final fa-alif target.'),
 '43.37.2':([696], 'high', 'Ayn core ends at its visible join to the broad final nun; dots do not move the division.'),
 '43.46.10':([1802], 'low', 'Ra tail crosses below ba; the chosen division follows the ba entry and ra core as in the rabb training example.'),
 '76.29.8':([444,383,365], 'high', 'Sin keeps three teeth, ba owns the first long join, ya remains compact, and the final merged lam-alif takes its long bridge.'),
 '76.30.8':([675], 'high', 'Merged kaf-alif and final nun are separated by a clear gap.'),
 '77.3.1':([334,295], 'high', 'Initial nun is compact; shin owns its three small teeth and final ra-alif retains the tail and alif.'),
}
ends=json.loads((HERE/'outer-ends.json').read_text())
meta=json.loads((HERE/'word-metadata.json').read_text(encoding='utf8'))
assert len(manual)==len(meta)==30
rows=[]
for m in meta:
    wid=m['wid']; inner,confidence,note=manual[wid]
    r,l=ends[wid]['ends']; xs=[r,*inner,l]
    assert len(xs)==len(m['units'])+1,(wid,xs,m['units'])
    assert all(a-b>=2 for a,b in zip(xs,xs[1:])),(wid,xs)
    rows.append({'wid':wid,'page':m['page'],'x':xs,'confidence':confidence,
                 'source':'visual','cluster':'blind-test','note':note,
                 'originalImage':f"{m['index']:02d}_{wid}_crop.png"})
(HERE/'decisions.jsonl').write_text(''.join(json.dumps(r)+'\n' for r in rows))
print(f'Transcribed {len(rows)} manual decisions')
