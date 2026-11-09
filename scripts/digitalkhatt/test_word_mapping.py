#!/usr/bin/env python3
import copy
import json
from pathlib import Path
import unittest

from parity import skeleton
from word_mapping import (classify, pair_page, checked_box, exception_fingerprint,
                          EXCEPTIONS_SHA256, EXPECTED_CLASSES, validate_corpus)


def fixture():
    app={'words':[{'wid':'1.1.1','line':1,'role':'letter','text':'ب'}]}
    source={'frame':[256,410],'words':[{'line':1,'text':'ب','skeleton':'ب','box':[10,10,20,20]}]}
    return source,app


class ClassificationTests(unittest.TestCase):
    def test_five_classes(self):
        cases=[('ٱلۡأٓخِرِ','ٱلْـٔ͏َاخِرِ','2.8.5','long_initial_hamza'),
               ('ٱمۡرِيٕٖ','ٱمْرِي͏ٔ͏ࣲ','52.21.15','below_yeh_hamza'),
               ('ٱللُّؤۡلُوِٕ','ٱللُّو͏ٔ͏ْلُو͏ٔ͏ِ','x','below_waw_hamza'),
               ('فَٱدَّٰرَٰءۡتُمۡ','فَٱدَّٰرَٰ͏ْٔتُمْ','2.72.3','standalone_combining_hamza'),
               ('لِيَسُـُٔواْ','لِيَسُ͏ࣳٓـٔ͏ُوا۟','17.7.11','extra_source_maddah')]
        for a,d,wid,kind in cases:
            result=classify(a,d,wid)
            self.assertEqual(result['kind'],kind)
            i,j=result['app_skeleton_range']
            self.assertEqual(skeleton(a)[:i]+result['source_fragment']+skeleton(a)[j:],skeleton(d))

    def test_reject_unknown_and_reverse_and_combined(self):
        for a,d in [('أ','إ'),('ي','ى'),('ه','ة'),('ؤ','ئ'),('ب','ت'),
                    ('ءا','أٓ'),('ب','بٓ'),('أٓأٓ','ءاءا'),('','')]:
            with self.subTest(a=a,d=d),self.assertRaises(ValueError):classify(a,d,'x')

    def test_singletons_restricted_to_ids(self):
        for a,d in [('فادرءتم','فادرٔتم'),('ليسءوا','ليسٓءوا')]:
            with self.assertRaises(ValueError):classify(a,d,'unknown')

    def test_all_recorded_exceptions_exact_inventory(self):
        parity=json.loads((Path(__file__).parent/'reports/parity.json').read_text())
        pages=[]; counts={}
        for p in parity['pages']:
            words=[]
            for diff in p['text_differences']:
                self.assertEqual(len(diff['app']),len(diff['digitalkhatt']))
                for a,d in zip(diff['app'],diff['digitalkhatt']):
                    v=classify(a['text'],d['text'],a['wid'])
                    counts[v['kind']]=counts.get(v['kind'],0)+1
                    words.append({'line':diff['line'],'wid':a['wid'],'app_text':a['text'],
                                  'source_text':d['text'],'validation':v})
            pages.append({'page':p['page'],'words':words})
        self.assertEqual(counts,EXPECTED_CLASSES)
        self.assertEqual(exception_fingerprint(pages),EXCEPTIONS_SHA256)
        pages[0]['words']=[{'line':1,'wid':'x','app_text':'أٓ','source_text':'ءا','validation':{'kind':'long_initial_hamza'}}]
        self.assertNotEqual(exception_fingerprint(pages),EXCEPTIONS_SHA256)


class PairingTests(unittest.TestCase):
    def test_no_artwork_geometry_needed_and_input_untouched(self):
        source,app=fixture(); before=copy.deepcopy((source,app))
        w=pair_page(1,source,app)['words'][0]
        self.assertEqual((w['page'],w['line'],w['slot'],w['wid']),(1,1,1,'1.1.1'))
        self.assertEqual(w['source_box'],[10,10,20,20])
        self.assertEqual(before,(source,app))

    def test_line_count_duplicate_and_text_changes_fail(self):
        for edit in ('line','count','duplicate','text','skeleton'):
            source,app=fixture()
            if edit=='line':source['words'][0]['line']=2
            if edit=='count':source['words'].append(copy.deepcopy(source['words'][0]))
            if edit=='duplicate':
                source['words'].append(copy.deepcopy(source['words'][0]))
                app['words'].append(copy.deepcopy(app['words'][0]))
            if edit=='text':source['words'][0].update(text='ت',skeleton='ت')
            if edit=='skeleton':source['words'][0]['skeleton']='ت'
            with self.subTest(edit=edit),self.assertRaises(ValueError):pair_page(1,source,app)

    def test_repeated_words_keep_ordinal_ids(self):
        source,app=fixture()
        source['words'].append(dict(source['words'][0],box=[0,10,9,20]))
        app['words'].append(dict(app['words'][0],wid='1.1.2'))
        result=pair_page(1,source,app)
        self.assertEqual([(w['slot'],w['wid']) for w in result['words']],[(1,'1.1.1'),(2,'1.1.2')])

    def test_invalid_geometry_fails(self):
        for box in (None,[],[0,0,0,1],[0,1,1,0],[0,0,float('nan'),1],[0,0,float('inf'),1]):
            with self.subTest(box=box),self.assertRaises(ValueError):checked_box(box,[256,410],'x')

    def test_off_frame_is_diagnostic_not_matching(self):
        self.assertFalse(checked_box([-1,0,10,10],[256,410],'x')['inside_source_frame'])

    def test_partial_corpus_fails(self):
        with self.assertRaises(ValueError):validate_corpus([])


if __name__=='__main__':unittest.main()
