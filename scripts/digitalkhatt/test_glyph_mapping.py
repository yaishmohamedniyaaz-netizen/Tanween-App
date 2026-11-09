import unittest
from glyph_mapping import groups, map_word

class MappingTests(unittest.TestCase):
    def word(self,text,targets,spans,wid="test"):
        start=0; out=[]
        for i,(source,names) in enumerate(spans):
            out.append({'text':source,'start':start,'end':start+len(source),'glyphs':[{'index':i*10+j,'name':n} for j,n in enumerate(names)]});start+=len(source)
        return map_word({'wid':wid,'line':1,'text':text,'targets':targets},{'text':''.join(s[0] for s in spans),'spans':out})
    def test_marks_follow_source_host(self):
        r=self.word('بَت',[{'tid':'b','start':0,'end':2},{'tid':'t','start':2,'end':3}],[('ب',['beh','dot']),('َ',['fatha']),('ت',['teh'])])
        self.assertEqual([g['tids'] for g in r['assignments']],[['b'],['b'],['b'],['t']])
    def test_shared_span_is_not_forced_to_one_target(self):
        r=self.word('لم',[{'tid':'l','start':0,'end':1},{'tid':'m','start':1,'end':2}],[('لم',['ligature'])])
        self.assertEqual(r['assignments'][0]['status'],'shared')
        self.assertEqual(r['assignments'][0]['tids'],['l','m'])
    def test_missing_glyph_stays_unmapped(self):
        r=self.word('لم',[{'tid':'l','start':0,'end':1},{'tid':'m','start':1,'end':2}],[('ل',['ligature']),('م',[])])
        self.assertEqual(r['unmappedTids'],['m'])
    def test_madd_merge_uses_exported_span(self):
        r=self.word('با',[{'tid':'b','start':0,'end':2}],[('ب',['beh']),('ا',['alef'])])
        self.assertEqual([g['tids'] for g in r['assignments']],[['b'],['b']])
    def test_long_hamza_two_source_groups_one_app_target(self):
        r=self.word('أٓ',[{'tid':'h','start':0,'end':2}],[('ـٔ',['hamza']),('ا',['alef'])])
        self.assertEqual(r['unmappedTids'],[])
        self.assertEqual([g['tids'] for g in r['assignments']],[['h'],['h']])
    def test_shared_mark_span_resolved_by_exact_identity(self):
        r=self.word('بِـٔ',[{'tid':'b','start':0,'end':2},{'tid':'h','start':2,'end':4}],[('ب',['beh']),('ِـٔ',['kasra','hamzaabove.joined'])])
        self.assertEqual([g['tids'] for g in r['assignments']],[['b'],['b'],['h']])
        self.assertEqual(r['assignments'][1]['basis'],'explicit-mark-name-and-Unicode-offset')
    def test_unknown_variant_rejected(self):
        with self.assertRaises(ValueError):
            self.word('ب',[{'tid':'b','start':0,'end':1}],[('ت',['teh'])])
    def test_exact_singleton_standalone_hamza(self):
        text='فَٱدَّٰرَٰءۡتُمۡ'
        starts=[0,2,3,7,10,12,14]
        targets=[{'tid':str(start),'start':start,'end':end} for start,end in zip(starts,starts[1:]+[len(text)])]
        r=self.word(text,targets,[('فَ',['feh']),('ٱ',['alef']),('دَّٰ',['dal']),('رَٰ',['reh']),('͏ْٔ',['hamzaabove','sukun']),('تُ',['teh']),('مْ',['meem'])],wid='2.72.3')
        self.assertEqual(r['unmappedTids'],[])
        self.assertEqual(r['assignments'][4]['tids'],['10'])
        self.assertEqual(r['assignments'][5]['tids'],['10'])
    def test_exact_singleton_keeps_added_maddah(self):
        text='لِيَسُـُٔواْ'
        targets=[{'tid':str(start),'start':start,'end':end} for start,end in [(0,2),(2,4),(4,6),(6,9),(9,12)]]
        r=self.word(text,targets,[('لِ',['lam']),('يَ',['yeh']),('سُ͏ࣳ',['seen','damma','smallhighwaw']),('ٓـٔ͏',['maddahabove','hamzaabove.joined']),('ُ',['damma']),('وا۟',['waw','alef'])],wid='17.7.11')
        self.assertEqual(r['unmappedTids'],[])
        self.assertEqual(next(g['tids'] for g in r['assignments'] if g['name']=='maddahabove'),['4'])
        self.assertEqual(next(g['tids'] for g in r['assignments'] if g['name']=='hamzaabove.joined'),['6'])
    def test_waqf_has_no_letter_target(self):
        r=self.word('بۚ',[{'tid':'b','start':0,'end':2}],[('ب',['beh']),('ۚ',['waqf.jeem'])])
        self.assertEqual(r['assignments'][1]['status'],'decorative')
        self.assertEqual(r['assignments'][1]['tids'],[])
        self.assertEqual(r['unmappedTids'],[])
    def test_cgj_and_normalization(self):
        self.assertEqual([g['key'] for g in groups('إ͏ِنّ')],['إ','ن'])
    def test_silent_target_not_absorbed(self):
        r=self.word('لنّ',[{'tid':'silent','start':0,'end':1},{'tid':'n','start':1,'end':3}],[('ل',['lam']),('ن',['noon']),('ّ',['shadda'])])
        self.assertEqual(r['assignments'][0]['tids'],['silent'])

if __name__=='__main__':unittest.main()
