"""Algorithm and input-contract regressions; never score the held-out labels."""
import unittest
import numpy as np
from border_guess_all import dtw, constrain, approval_docs, confidence, SCALE


class BorderGuesses(unittest.TestCase):
    def test_vector_dtw_matches_reference(self):
        rng=np.random.default_rng(71)
        for n,m in [(1,1),(4,7),(9,3),(20,23)]:
            a=rng.random((4,n)); b=rng.random((4,m))
            c=np.abs(a[:,:,None]-b[:,None,:]).sum(0)
            d=np.full((n+1,m+1),np.inf); d[0,0]=0
            for i in range(1,n+1):
                for j in range(1,m+1): d[i,j]=c[i-1,j-1]+min(d[i-1,j-1],d[i-1,j],d[i,j-1])
            path,cost=dtw(a,b)
            self.assertAlmostEqual(sum(c[i,j] for i,j in path),d[n,m])
            self.assertAlmostEqual(cost,np.mean([c[i,j] for i,j in path]))
            self.assertEqual(path[0],(n-1,m-1)); self.assertEqual(path[-1],(0,0))

    def test_projection_keeps_endpoints_and_minimum_width(self):
        w=dict(tids=['a','b','c'],_ends=[20,4],wid='example')
        for c in [[99,0,-99,-3],[20,19,18,4],[20,12,8,4]]:
            p=constrain(c,w)
            self.assertEqual((p[0],p[-1]),(20,4))
            self.assertTrue(all(a-b>=2 for a,b in zip(p,p[1:])))
        w['_ends']=[8,4]
        with self.assertRaises(ValueError): constrain([8,7,6,4],w)

    def test_fixed_page_split_and_training_exclusion(self):
        docs,training,dev,test,_=approval_docs()
        self.assertEqual(len(dev),30); self.assertEqual(len(test),30)
        self.assertFalse(set(test)&set(training))
        self.assertFalse({docs[x]['page'] for x in dev}&{docs[x]['page'] for x in test})

    def test_high_requires_copy_and_agreement(self):
        w=dict(tids=['a','b'],_ends=[40,4],_first=[40,20,4],wid='example')
        self.assertEqual(confidence(w,dict(source='copy',cuts=[40,20,4])),'high')
        self.assertEqual(confidence(w,dict(source='copy',cuts=[40,30,4])),'medium')
        self.assertEqual(confidence(w,dict(source='joint',cuts=[40,20,4])),'low')


if __name__=='__main__': unittest.main()
