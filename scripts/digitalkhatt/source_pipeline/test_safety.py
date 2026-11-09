"""Filesystem guards for source-only proof outputs."""

import tempfile
from pathlib import Path
import unittest
from safety import REPOSITORY, atomic_write, output_directory


class OutputSafetyTests(unittest.TestCase):
    def test_repository_output_refused(self):
        with self.assertRaises(ValueError):
            output_directory(REPOSITORY / "public" / "must-not-create-source-proof")

    def test_directory_symlink_into_repository_refused(self):
        with tempfile.TemporaryDirectory() as temp:
            link = Path(temp) / "repo-link"
            link.symlink_to(REPOSITORY, target_is_directory=True)
            with self.assertRaises(ValueError):
                output_directory(link / "public" / "must-not-create-source-proof")

    def test_external_file_symlink_preserved(self):
        with tempfile.TemporaryDirectory() as temp:
            victim = Path(temp) / "victim"
            victim.write_bytes(b"preserve")
            link = Path(temp) / "result"
            link.symlink_to(victim)
            with self.assertRaises(ValueError):
                atomic_write(link, b"wrong")
            self.assertEqual(victim.read_bytes(), b"preserve")
            self.assertTrue(link.is_symlink())

    def test_atomic_write_and_replace(self):
        with tempfile.TemporaryDirectory() as temp:
            path = output_directory(Path(temp) / "proof") / "result.json"
            atomic_write(path, b"first")
            atomic_write(path, b"second")
            self.assertEqual(path.read_bytes(), b"second")
            self.assertEqual([p.name for p in path.parent.iterdir()], ["result.json"])


if __name__ == "__main__":
    unittest.main()
