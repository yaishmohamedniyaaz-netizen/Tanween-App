import unittest
from recheck import checks
class CheckPolicyTests(unittest.TestCase):
 def setUp(self):
  self.policy={'disabled':['size','empty-letter']};self.w={'originalChecks':['size','empty-letter','order','fit-pending']};self.m=dict(bodyAreas=[0,100],centres=[None,2],areaRatios=[None,100])
 def test_undefined_body_centre_does_not_mean_swapped_order(self):
  self.assertEqual(checks(self.w,self.m,self.policy),[])
 def test_actual_reversed_centres_remain_rejected(self):
  self.m['centres']=[1,5];self.assertEqual(checks(self.w,self.m,self.policy),['order'])
 def test_missing_bar_guard_survives_relaxed_body_mask_gate(self):
  self.w['originalChecks'].append('narrow-bar');self.assertEqual(checks(self.w,self.m,self.policy),['narrow-bar'])
 def test_error_and_coverage_survive_policy_change(self):
  self.w['originalChecks']=['error: failed','coverage'];self.m={'error':'failed'};self.assertEqual(checks(self.w,self.m,self.policy),['error: failed','coverage'])
if __name__=='__main__':unittest.main()
