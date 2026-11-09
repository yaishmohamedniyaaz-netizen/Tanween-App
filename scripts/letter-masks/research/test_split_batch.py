"""Splitter regressions use temporary fixtures only; never actual approvals."""
import json
from pathlib import Path
import tempfile
import unittest
from split_batch import choose_ids, digest, read, split


class SplitBatchTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='tanween-split-test-')
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.a, self.o, self.art = [self.root/x for x in ('approved', 'out', 'art')]
        self.words = [{'wid': f'2.1.{i}', 'page': 2, 'status': 'approved', 'family': 'same',
                       'bars': [[1, 3], [2, 4]]} for i in range(20)]
        self.put(self.a/'all-approvals-2026-11-06.json', {'words': []})
        self.put(self.art/'p2.json', {'words': [{**w, 'role': 'letter'} for w in self.words]})
        self.put(self.a/'batch-001.json', {'words': self.words})

    def put(self, path, value):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value))

    def run_split(self, number=1):
        return split(number, self.a, self.o, self.art)

    def test_deterministic_preserves_source_and_geometry(self):
        original = digest(self.a/'batch-001.json')
        r = self.run_split()
        self.assertEqual(r['heldoutWords'], 3)
        self.assertEqual(r['trainingWords'], 17)
        self.assertEqual(r['sharedKnownFamilies'], ['same'])
        self.assertFalse(set(r['trainIds']) & set(r['heldoutIds']))
        self.assertEqual(r, self.run_split())
        self.assertEqual(original, digest(self.a/'batch-001.json'))
        combined = read(self.a/'heldout-001.json')['words'] + read(self.o/'train-001.json')['words']
        self.assertEqual({w['wid']:w for w in combined}, {w['wid']:w for w in self.words})
        ids = [w['wid'] for w in self.words]
        self.assertEqual(choose_ids(ids), choose_ids(ids[::-1]))

    def test_optional_bars_not_synthesized(self):
        for w in self.words: w.pop('bars')
        self.put(self.a/'batch-001.json', {'words': self.words})
        self.run_split()
        self.assertTrue(all('bars' not in w for w in read(self.o/'train-001.json')['words']))

    def test_reject_invalid_batches_without_outputs(self):
        bad = [[], self.words+[self.words[0]], [{**self.words[0], 'status': 'reviewed'}],
               [{**self.words[0], 'wid': 'bad'}], [{**self.words[0], 'wid': '2.1.999'}],
               [{**self.words[0], 'page': 0}]]
        for words in bad:
            with self.subTest(words=words):
                self.put(self.a/'batch-001.json', {'words': words})
                with self.assertRaises(ValueError): self.run_split()
                self.assertFalse((self.a/'heldout-001.json').exists())
                self.assertFalse(self.o.exists())

    def test_reject_historic_and_prior_ids(self):
        for path in [self.a/'all-approvals-2026-11-06.json', self.a/'heldout-009.json', self.o/'train-009.json']:
            with self.subTest(path=path):
                self.put(path, {'words': [self.words[0]]})
                with self.assertRaises(ValueError): self.run_split()
                self.put(path, {'words': []})

    def test_partial_split_refuses_overwrite(self):
        self.put(self.a/'heldout-001.json', {'words': []})
        with self.assertRaises(ValueError): self.run_split()

    def test_each_frozen_file_hash_checked(self):
        self.run_split()
        for path in [self.a/'batch-001.json', self.a/'heldout-001.json', self.o/'train-001.json']:
            with self.subTest(path=path):
                before = path.read_text()
                path.write_text(before+' ')
                with self.assertRaises(ValueError): self.run_split()
                path.write_text(before)
        (self.o/'train-001.json').unlink()
        with self.assertRaises(ValueError): self.run_split()


if __name__ == '__main__':
    unittest.main()
