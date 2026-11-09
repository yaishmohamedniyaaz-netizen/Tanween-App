#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../.."
CACHE=tmp/letter-positions/w1
mkdir -p "$CACHE"
P=tmp/letter-positions/.venv-w2/bin/python
if [ ! -x "$P" ]; then bash scripts/letter-masks/research/bootstrap.sh; fi
if [ ! -d "$CACHE/oldmadinafont/.git" ]; then git clone https://github.com/DigitalKhatt/oldmadinafont.git "$CACHE/oldmadinafont"; fi
if [ ! -d "$CACHE/amiri/.git" ]; then git clone https://github.com/aliftype/amiri.git "$CACHE/amiri"; fi
git -C "$CACHE/oldmadinafont" checkout --detach 6e19182f25fb6bd9b6ec05bbb34a3785b2699cca
git -C "$CACHE/amiri" checkout --detach d3d0c5cb6fe7196cb4a58608fc5c8ecd2e6e80fa
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 "$P" scripts/letter-masks/research/w1_registration.py
