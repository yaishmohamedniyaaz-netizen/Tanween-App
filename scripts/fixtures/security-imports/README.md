# Pre-upgrade roster fixtures

These synthetic XLSX, XLS and CSV files were generated once with SheetJS 0.18.5
before upgrading the reader. The regression suite reads the unchanged files with
the patched version, covering Arabic/Dhivehi names, a leading-zero participant
number and optional contact/institution fields. All values are fabricated test
data, not participant records. Keep the binary fixtures unchanged when updating
the reader so the test does not merely round-trip the new implementation.
