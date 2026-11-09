#!/usr/bin/env python3
"""Run an already-built official generator with explicit source-only settings.
See BUILD_NATIVE.md for the pinned source build and Linux portability patch.
"""

import argparse
import hashlib
import json
from pathlib import Path
import subprocess
from safety import output_directory, outside_repository, atomic_write

p = argparse.ArgumentParser(description=__doc__)
p.add_argument("--generator", type=Path, required=True)
p.add_argument("--font-project", type=Path, required=True)
p.add_argument("--database", type=Path, required=True)
p.add_argument("--output", type=Path, required=True)
args = p.parse_args()
out = output_directory(args.output)
# The native program writes these paths directly; reject symlinks before invoking it.
for name in (
    "oldmadina.bin",
    "oldmadina.bin.tmp",
    "oldmadina.bin.json",
    "placements.jsonl",
    "mushaf.pdf",
    "mushaf.settings.json",
    "mushaf.run.json",
    "generation.log",
):
    path = out / name
    outside_repository(path)
    if path.is_symlink():
        raise ValueError(f"Refusing native output symlink: {path}")
expected = "f5846940c5f904e37ed0bd72cd87d420b5f7867b5f19a36bf781542cd3a9860b"
if hashlib.sha256(args.database.read_bytes()).hexdigest() != expected:
    raise ValueError("Source-only database differs from verified adapter output")
command = [
    str(args.generator.resolve()),
    str(args.font_project.resolve()),
    "--database",
    str(args.database.resolve()),
    "--layout",
    "qpc_v1_layout",
    "--justifier",
    "decl-policy",
    "--style",
    "font-size-xscale",
    "--shrink",
    "standard",
    "--pages",
    "1-604",
    "--no-pdf",
    "--no-notice",
    "--layout-binary",
    str(out / "oldmadina.bin"),
    "--placement-data",
    str(out / "placements.jsonl"),
    "--output",
    str(out / "mushaf.pdf"),
]
with (out / "generation.log").open("wb") as log:
    subprocess.run(command, stdout=log, stderr=subprocess.STDOUT, check=True)
manifest = json.loads((out / "mushaf.run.json").read_bytes())
if not manifest.get("complete") or manifest["statistics"]["pages"] != 604:
    raise ValueError("Native generator did not complete all604 pages")
if (out / "mushaf.pdf").exists():
    raise ValueError("Unexpected PDF output in source-only generation")
result = {
    "command": command,
    "generator_sha256": hashlib.sha256(args.generator.read_bytes()).hexdigest(),
    "input_database_sha256": expected,
    "outputs": {},
    "generation_seconds": manifest["seconds"],
    "statistics": manifest["statistics"],
    "warning": "Generation is not linguistic/visual approval; run decode_native.py and native app-unit mapping separately.",
}
for name in ("oldmadina.bin", "oldmadina.bin.json", "placements.jsonl"):
    result["outputs"][name] = hashlib.sha256((out / name).read_bytes()).hexdigest()
atomic_write(out / "generation-proof.json", json.dumps(result, indent=2).encode())
print(json.dumps(result, indent=2))
