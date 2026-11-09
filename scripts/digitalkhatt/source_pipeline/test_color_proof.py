import copy
from pathlib import Path
import tempfile
import unittest
from color_proof import align_page, decode, svg_word, ROOT
from safety import atomic_write, output_directory

class ColourProofTests(unittest.TestCase):
    def setUp(self):
        self.source={'page':1,'glyphs':[dict(index=10,line=2,cluster=3,codepoint=123,name='beh',final=[4,5],shaped=[4,5,20,0])]}
        self.binary=[dict(line=2,cluster=3,codepoint=123,name='beh',box=[0,0,10,10],offsets=[4,5],advance=20)]
    def test_nontransferred_indices(self):
        self.assertEqual(list(align_page(self.source,self.binary)),[10])
    def test_spaces_not_index_transferred(self):
        self.source['glyphs'].insert(0,dict(index=0,name='space'))
        self.binary.insert(0,dict(name='space',box=None))
        self.assertEqual(list(align_page(self.source,self.binary)),[10])
    def test_code_mismatch_rejected(self):
        self.binary[0]['codepoint']=124
        with self.assertRaises(ValueError):align_page(self.source,self.binary)
    def test_cluster_mismatch_rejected(self):
        self.binary[0]['cluster']=4
        with self.assertRaises(ValueError):align_page(self.source,self.binary)
    def test_position_mismatch_rejected(self):
        self.binary[0]['offsets']=[4,6]
        with self.assertRaises(ValueError):align_page(self.source,self.binary)
    def test_missing_occurrence_rejected(self):
        with self.assertRaises(ValueError):align_page(self.source,[])
    def test_duplicate_indices_rejected(self):
        self.source['glyphs']*=2;self.binary*=2
        with self.assertRaises(ValueError):align_page(self.source,self.binary)
    def test_invalid_binary_rejected(self):
        with self.assertRaises(ValueError):decode(b'bad',{})
    def test_repository_output_rejected(self):
        with self.assertRaises(ValueError):output_directory(ROOT/'colour-proof-test')
    def test_symlink_output_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/'link';p.symlink_to(Path(tmp)/'target')
            with self.assertRaises(ValueError):atomic_write(p,b'x')
    def test_whole_glyph_colouring_and_unowned_black(self):
        g=dict(vid=1,box=[0,0,10,10],x=0,y=10,sx=1,sy=-1,selected=True)
        r=dict(page=1,wid='1.1.1',tid='1.1.1@r0',text='ب',selectedSourceGlyphIndices=[10],geometry=[g,dict(g,selected=False)])
        svg=svg_word(r,{1:dict(path='M0 0L10 0L10 10Z')},0,0,420,230)
        self.assertEqual(svg.count('fill="#ca244d"'),1)
        self.assertEqual(svg.count('fill="#161616"'),1)
        self.assertIn('source indices: [10]',svg)
        self.assertNotIn('clipPath',svg)

if __name__=='__main__':unittest.main()
