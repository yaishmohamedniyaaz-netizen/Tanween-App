import unittest
import numpy as np
from w1_registration import FONTS,register
from w1_render import render_unit_masks
class RendererTests(unittest.TestCase):
    def test_repeatable_masks_and_union(self):
        for path in FONTS.values():
            args=('بسم',[(0,1,'a'),(1,2,'b'),(2,3,'c')],path)
            a,m,d=render_unit_masks(*args);b,n,e=render_unit_masks(*args)
            self.assertTrue(np.array_equal(a,b));self.assertTrue(np.array_equal(m,n));self.assertEqual(d,e)
            self.assertEqual(len(m),3);self.assertFalse(d['ambiguous_clusters']);self.assertTrue(np.array_equal(a,m.any(0)))
    def test_unassigned_interval_is_not_invented(self):
        a,m,d=render_unit_masks('بسم',[(0,1,'a'),(2,3,'c')],FONTS['amiri'])
        self.assertTrue(d['ambiguous_clusters']);self.assertTrue((a&~m.any(0)).any())
    def test_missing_font_character_is_recorded(self):
        _,_,d=render_unit_masks('\U0001f600',[(0,1,'a')],FONTS['amiri']);self.assertTrue(d['missing_glyph_clusters'])
    def test_identical_registration(self):
        a,m,d=render_unit_masks('بسم',[(0,1,'a'),(1,2,'b'),(2,3,'c')],FONTS['amiri'])
        ys,xs=np.where(a);crop=(slice(ys.min(),ys.max()+1),slice(xs.min(),xs.max()+1));a=a[crop];m=m[(slice(None),*crop)]
        _,w,wm,score=register(a,m,a)
        self.assertGreater(score['iou_2d'],.99);self.assertEqual(wm.shape,m.shape)
if __name__=='__main__':unittest.main()
