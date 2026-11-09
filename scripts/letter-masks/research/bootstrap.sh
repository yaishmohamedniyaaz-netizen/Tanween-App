#!/usr/bin/env bash
# Official registries only. No source-input modifications or model downloads.
set -euo pipefail
cd "$(dirname "$0")/../../.."
V=tmp/letter-positions/.venv-w2
if ! test -x "$V/bin/python"; then python -m venv "$V"; fi
"$V/bin/python" -m pip install 'torch==2.15.0+cpu' --index-url https://download.pytorch.org/whl/cpu
"$V/bin/python" -m pip install -r scripts/letter-masks/research/requirements.txt
"$V/bin/python" -c 'import sys,torch,numpy,PIL,scipy; print(sys.version); print(torch.__version__, numpy.__version__, PIL.__version__, scipy.__version__)'
