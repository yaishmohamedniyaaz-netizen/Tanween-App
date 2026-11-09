#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../.."
bash scripts/letter-masks/research/bootstrap.sh
P=tmp/letter-positions/.venv-w2/bin/python
"$P" scripts/letter-masks/research/common.py
"$P" scripts/letter-masks/research/common_test.py
"$P" scripts/letter-masks/research/w2_test.py
"$P" scripts/letter-masks/research/w2_ctc.py --epochs 180 --run primary
"$P" scripts/letter-masks/research/w2_ctc.py --epochs 180 --run duplicate
cp tmp/letter-positions/w2/primary/predictions.json tmp/letter-positions/w2/primary/predictions-before-reuse.json
"$P" scripts/letter-masks/research/w2_ctc.py --reuse
"$P" scripts/letter-masks/research/w2_verify.py
"$P" scripts/letter-masks/research/w2_report.py
