import unittest

from measure_svg_research import align_visible_shows


class SvgResearchTests(unittest.TestCase):
    def test_accepts_only_omitted_zero_ink_space(self):
        traces = [{'name': 'space', 'bounds': [0., 0., 0., 0.], 'origin': [1, 2]},
                  {'name': 'behshape', 'bounds': [0., 0., 1., 1.], 'origin': [3, 4]}]
        self.assertEqual(align_visible_shows(traces, [(3, 4)])[0]['trace_index_zero_based'], 0)

    def test_rejects_missing_ink_and_extra_use(self):
        traces = [{'name': 'behshape', 'bounds': [0., 0., 1., 1.], 'origin': [1, 2]}]
        with self.assertRaises(ValueError):
            align_visible_shows(traces, [])
        with self.assertRaises(ValueError):
            align_visible_shows(traces, [(1, 2), (3, 4)])

    def test_rejects_nonempty_space(self):
        with self.assertRaises(ValueError):
            align_visible_shows([{'name': 'space', 'bounds': [0., 0., 1., 1.], 'origin': [1, 2]}], [])


if __name__ == '__main__':
    unittest.main()
