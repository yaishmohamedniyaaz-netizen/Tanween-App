import unittest,tempfile,json
from pathlib import Path
from unittest.mock import patch
import numpy as np
import run_all as R
class BatchTests(unittest.TestCase):
 def result(self):
  lab=np.zeros((10,20),int);lab[2:8,12:18]=1;lab[2:8,2:8]=2
  return dict(tids=['w@r0','w@r1'],labels=lab,ink=lab>0,marks=np.zeros_like(lab,bool),dk_body_areas=[36,36],scale_area=1.,box=[100,200,120,210],fit=1.)
 def test_page_coordinates_and_pending(self):
  w,i,m=R.process(self.result(),['w@r0','w@r1']);self.assertEqual(w['bars'],[[112,118],[102,108]]);self.assertEqual(w['checks'],['fit-pending']);self.assertEqual(w['status'],'review')
 def test_rle_round_trip(self):
  mask=self.result()['ink'];out=np.zeros_like(mask)
  for y,a,b in R.runs(mask,[100,200]):out[y-200,a-100:b-100]=1
  np.testing.assert_array_equal(out,mask)
 def test_rle_one_pixel_gap(self):
  m=np.array([[1,0,1,0,0,1]],bool);self.assertEqual(R.runs(m,[0,0],1),[[0,0,3],[0,5,6]])
 def test_marks_not_body(self):
  r=self.result();r['marks'][r['labels']==1]=True;w,_,_=R.process(r,r['tids']);self.assertIn('empty-letter',w['checks'])
 def test_wrong_order(self):
  r=self.result();r['labels']=3-r['labels'];r['labels'][~r['ink']]=0;w,_,_=R.process(r,r['tids']);self.assertIn('order',w['checks'])
 def test_size(self):
  r=self.result();r['dk_body_areas'][0]=200;w,_,_=R.process(r,r['tids']);self.assertIn('size',w['checks'])
 def test_coverage(self):
  r=self.result();r['labels'][2:4,12:18]=0;w,_,_=R.process(r,r['tids']);self.assertIn('coverage',w['checks'])
 def test_atomic_complete_json(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'p.json';R.atomic(p,{'a':1});R.atomic(p,{'b':2});self.assertEqual(json.loads(p.read_text()),{'b':2})
if __name__=='__main__':unittest.main()
