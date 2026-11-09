#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../.."
V=tmp/letter-positions/.venv-w2
if ! "$V/bin/python" -c 'import torch,numpy,PIL,scipy' >/dev/null 2>&1; then
  python -m venv --system-site-packages "$V"
  "$V/bin/python" -m pip install 'torch==2.15.0+cpu' --index-url https://download.pytorch.org/whl/cpu
  "$V/bin/python" -m pip install -r scripts/letter-masks/research/requirements-w2.txt
fi
exec "$V/bin/python" scripts/letter-masks/research/w2_ctc.py "$@"
