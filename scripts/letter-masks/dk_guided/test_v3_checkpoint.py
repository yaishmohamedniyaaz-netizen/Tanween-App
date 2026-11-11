"""Synthetic CP2 tests: no corpus generation, image viewing, or fresh sampling."""
import ast
import itertools
from pathlib import Path
import unittest
from unittest.mock import patch
import numpy as np
import bars_v3 as B
import labels_v3 as L
import lamkaf_v3 as K
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

    def stacked_word(self, text='يج'):
        # tid 'a@r0' = rider: thin stroke over columns 20-39 with a dense tooth at 34-39.
        # tid 'b@r1' = carrier: broad body over columns 10-41, under the whole rider.
        lab = np.zeros((30, 50), np.int32)
        lab[18:26, 10:42] = 2
        lab[8:10, 20:40] = 1
        lab[2:14, 34:40] = 1
        return dict(labels=lab, ink=lab > 0, marks=np.zeros_like(lab, dtype=bool),
                    tids=['a@r0', 'b@r1'], word={'text': text})

    def test_stacked2_gives_carrier_the_body_and_rider_its_tooth(self):
        r = self.stacked_word()
        old = bars_v2(r)
        self.assertLess(old['b@r1'][1] - old['b@r1'][0], 0.45 * 32)   # v2: short end-point stub
        new = B.bars_v3(r, fix_stacked2=True)
        self.assertEqual(new['a@r0'], (34, 40))                       # rider: its dense tooth only
        self.assertEqual(new['b@r1'], (10, 34))                       # carrier: the rest of its body
        self.assertTrue(B.valid(new, 50))

    def test_stacked2_leaves_other_letters_exactly_v2(self):
        r = self.stacked_word(text='يب')                               # carrier is not jim/ha/kha
        self.assertEqual(B.bars_v3(r, fix_stacked2=True), bars_v2(r))
        rng = np.random.default_rng(20261114)
        for _ in range(50):
            x = result(rng.integers(0, 3, size=(15, 30)))
            self.assertEqual(B.bars_v3(x, fix_stacked2=True), bars_v2(x))

    def test_bowl2_only_adds_word_final_ya_carriers(self):
        r = self.stacked_word(text='لى')
        self.assertEqual(B.bars_v3(r, fix_stacked2=True), bars_v2(r))
        new = B.bars_v3(r, fix_stacked2=True, fix_bowl2=True)
        self.assertEqual((new['a@r0'], new['b@r1']), ((34, 40), (10, 34)))
        jim = self.stacked_word()
        self.assertEqual(B.bars_v3(jim, fix_stacked2=True, fix_bowl2=True), B.bars_v3(jim, fix_stacked2=True))

    def test_stacked2_rider_already_squeezed_falls_back_to_v2(self):
        # Three letters: the first squeezes the second to nothing before the jim pair is reached.
        lab = np.zeros((30, 50), np.int32)
        lab[2:14, 20:40] = 1; lab[14:16, 22:38] = 2; lab[18:26, 10:42] = 3
        r = dict(labels=lab, ink=lab > 0, marks=np.zeros_like(lab, dtype=bool),
                 tids=['a@r0', 'b@r1', 'c@r2'], word={'text': 'بيج'})
        B.bars_v3(r, fix_stacked2=True)                                # must not raise

    # --- lam before a non-final kaf (fix_lamkaf) ---
    @staticmethod
    def _lamkaf_word(stem_owner, text='بلكم', lam_left=30):
        """80 px high, 100 px wide: ba at the right, a tall stroke at x 60-66, kaf body, mim at the left."""
        lab = np.zeros((80, 100), np.int32)
        lab[60:66, 75:95] = 1            # ba body
        lab[60:66, 66:75] = 1            # join between ba and the stroke
        lab[10:66, 60:66] = stem_owner   # the lam's upright stroke
        lab[60:66, lam_left:60] = 2      # ink labelled lam left of the stroke
        lab[60:66, 15:lam_left] = 3      # kaf body
        lab[55:70, 3:15] = 4             # mim
        tids = [f'w@r{i}' for i in range(len(text))]
        return dict(labels=lab, ink=lab > 0, marks=np.zeros_like(lab, dtype=bool), tids=tids, word={'text': text})

    def test_lamkaf_returns_the_stroke_to_the_lam(self):
        r = self._lamkaf_word(stem_owner=1); old = r['labels'].copy()
        out = K.fix_lamkaf(r)
        np.testing.assert_array_equal(r['labels'], old)                      # input not mutated
        self.assertTrue((out['labels'][10:60, 60:66] == 2).all())            # stroke is lam
        self.assertTrue((out['labels'][60:66, 15:45] == 3).all())            # ink far left of it is kaf
        self.assertTrue((out['labels'][60:66, 75:95] == 1).all())            # ba keeps its own body
        self.assertTrue((out['labels'][55:70, 3:15] == 4).all())             # mim untouched

    def test_lamkaf_trims_a_lam_that_runs_far_left_of_its_stroke(self):
        out = K.fix_lamkaf(self._lamkaf_word(stem_owner=2))
        self.assertTrue((out['labels'][60:66, 30:45] == 3).all())                # beyond 1.5 stroke widths
        self.assertTrue((out['labels'][10:60, 60:66] == 2).all())

    def test_lamkaf_leaves_right_words_and_other_words_alone(self):
        ok = self._lamkaf_word(stem_owner=2, lam_left=52)                    # lam only a little left of its stroke
        self.assertIs(K.fix_lamkaf(ok), ok)
        final = self._lamkaf_word(stem_owner=1, text='ذبلك')                  # word-final kaf: out of scope
        self.assertIs(K.fix_lamkaf(final), final)
        other = self._lamkaf_word(stem_owner=1, text='بلنم')                  # no lam-kaf pair
        self.assertIs(K.fix_lamkaf(other), other)


if __name__ == '__main__':
    unittest.main()
