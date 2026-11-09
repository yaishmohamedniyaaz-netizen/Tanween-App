#!/usr/bin/env python3
"""Run the reproducible research checks without changing app assets or rules."""
import argparse
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pdf', type=Path, required=True)
    parser.add_argument('--local-out', type=Path, required=True,
                        help='Local PDF-derived research files; must be outside repository')
    parser.add_argument('--report-out', type=Path, default=ROOT/'scripts/digitalkhatt/reports')
    args = parser.parse_args()
    pdf, local, reports = args.pdf.resolve(), args.local_out.resolve(), args.report_out.resolve()
    if local == ROOT or ROOT in local.parents:
        parser.error('--local-out must remain outside this repository')
    reports.mkdir(parents=True, exist_ok=True)
    commands = [
        ['parity.py', '--pdf', str(pdf), '--out', str(reports)],
        ['word_mapping.py', '--pdf', str(pdf), '--out', str(reports)],
        ['glyph_mapping.py', '--pdf', str(pdf), '--out', str(reports/'mapping.json')],
        ['measure_svg_research.py', '--pdf', str(pdf), '--local-out', str(local), '--report-out', str(reports)],
    ]
    for command in commands:
        subprocess.run([sys.executable, str(ROOT/'scripts/digitalkhatt'/command[0]), *command[1:]],
                       cwd=ROOT, check=True)
    print('Research reports generated. No runtime integration, production assets, or visual approval implied.')


if __name__ == '__main__':
    main()
