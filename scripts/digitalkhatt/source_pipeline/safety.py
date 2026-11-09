"""Keep research outputs outside the application checkout, including symlinks."""

from pathlib import Path
import os
import tempfile

REPOSITORY = Path(__file__).resolve().parents[3]


def outside_repository(path: Path) -> Path:
    resolved = path.resolve()
    if resolved == REPOSITORY or REPOSITORY in resolved.parents:
        raise ValueError(f"Research output must be outside the repository: {path}")
    return resolved


def output_directory(path: Path) -> Path:
    directory = outside_repository(path)
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def atomic_write(path: Path, data: bytes) -> None:
    outside_repository(path)
    if path.is_symlink():
        raise ValueError(f"Refusing output symlink: {path}")
    fd, temp = tempfile.mkstemp(prefix=".source-proof-", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(data)
        os.replace(temp, path)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)
