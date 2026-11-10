"""Synthetic CP2 tests: no corpus generation, image viewing, or fresh sampling."""
import ast
import itertools
from pathlib import Path
import unittest
from unittest.mock import patch
import numpy as np
import bars_v3 as B
import labels_v3 as L
from bars_v2 import bars_v2


def result(labels, text='بن'):
    labels = np.asarray(labels, dtype=np.int32)
    return dict(labels=labels, ink=labels > 0, marks=np.zeros_like(labels, dtype=bool),
                tids=['a', 'b'], word={'text': text})


class V3CheckpointTests(unittest.TestCase):
    def test_default_bars_exact_v2_and_no_mutation(self):
        rng = np.random.default_rng(20261113)
        for _ in range(50):
            r = result(rng.integers(0, 3, size=(15, 30)))
            old = r['labels'].copy()
            self.assertEqual(B.bars_v3(r), bars_v2(r))
            np.testing.assert_array_equal(r['labels'], old)

    def test_default_label_dispatch_no_fix(self):
        baseline = object()
        with patch.object(L, 'aligned_print', return_value=baseline), patch.object(L, 'fix_detached') as detached, patch.object(L, 'fix_stems') as stems, patch.object(L, 'fix_stacked') as stacked:
            self.assertIs(L.label_print(1, 'x'), baseline)
            for fn in (detached, stems, stacked):
                fn.assert_not_called()

    def test_alignment_copy_matches_v2_except_extra_return_fields(self):
        root = Path(__file__).parent
        def function(file, name):
            tree = ast.parse((root / file).read_text())
            return next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == name)
        old = function('dkguide.py', 'label_print')
        new = function('labels_v3.py', 'aligned_print')
        new.name = old.name
        # v3 exposes four arrays for opt-in experiments; all original computation stays exact.
        new.body[-1].value.keys = new.body[-1].value.keys[:-4]
        new.body[-1].value.values = new.body[-1].value.values[:-4]
        self.assertEqual(ast.dump(old), ast.dump(new))

    def test_valid_order_bounds_and_width(self):
        self.assertTrue(B.valid({'a': (6, 9), 'b': (1, 4), '__none__': None}, 10))
        for spans in ({'a': (6, 8)}, {'a': (-1, 3)}, {'a': (8, 11)}, {'a': None}, {'a': (4, 7), 'b': (3, 6)}):
            self.assertFalse(B.valid(spans, 10))

    def test_valid_collision_input_unchanged_identity(self):
        r = result([[2]*4 + [0]*2 + [1]*4]*8)
        spans = {'a': (6, 10), 'b': (0, 4)}
        self.assertIs(B.fix_collisions(r, spans), spans)

    def test_collision_dp_matches_integer_bruteforce(self):
        r = result(np.ones((8, 10), int))
        spans = {'a': (3, 6), 'b': (2, 5)}
        columns = {'a': np.arange(3, 10), 'b': np.arange(0, 7)}
        with patch.object(B, 'body_columns', return_value=columns):
            got = B.fix_collisions(r, spans)
        self.assertTrue(B.valid(got, 10))
        cost = lambda s: sum((s[k][i]-spans[k][i])**2 for k in spans for i in (0, 1))
        feasible = []
        for a, b, c, d in itertools.product(range(11), repeat=4):
            candidate = {'a': (c, d), 'b': (a, b)}
            if 0 <= a < b <= 7 and 3 <= c < d <= 10 and B.valid(candidate, 10):
                feasible.append(cost(candidate))
        self.assertEqual(cost(got), min(feasible))

    def test_impossible_collision_preserves_rejection(self):
        r = result(np.ones((8, 5), int))
        spans = {'a': (2, 5), 'b': (0, 3)}
        with patch.object(B, 'body_columns', return_value={'a': np.arange(5), 'b': np.arange(5)}):
            self.assertEqual(B.fix_collisions(r, spans), spans)
        self.assertFalse(B.valid(spans, 5))

    def test_final_bowl_stays_left_of_previous_and_in_bounds(self):
        lab = np.zeros((20, 20), int)
        lab[2:18, 11:15] = 1
        lab[10:18, 2:11] = 2
        r = result(lab)
        spans = {'a': (11, 15), 'b': (5, 8)}
        got = B.fix_final_bowl(r, spans)
        self.assertEqual(got['b'], (2, 11))
        self.assertTrue(B.valid(got, 20))
        self.assertEqual(spans['b'], (5, 8))
        r['word']['text'] = 'بت'
        self.assertIs(B.fix_final_bowl(r, spans), spans)

    def test_stacked_non_target_preserves_identity(self):
        r = result([[1, 2]], 'بت')
        self.assertIs(L.fix_stacked(r), r)

    def test_stems_synthetic_owner_assignment_does_not_mutate(self):
        ink = np.zeros((60, 60), bool)
        ink[5:55, 42:46] = True
        ink[5:55, 10:14] = True
        dlab = np.zeros(ink.shape, int)
        dlab[5:55, 42:46] = 1
        dlab[5:55, 10:14] = 2
        r = result(np.where(ink, 3-dlab, 0))
        r['_dk_lab'] = dlab
        old = r['labels'].copy()
        got = L.fix_stems(r)
        np.testing.assert_array_equal(got['labels'], dlab)
        np.testing.assert_array_equal(r['labels'], old)


if __name__ == '__main__':
    unittest.main()
