#!/usr/bin/env bash
# Set up the rendering runtime only. Never runs annotation or rebuilds evidence.
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/../../.." && pwd)"
venv_dir="${TAHQEEQ_VISUAL_VENV:-$repo_root/.venv-letter-borders-visual}"

if [[ "${1:-}" == "--install-system" ]]; then
  if ! command -v apt-get >/dev/null 2>&1; then
    echo 'Automatic system setup supports Debian/Ubuntu. Install Python venv, Noto Naskh Arabic, DejaVu Sans and RAQM for your distribution.' >&2
    exit 1
  fi
  elevate=()
  if [[ "$EUID" -ne 0 ]]; then elevate=(sudo); fi
  "${elevate[@]}" apt-get update
  "${elevate[@]}" apt-get install -y python3-venv fonts-noto-core fonts-dejavu-core fontconfig libraqm0
  shift
fi
if [[ "$#" -ne 0 ]]; then
  echo 'Usage: bash scripts/letter-masks/visual/setup-cloud.sh [--install-system]' >&2
  exit 2
fi

python3 -m venv "$venv_dir"
"$venv_dir/bin/python" -m pip install --upgrade pip
"$venv_dir/bin/python" -m pip install --requirement "$script_dir/requirements.txt"
"$venv_dir/bin/python" "$script_dir/font_support.py"
"$venv_dir/bin/python" "$script_dir/smoke_portability.py"
printf '\nRendering runtime ready: %s\n' "$venv_dir/bin/python"
printf 'Existing labels are reused. This setup has not rendered any review sheets or read hidden approvals.\n'
