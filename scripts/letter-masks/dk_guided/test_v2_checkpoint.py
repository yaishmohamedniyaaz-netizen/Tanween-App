"""Guard bars-only conversion and fresh-sample isolation."""
import unittest,tempfile,json
from pathlib import Path
from unittest.mock import patch
import numpy as np
import run_v2 as R
import review_v2_checkpoint as C
import test_batch as TB

class ConversionTests(unittest.TestCase):
 def test_keeps_labels_and_replaces_only_bars(self):
  res=TB.BatchTests().result();before=res['labels'].copy();word,metrics=R.convert(res,res['tids'])
  np.testing.assert_array_equal(before,res['labels']);self.assertEqual(word['bars'],[[112,118],[102,108]])
  self.assertNotIn('order',word['checks']);self.assertEqual(len(metrics['labelSha256']),64)
 def test_geometry_failure_is_rejected_without_repair(self):
  res=TB.BatchTests().result()
  with patch.object(R,'bars_v2',return_value={'w@r0':(2,10),'w@r1':(4,8)}):
   with self.assertRaisesRegex(ValueError,'overlap'):R.convert(res,res['tids'])
  with patch.object(R,'bars_v2',return_value={'w@r0':(-1,3),'w@r1':(4,8)}):
   with self.assertRaisesRegex(ValueError,'outside'):R.convert(res,res['tids'])
 def test_missing_bar_is_still_rejected(self):
  res=TB.BatchTests().result()
  with patch.object(R,'bars_v2',return_value={'w@r0':None,'w@r1':(2,8)}):
   word,_=R.convert(res,res['tids']);self.assertIn('narrow-bar',word['checks'])

class SampleTests(unittest.TestCase):
 def test_first100_gate_rejects_89_right_and_retains_frozen_draw(self):
  sample={'fresh300':[[3,f'w{i}'] for i in range(300)]}
  rows=[dict(wid=f'w{i}',verdict='ok' if i<89 else 'wrong') for i in range(100)]
  with patch.object(C,'prepare',return_value=sample),patch.object(C,'decisions',return_value=rows):
   with self.assertRaisesRegex(AssertionError,'Early stop'):C.sheets('fresh-rest')
  self.assertEqual(sample['fresh300'][100],[3,'w100'])
 def test_frozen_sample_is_reused_without_reading_new_eligibility(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);(root/'sample.json').write_text('{"saved":true}')
   bars=root/'bars';bars.mkdir();(bars/'index.json').write_text(json.dumps(dict(method=R.METHOD,pages=list(range(1,605)))))
   with patch.object(C,'OUT',root),patch.object(C,'BARS',bars):self.assertEqual(C.prepare(),{'saved':True})
if __name__=='__main__':unittest.main()
