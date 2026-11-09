"""Fresh reconstruction artifact regressions; no future approval loader."""
import json,unittest
from pathlib import Path
from common import load_development,validate_prediction
class SegmentationArtifacts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.words,cls.truth,cls.units,cls.splits=load_development();cls.here=Path(__file__).resolve().parent
    def test_predictions_are_exact_units_and_in_body(self):
        for filename in ['w3_predictions.json','w3_geometry_predictions.json','w3_synthetic-sequence_predictions.json']:
            rows=json.loads((self.here/filename).read_text())['predictions'];self.assertEqual(len(rows),95);self.assertEqual({p['wid'] for p in rows},set(self.splits['development95']))
            for p in rows:
                self.assertEqual(p['confidence'],'low')
                if p['bars'] is None:self.assertTrue(p['reason'])
                else:self.assertEqual(validate_prediction(p,self.words[p['wid']]),[])
    def test_no_exposed30_or_train_validation_overlap(self):
        self.assertFalse(set(self.splits['train65']) & set(self.splits['validation30']))
        self.assertFalse(set(self.splits['development95']) & set(self.splits['old_exposed30']))
    def test_synthetic_rejections_are_explicit(self):
        for result in json.loads((self.here/'w3_synthetic_audit.json').read_text()).values():
            for row in result['items']:
                if row['accepted']:self.assertFalse(any(row['diagnostics'][k] for k in ['ambiguous_clusters','missing_glyph_clusters','empty_units']))
    def test_no_false_pseudo_supervision(self):
        audit=json.loads((self.here/'w3_pseudolabel_audit.json').read_text());self.assertEqual(audit['trainedPseudoWords'],0)
    def test_no_intermediate_prediction_exports(self):
        self.assertFalse((self.here/'w3_synthetic_predictions.json').exists());self.assertFalse((self.here/'w3_sequence_predictions.json').exists())
if __name__=='__main__':unittest.main()
