"""Protect the accuracy sample from redraws and evidence overwrite on resume."""
import json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from PIL import Image
import check_sheet as C
class ResumeTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name);self.here=self.root/'visual';self.here.mkdir();(self.here/'rand48.json').write_text(json.dumps([[3,'w3']]));self.bars=self.root/'bars';self.bars.mkdir()
  (self.bars/'index.json').write_text(json.dumps({'pages':list(range(1,605))}))
  for p in range(1,605):(self.bars/f'p{p}.json').write_text(json.dumps({'words':{f'w{p}':{'status':'ok'}}}))
  self.patches=[patch.object(C,'HERE',self.here),patch.object(C,'BARS',self.bars),patch.object(C.G,'REPO',self.root),patch.object(C,'tile',lambda p,wid:Image.new('RGB',(8,8),(p%255,10,20)))]
  for item in self.patches:item.start()
 def tearDown(self):
  for item in reversed(self.patches):item.stop()
  self.tmp.cleanup()
 def test_review_progress_cannot_redraw_frozen_sample(self):
  C.main();sample=(self.here/'review/sample.json').read_bytes();first=json.loads(sample)['random-ok'][0][1]
  (self.here/'review/decisions.jsonl').write_text(json.dumps({'wid':first})+'\n');C.main()
  self.assertEqual((self.here/'review/sample.json').read_bytes(),sample)
  eligible=json.loads((self.here/'review/eligible-status-ok.json').read_text())
  self.assertTrue(all(page>2 and wid!='w3' for page,wid in eligible))
 def test_partial_sheet_run_reuses_identical_images(self):
  C.main();path=self.here/'review/random-ok-001.png';before=path.stat().st_mtime_ns
  (self.here/'review/manifest.json').unlink();C.main()
  self.assertEqual(path.stat().st_mtime_ns,before)
 def test_existing_evidence_tampering_is_rejected(self):
  C.main();path=self.here/'review/random-ok-001.png';path.write_bytes(b'tampered')
  with self.assertRaises(AssertionError):C.main()
  self.assertEqual(path.read_bytes(),b'tampered')
if __name__=='__main__':unittest.main()
