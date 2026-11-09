import unittest
from map_native import native_words, source_words, resolve_native_singleton, exclude_native_placeholders
from glyph_mapping import map_word

class NativeMappingTests(unittest.TestCase):
    def glyph(self,index,name,cluster,word=1,mark=False,base=-1,text='بَت'):
        return {'index':index,'name':name,'codepoint':index+100,'cluster':cluster,'word':word,'line':1,'mark':mark,'base':base,'text':text}
    def run_page(self,line,glyphs):
        return native_words({'page':1,'glyphs':glyphs},[line],{str(g['codepoint']):g['name'] for g in glyphs})
    def test_empty_placeholder_does_not_count_as_unit_ink(self):
        app={'targets':[{'tid':'x'}]}
        record={'assignments':[{'name':'space','tids':['x'],'status':'single'}],'unresolved':[]}
        r=exclude_native_placeholders(app,record)
        self.assertEqual(r['unmappedTids'],['x'])
        self.assertEqual(r['assignments'][0]['tids'],[])
    def test_empty_placeholder_keeps_actual_hamza_coverage(self):
        app={'targets':[{'tid':'x'}]}
        record={'assignments':[{'name':'space','tids':['x'],'status':'single'},{'name':'hamzaabove','tids':['x'],'status':'single'}],'unresolved':[]}
        self.assertEqual(exclude_native_placeholders(app,record)['unmappedTids'],[])
    def test_native_singleton_explicit_source_offsets(self):
        text='فَٱدَّٰرَٰءۡتُمۡ';native_text='فَٱدَّٰرَٰ͏ْٔتُمْ'
        starts=[0,2,3,7,10,12,14]
        targets=[{'tid':f'2.72.3@r{start}','start':start,'end':end,'fullGlyph':text[start:end]} for start,end in zip(starts,starts[1:]+[len(text)])]
        app={'wid':'2.72.3','line':1,'text':text,'targets':targets}
        spans=[];offset=0;index=0
        for fragment,names in [('فَ',['feh']),('ٱ',['alef']),('دَّٰ',['dal']),('رَٰ͏ْٔ',['reh.isol','fatha','smallalef.isol','hamzaabove','sukun']),('تُ',['teh']),('مْ',['meem'])]:
            spans.append({'text':fragment,'start':offset,'end':offset+len(fragment),'glyphs':[{'name':name,'index':index+i} for i,name in enumerate(names)]});offset+=len(fragment);index+=len(names)
        native={'text':native_text,'spans':spans}
        initial=map_word(app,native)
        self.assertEqual(sum(g['status']=='shared' for g in initial['assignments']),2)
        final=resolve_native_singleton(app,native,initial)
        self.assertFalse(final['unresolved'])
        resolved=[g for g in final['assignments'] if g['basis']=='native-exact-singleton-glyph-and-source-offset']
        self.assertEqual([g['nativeSourceCharacterOffset'] for g in resolved],[7,9])
        self.assertTrue(all(g['tids']==['2.72.3@r7'] for g in resolved))
    def test_singleton_not_applied_to_other_word(self):
        r={'unresolved':['shared-glyph-requires-outline-review']}
        self.assertIs(resolve_native_singleton({'wid':'other','text':'x'},{'text':'x'},r),r)
    def test_source_offset_is_from_normalized_sidecar(self):
        self.assertEqual(source_words('بِ  تَ')[1],{'text':'تَ','start':4,'end':6})
    def test_clusters_own_offsets_not_pdf_indices(self):
        g=[self.glyph(0,'beh',0),self.glyph(1,'fatha',0,mark=True,base=0),self.glyph(2,'teh',2)]
        words,_=self.run_page('بَت',g)
        self.assertEqual([(s['start'],s['end']) for s in words[0]['spans']],[(0,2),(2,3)])
        self.assertEqual(words[0]['spans'][1]['glyphs'][0]['index'],2)
    def test_shared_cluster_is_not_forced(self):
        g=[self.glyph(0,'unknown.ligature',0,text='لم')]
        words,_=self.run_page('لم',g)
        r=map_word({'wid':'test','line':1,'text':'لم','targets':[{'tid':'l','start':0,'end':1},{'tid':'m','start':1,'end':2}]},words[0])
        self.assertEqual(r['assignments'][0]['status'],'shared')
    def test_invalid_cluster_rejected(self):
        with self.assertRaises(ValueError):self.run_page('بَت',[self.glyph(0,'beh',9)])
    def test_word_text_must_match_sidecar(self):
        with self.assertRaises(ValueError):self.run_page('بَت',[self.glyph(0,'beh',0,text='different')])
    def test_mark_attachment_must_be_previous_base(self):
        with self.assertRaises(ValueError):self.run_page('بَت',[self.glyph(0,'fatha',0,mark=True,base=0)])
    def test_missing_prefix_rejected(self):
        with self.assertRaises(ValueError):self.run_page('بَت',[self.glyph(0,'teh',2)])
    def test_spaces_receive_no_word(self):
        g=[self.glyph(0,'beh',0,text='ب'),self.glyph(1,'space',1,word=0,text='ب'),self.glyph(2,'teh',2,word=2,text='ت')]
        words,excluded=self.run_page('ب ت',g)
        self.assertEqual(len(words),2);self.assertEqual(excluded['space'],1)
    def test_sidecar_name_mismatch_rejected(self):
        with self.assertRaises(ValueError):native_words({'page':1,'glyphs':[self.glyph(0,'beh',0)]},['بَت'],{'100':'teh'})
    def test_missing_body_glyph_rejected(self):
        with self.assertRaises(ValueError):self.run_page('بَت',[])

if __name__=='__main__':unittest.main()
