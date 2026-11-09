#!/usr/bin/env bash
# Requires the shared W2 runtime and W1 fonts/bootstrap; never fetches heldout labels.
set -euo pipefail
cd "$(dirname "$0")/../../.."
V=tmp/letter-positions/.venv-w2
"$V/bin/python" - <<'PY'
from importlib.metadata import version
for name,want in {'torch':'2.15.0+cpu','numpy':'2.3.5','Pillow':'13.0.0','scipy':'1.17.0'}.items():
    assert version(name)==want,(name,version(name),want)
PY
export OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=2
bash scripts/letter-masks/research/w3_run.sh
"$V/bin/python" scripts/letter-masks/research/w3_test.py
