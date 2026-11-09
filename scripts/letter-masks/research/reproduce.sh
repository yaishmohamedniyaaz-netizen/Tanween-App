#!/usr/bin/env bash
# Regenerates research/review/contact/staged exports only. Never writes public/.
set -euo pipefail
cd "$(dirname "$0")/../../.."
MODE=${1:-full}
if [[ "$MODE" != full && "$MODE" != --reuse-results ]]; then echo 'Usage: reproduce.sh [--reuse-results]' >&2; exit 2; fi
bash scripts/letter-masks/research/bootstrap.sh
P=tmp/letter-positions/.venv-w2/bin/python
export OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=2
"$P" scripts/letter-masks/research/common.py
if [[ "$MODE" == full ]]; then
  if [[ ! -f scripts/letter-masks/research/reference_visual_pilot.json ]]; then "$P" scripts/letter-masks/research/extract_reference.py; fi
  bash scripts/letter-masks/research/w1_reproduce.sh
  "$P" scripts/letter-masks/research/w1_top100.py
  bash scripts/letter-masks/research/w2_run.sh --epochs 180
  bash scripts/letter-masks/research/w3_run.sh
fi
"$P" scripts/letter-masks/research/w3_pseudolabels.py
"$P" scripts/letter-masks/research/integrate.py all
"$P" scripts/letter-masks/research/stage_validated_guesses.py
"$P" scripts/letter-masks/research/common_test.py
"$P" scripts/letter-masks/research/w2_test.py
if [[ "$MODE" == full ]]; then "$P" scripts/letter-masks/research/w1_test.py; fi
"$P" scripts/letter-masks/research/w1_validate.py
"$P" scripts/letter-masks/research/w3_test.py
"$P" scripts/letter-masks/research/test_split_batch.py
"$P" scripts/letter-masks/research/verify.py
