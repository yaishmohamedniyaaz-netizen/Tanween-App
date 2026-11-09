#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../.."
tmp/letter-positions/.venv-w2/bin/python scripts/letter-masks/research/w3_synthetic.py
tmp/letter-positions/.venv-w2/bin/python scripts/letter-masks/research/w3_segmentation.py
tmp/letter-positions/.venv-w2/bin/python scripts/letter-masks/research/w3_segmentation.py --synthetic
tmp/letter-positions/.venv-w2/bin/python scripts/letter-masks/research/w3_finalize.py
tmp/letter-positions/.venv-w2/bin/python scripts/letter-masks/research/w3_pseudolabels.py
