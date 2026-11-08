"""Regression checks for review gates; no artwork or historical evidence is edited."""
import copy,json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
import workbench as w
class ReviewGateTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.final=w.read(w.HERE/'candidate-decisions.json');cls.events=w.records(w.HERE/'audit.jsonl')
 def test_final_candidate_has_exact_review_coverage(self):
  self.assertEqual(w.validate(self.final)['words'],24)
 def test_original_review_is_required_for_every_member(self):
  events=[e for e in self.events if not(e['phase']=='original' and '8.11.17' in e['words'])]
  with self.assertRaisesRegex(ValueError,'Missing original'):w.validate(self.final,events=events)
 def test_old_shaded_image_cannot_approve_changed_borders(self):
  ds=copy.deepcopy(self.final);ds['13.6.14']['x'][1]+=1
  with self.assertRaisesRegex(ValueError,'matching candidate'):w.validate(ds)
 def test_old_v2_image_cannot_approve_later_fa_refinement(self):
  events=[e for e in self.events if e['phase']!='candidate-v3']
  with self.assertRaisesRegex(ValueError,'matching candidate'):w.validate(self.final,events=events)
 def test_tampered_image_hash_is_rejected(self):
  events=copy.deepcopy(self.events);events[0]['sha256']='0'*64
  with self.assertRaisesRegex(ValueError,'Audit image changed'):w.validate(self.final,events=events)
 def test_outside_fixed_box_is_rejected(self):
  ds=copy.deepcopy(self.final);ds['13.6.14']['x'][0]=457
  with self.assertRaisesRegex(ValueError,'Outside immutable'):w.validate(ds)
 def test_empty_or_reversed_target_slot_is_rejected(self):
  ds=copy.deepcopy(self.final);ds['13.6.14']['x'][2]=ds['13.6.14']['x'][1]
  with self.assertRaisesRegex(ValueError,'Invalid target geometry'):w.validate(ds)
 def test_uncalibrated_high_confidence_is_rejected(self):
  ds=copy.deepcopy(self.final);ds['13.6.14']['confidence']='high'
  with self.assertRaisesRegex(ValueError,'Uncalibrated high'):w.validate(ds)
 def test_false_word_identity_is_rejected(self):
  ds=copy.deepcopy(self.final);ds['13.6.14']['page']=1
  with self.assertRaisesRegex(ValueError,'identity/source'):w.validate(ds)
 def test_frozen_checkpoint_change_is_rejected_without_editing_it(self):
  original=w.sha
  def fake_sha(path):return '0'*64 if Path(path)==w.VIS/'blind/decisions.jsonl' else original(path)
  with patch.object(w,'sha',side_effect=fake_sha):
   with self.assertRaisesRegex(ValueError,'Checkpoint A changed'):w.validate(self.final)
if __name__=='__main__':unittest.main()
