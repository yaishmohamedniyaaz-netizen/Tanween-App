#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../.."
CACHE=tmp/letter-positions/w1
mkdir -p "$CACHE"
python -m venv --system-site-packages tmp/letter-positions/.venv-w1
P=tmp/letter-positions/.venv-w1/bin/python
"$P" -m pip install uharfbuzz==0.57.0 freetype-py==2.5.1 scikit-image==0.26.0 brotli==1.2.1 fonttools==4.61.1
if [ ! -d "$CACHE/oldmadinafont/.git" ]; then git clone https://github.com/DigitalKhatt/oldmadinafont.git "$CACHE/oldmadinafont"; fi
if [ ! -d "$CACHE/amiri/.git" ]; then git clone https://github.com/aliftype/amiri.git "$CACHE/amiri"; fi
git -C "$CACHE/oldmadinafont" checkout --detach 6e19182f25fb6bd9b6ec05bbb34a3785b2699cca
git -C "$CACHE/amiri" checkout --detach d3d0c5cb6fe7196cb4a58608fc5c8ecd2e6e80fa
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 "$P" scripts/letter-masks/research/w1_registration.py
