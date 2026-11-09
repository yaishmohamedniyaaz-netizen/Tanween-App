#!/usr/bin/env python3
import copy
import json
import os
from pathlib import Path
import tempfile
import unittest

from parity import ART, Extractor, compare_page, hamza_diagnostic, iou, skeleton


class TextTests(unittest.TestCase):
    def test_cgj_does_not_change_canonical_hamza(self):
        self.assertEqual(skeleton("إ͏ِنَّ"), skeleton("إِنَّ"))
        self.assertEqual(skeleton("يُو͏ٔ͏ْمِنُونَ"), skeleton("يُؤۡمِنُونَ"))

    def test_tatweel_is_not_a_consonant(self):
        self.assertEqual(skeleton("بِـٔ͏َايَٰتِ"), "بءايت")

    def test_strict_skeleton_retains_uncomposed_hamza(self):
        self.assertEqual(skeleton("رَٰ͏ْٔ"), "رٔ")
        self.assertNotEqual(skeleton("ٱمۡرِيٕٖ"), skeleton("ٱمْرِي͏ٔ͏ࣲ"))

    def test_diagnostic_is_explicit_and_separate(self):
        pairs = [("ٱلۡأٓخِرِ", "ٱلْـٔ͏َاخِرِ"),
                 ("فَٱدَّٰرَٰءۡتُمۡ", "فَٱدَّٰرَٰ͏ْٔتُمْ"),
                 ("ٱمۡرِيٕٖ", "ٱمْرِي͏ٔ͏ࣲ"),
                 ("ٱللُّؤۡلُوِٕ", "ٱللُّو͏ٔ͏ْلُو͏ٔ͏ِ")]
        for a,b in pairs:
            with self.subTest(a=a):
                self.assertNotEqual(skeleton(a), skeleton(b))
                self.assertEqual(hamza_diagnostic(a), hamza_diagnostic(b))

    def test_real_letter_distinctions_remain(self):
        for a,b in [("ي","ى"),("ه","ة"),("أ","إ"),("ؤ","ئ"),("ء","ا")]:
            self.assertNotEqual(skeleton(a),skeleton(b))
            self.assertNotEqual(hamza_diagnostic(a),hamza_diagnostic(b))


def fixture(text="ب", dk_text="ب", app_box=None, dk_box=None):
    app = {"width":1920,"height":3106,"words":[{"wid":"1.1.0","text":text,"line":1,
            "role":"letter","body":app_box or [0,0,10,10]}]}
    dk = {"words":[{"text":dk_text,"skeleton":skeleton(dk_text),"line":1,
            "box":dk_box or [0,0,10,10]}],"frame":[1920,3106]}
    return dk,app


class GeometryTests(unittest.TestCase):
    def test_iou_identical_touching_and_separate(self):
        self.assertEqual(iou([0,0,10,10],[0,0,10,10]),1)
        self.assertEqual(iou([0,0,10,10],[10,0,20,10]),0)
        self.assertEqual(iou([0,0,10,10],[20,0,30,10]),0)

    def test_text_difference_does_not_remove_geometry(self):
        dk,app = fixture("ٱلۡأٓخِرِ","ٱلْـٔ͏َاخِرِ")
        result = compare_page(3,dk,app)
        self.assertFalse(result["text_layout_match"])
        self.assertTrue(result["hamza_diagnostic_match"])
        self.assertEqual(result["position"]["compared_words"],1)
        self.assertEqual(result["position"]["worst_word"]["pairing"],"same_line_and_word_slot_only")

    def test_rounding_does_not_invent_zero_overlap(self):
        dk,app = fixture(dk_box=[10-1e-8,0,20,10])
        result = compare_page(3,dk,app)
        self.assertEqual(result["position"]["worst_iou"],0.0)
        self.assertTrue(result["position"]["worst_word"]["overlaps"])
        self.assertEqual(result["position"]["zero_overlap_words"],[])

    def test_line_or_word_count_mismatch_is_visible(self):
        dk,app = fixture()
        dk["words"][0]["line"] = 2
        result = compare_page(3,dk,app)
        self.assertFalse(result["line_and_word_count_match"])
        self.assertEqual(len(result["word_count_differences"]),2)

    def test_input_is_not_mutated(self):
        dk,app = fixture()
        before = copy.deepcopy((dk,app))
        compare_page(3,dk,app)
        self.assertEqual((dk,app),before)

    def test_unpinned_input_fails_before_pdf_parse(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/"wrong.pdf"
            path.write_bytes(b"not the pinned source")
            with self.assertRaisesRegex(ValueError,"SHA256"):
                Extractor(path)


@unittest.skipUnless(os.environ.get("DK_PDF"), "Set DK_PDF for pinned-source integration tests")
class PdfIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.extractor = Extractor(os.environ["DK_PDF"])

    def compare(self,n):
        return compare_page(n,self.extractor.page(n),json.loads((ART/f"p{n}.json").read_bytes()))

    def test_all_checkpoint_sample_counts(self):
        expected = {1:29,2:36,3:127,50:135,187:121,293:127,582:105,600:73,604:58}
        for n,count in expected.items():
            with self.subTest(page=n):
                result = self.compare(n)
                self.assertEqual(result["app_words"],count)
                self.assertEqual(result["digitalkhatt_words"],count)
                self.assertTrue(result["line_and_word_count_match"])
                self.assertEqual(result["position"]["compared_words"],count)

    def test_basmala_is_removed_only_when_standalone(self):
        self.assertEqual(self.extractor.page(1)["basmala_lines_removed"],[])
        self.assertEqual(self.extractor.page(2)["basmala_lines_removed"],[2])
        self.assertEqual(self.extractor.page(604)["basmala_lines_removed"],[2,6,11])
        embedded = self.compare(379)
        self.assertTrue(embedded["line_and_word_count_match"])
        self.assertEqual(embedded["extraction"]["basmala_lines_removed"],[])

    def test_first_pages_reproduce_geometry_gate(self):
        self.assertEqual(len(self.compare(1)["position"]["zero_overlap_words"]),29)
        self.assertEqual(len(self.compare(2)["position"]["zero_overlap_words"]),36)


if __name__ == "__main__":
    unittest.main()
