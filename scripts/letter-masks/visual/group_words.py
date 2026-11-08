"""Inventory exact artwork spellings and conservatively group pilot drawings.

This reads no approval, decision, old guess, or evaluation data. Correlation is
used ONLY to organize drawings for subsequent visual annotation. A cluster is
not evidence that letter borders can be copied without looking at every member.

Run from the repository root with Python + NumPy, Pillow, SciPy and Node:
    python scripts/letter-masks/visual/group_words.py
    python scripts/letter-masks/visual/group_words.py --self-test

All registered role=letter artwork words are inventoried. Only the top 100
spellings are shape-clustered by default; all others remain explicitly pending.
Owned baseline-connected skeleton ink is compared after conservative extraction
gates. Unreliable extraction falls back to full ink in separate clusters. The
earlier full-ink diagnostic can be reproduced with --feature-source full-ink.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys
import tempfile
import time

import numpy as np
from PIL import Image
from scipy.cluster.hierarchy import fcluster, linkage
from scipy.ndimage import gaussian_filter
from scipy.spatial.distance import pdist, squareform

ROOT = Path(__file__).resolve().parents[3]
ARTWORK = ROOT / "public/mushaf/1405-artwork-5a5f9f3846158475"
OUT = Path(__file__).resolve().parent
RULE = "qpc-hafs-v1-targets-4.0.0"
METHOD = "exact-text-complete-link-skeleton-v1"
FEATURE_WIDTH = 48
FEATURE_HEIGHT = 32
MIN_CORRELATION = .88
MAX_ASPECT_RATIO = 1.14


def save_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


def load_units():
    """Export actual context-sensitive app units without opening approvals."""
    with tempfile.TemporaryDirectory(prefix=".group-units-", dir=OUT) as tmp:
        target = Path(tmp) / "units.json"
        run = subprocess.run(
            ["node", "--experimental-strip-types", str(ROOT / "scripts/letter-masks/dump_units.mts"),
             *map(str, range(1, 605)), "--out", str(target)],
            cwd=ROOT, text=True, capture_output=True, check=False,
        )
        if run.returncode != 0:
            raise RuntimeError("App-unit export failed: " + run.stderr)
        print("App-unit export:", run.stdout.strip(), flush=True)
        return json.loads(target.read_text(encoding="utf-8"))


def unit_signature(units):
    # Context changes which units are silent. Never copy between incompatible
    # forms merely because the artwork's exact spelling is the same.
    return tuple((u["start"], u["end"], u["primary"], u["show"], bool(u["silent"])) for u in units)


def drawing_feature(gray, body):
    """Tight ink crop, height normalization, then modest fixed-grid comparison.

    Both axes are resampled onto a fixed grid, but complete-link aspect-ratio
    bounds prevent normalization from merging differently stretched drawings.
    All visible ink in the body crop is retained, including dots and marks.
    Slight Gaussian antialiasing suppresses scan rasterization, not strokes.
    This is intentionally conservative: touching neighbour ink can split groups.
    """
    x0, y0, x1, y1 = (math.floor(body[0]), math.floor(body[1]), math.ceil(body[2]), math.ceil(body[3]))
    crop = np.asarray(gray.crop((x0, y0, x1, y1)))
    mask = crop < 160
    ys, xs = np.nonzero(mask)
    if not len(xs):
        raise ValueError(f"Empty body ink at {body}")
    left, right, top, bottom = int(xs.min()), int(xs.max()) + 1, int(ys.min()), int(ys.max()) + 1
    ink = (255 - crop[top:bottom, left:right]).astype(np.uint8)
    ink[ink < 95] = 0
    norm = Image.fromarray(ink).resize((FEATURE_WIDTH, FEATURE_HEIGHT), Image.Resampling.LANCZOS)
    feature = gaussian_filter(np.asarray(norm, dtype=np.float32) / 255, sigma=.45).ravel()
    # Mean-centred normalized correlation also compares white space; it is not
    # merely a width histogram, letter classifier, or border detector.
    feature -= feature.mean()
    feature /= max(float(np.linalg.norm(feature)), 1e-12)
    return feature, (right - left) / (bottom - top), [x0 + left, y0 + top, x0 + right, y0 + bottom]


def cluster_features(features, aspects, minimum=MIN_CORRELATION, aspect_limit=MAX_ASPECT_RATIO):
    """Complete linkage: every pair in a cluster satisfies both limits.

    This avoids single-link chaining across a spectrum of justification widths.
    The representative is the member closest to its normalized-feature centroid.
    """
    n = len(features)
    if n == 1:
        return [(np.array([0]), 0, 1., 1.)]
    feature_matrix = np.asarray(features, dtype=np.float64)
    cosine_distances = np.maximum(0, pdist(feature_matrix, metric="cosine"))
    aspect_distances = pdist(np.log(np.asarray(aspects))[:, None], metric="cityblock")
    distances = np.maximum(cosine_distances / (1 - minimum), aspect_distances / math.log(aspect_limit))
    labels = fcluster(linkage(distances, method="complete", optimal_ordering=False), t=1., criterion="distance")
    cosine_square = squareform(cosine_distances)
    result = []
    for label in sorted(set(labels)):
        indices = np.flatnonzero(labels == label)
        centre = feature_matrix[indices].mean(axis=0)
        representative = int(indices[np.argmin(np.sum((feature_matrix[indices] - centre) ** 2, axis=1))])
        minimum_correlation = float(1 - cosine_square[np.ix_(indices, indices)].max())
        aspect_spread = float(max(aspects[i] for i in indices) / min(aspects[i] for i in indices))
        if minimum_correlation < minimum - 1e-7 or aspect_spread > aspect_limit + 1e-7:
            raise AssertionError("Complete-link similarity invariant failed")
        result.append((indices, representative, minimum_correlation, aspect_spread))
    return result


def self_test():
    # A-B and B-C are close, A-C is not: complete linkage must not chain all 3.
    angles = np.array([0., .2, .4])
    f = np.column_stack((np.cos(angles), np.sin(angles)))
    groups = cluster_features(f, [1., 1., 1.], minimum=.97)
    assert sorted(len(x[0]) for x in groups) == [1, 2]
    assert len(cluster_features(np.tile(f[0], (3, 1)), [1., 1.08, 1.3])) == 2
    close = np.array([[1., 0.], [.99, .01], [.98, .02]])
    close /= np.linalg.norm(close, axis=1)[:, None]
    assert cluster_features(close, [1., 1., 1.])[0][1] == 1
    fixture = Image.new("L", (100, 80), 255)
    fixture.paste(0, (20, 15, 60, 55))
    _, aspect, inkbox = drawing_feature(fixture, [10, 10, 75, 70])
    assert inkbox == [20, 15, 60, 55] and aspect == 1
    print("Grouping self-checks passed: no chaining, aspect separation, nearest-centre representative, crop geometry.")


def build(top, output, report_path, feature_source="skeleton"):
    started = time.perf_counter()
    method = METHOD if feature_source == "skeleton" else "exact-text-complete-link-ink-v1"
    spellings = defaultdict(list)
    geometry = {}
    pages = {}
    metadata_digest = hashlib.sha256()
    for page in range(1, 605):
        raw = (ARTWORK / f"p{page}.json").read_bytes()
        metadata_digest.update(raw)
        data = json.loads(raw)
        pages[page] = data
        for word in data["words"]:
            if word.get("role") != "letter":
                continue
            wid = word["wid"]
            if wid in geometry:
                raise ValueError(f"Repeated artwork word id {wid}")
            spellings[word["text"]].append(wid)
            geometry[wid] = {"page": page, "body": word["body"], "band": word["band"], "region": word["region"]}
    ranked = sorted(spellings, key=lambda text: (-len(spellings[text]), text))
    pilot_texts = set(ranked[:top])
    units = load_units()
    missing_units = set(geometry).difference(units)
    if missing_units:
        raise ValueError(f"Missing app units: {sorted(missing_units)[:10]}")
    variant_map = {}
    entries = {}
    for rank, text in enumerate(ranked, 1):
        members = spellings[text]
        signatures = sorted({unit_signature(units[wid]["units"]) for wid in members})
        signature_index = {sig: index for index, sig in enumerate(signatures)}
        for wid in members:
            variant_map[wid] = signature_index[unit_signature(units[wid]["units"])]
            geometry[wid]["unitVariant"] = variant_map[wid]
        variants = [[{"start": s, "end": e, "primary": primary, "show": show, "silent": silent}
                     for s, e, primary, show, silent in sig] for sig in signatures]
        entries[text] = {"rank": rank, "count": len(members), "pilot": text in pilot_texts,
                         "status": "shape-grouped-awaiting-visual-review" if text in pilot_texts else "pending-unclustered",
                         "unitVariants": variants, "clusters": [], "pendingMemberIds": [] if text in pilot_texts else members}
    feature_by_id = {}
    aspect_by_id = {}
    extraction_counts = Counter()
    if feature_source == "skeleton":
        sys.path.insert(0, str(ROOT / "scripts/letter-masks"))
        from pieces2 import page_pieces
        from pieces import letters, groups as connected_groups
    for page, data in pages.items():
        chosen = [word for word in data["words"] if word.get("role") == "letter" and word["text"] in pilot_texts]
        if chosen:
            if feature_source == "skeleton":
                piece_rows, component_labels = page_pieces(page)
                piece_by_id = {row["word"]["wid"]: row for row in piece_rows}
            with Image.open(ARTWORK / f"p{page}.png") as artwork:
                gray = artwork.convert("L")
                for word in chosen:
                    feature, aspect, inkbox = drawing_feature(gray, word["body"])
                    wid = word["wid"]
                    comparison_kind = "full-ink"
                    comparison_box = inkbox
                    if feature_source == "skeleton":
                        row = piece_by_id[wid]
                        skeleton_ids = [p["id"] for p in row["pieces"] if p["kind"] == "skeleton"]
                        expected = len(connected_groups(letters(word["text"])))
                        comparison_kind = "full-ink-fallback"
                        x0, y0, x1, y1 = math.floor(word["body"][0]), math.floor(word["body"][1]), math.ceil(word["body"][2]), math.ceil(word["body"][3])
                        body_ink = np.asarray(gray.crop((x0, y0, x1, y1))) < 128
                        skeleton = np.isin(component_labels[y0:y1, x0:x1], skeleton_ids)
                        coverage = float(skeleton.sum() / max(1, body_ink.sum()))
                        if len(skeleton_ids) == expected and expected > 0 and coverage >= .55:
                            comparison_kind = "baseline-skeleton"
                            skeleton_image = Image.fromarray(np.where(skeleton, 0, 255).astype(np.uint8))
                            feature, aspect, local_box = drawing_feature(skeleton_image, [0, 0, x1 - x0, y1 - y0])
                            comparison_box = [local_box[0] + x0, local_box[1] + y0, local_box[2] + x0, local_box[3] + y0]
                        geometry[wid]["skeletonExtraction"] = {"components": len(skeleton_ids), "expected": expected, "bodyInkCoverage": round(coverage, 6)}
                    geometry[wid]["shapeFeatureKind"] = comparison_kind
                    geometry[wid]["shapeComparisonBox"] = comparison_box
                    extraction_counts[comparison_kind] += 1
                    feature_by_id[wid], aspect_by_id[wid] = feature, aspect
                    geometry[wid]["inkBox"] = inkbox
        if page % 100 == 0 or page == 604:
            print(f"Cropped pilot drawings: page {page}/604 ({len(feature_by_id)} words)", flush=True)
    for text in ranked[:top]:
        entry = entries[text]
        clusters = []
        by_variant = defaultdict(list)
        for wid in spellings[text]:
            by_variant[(variant_map[wid], geometry[wid]["shapeFeatureKind"])].append(wid)
        for (variant, comparison_kind), ids in sorted(by_variant.items()):
            pieces = cluster_features([feature_by_id[wid] for wid in ids], [aspect_by_id[wid] for wid in ids])
            for indices, representative_index, correlation, spread in pieces:
                representative_id = ids[representative_index]
                member_ids = [ids[int(i)] for i in indices]
                clusters.append({
                    "unitVariant": variant, "shapeFeatureKind": comparison_kind, "count": len(member_ids), "memberIds": member_ids,
                    "representative": {"wid": representative_id, **geometry[representative_id], "units": units[representative_id]["units"]},
                    "minimumPairCorrelation": round(correlation, 6), "maximumPairAspectRatio": round(spread, 6),
                    "reviewStatus": "unreviewed", "borders": None,
                })
        clusters.sort(key=lambda c: (-c["count"], c["representative"]["page"], c["representative"]["wid"]))
        for index, cluster in enumerate(clusters, 1):
            cluster["id"] = f"s{entry['rank']:05d}-c{index:04d}"
        entry["clusters"] = clusters
        print(f"Shape grouping {entry['rank']}/{top}: {entry['count']} occurrences -> {len(clusters)} clusters", flush=True)
    all_ids = [wid for e in entries.values() for c in e["clusters"] for wid in c["memberIds"]]
    all_ids += [wid for e in entries.values() for wid in e["pendingMemberIds"]]
    assert len(all_ids) == len(set(all_ids)) == len(geometry)
    assert set(all_ids) == set(geometry)
    all_clusters = [cluster for text in ranked[:top] for cluster in entries[text]["clusters"]]
    pilot_count = sum(len(spellings[text]) for text in ranked[:top])
    report = {
        "schemaVersion": 1, "method": method, "ruleVersion": RULE,
        "corpus": {"pages": 604, "words": len(geometry), "distinctSpellings": len(ranked),
                   "spellingsUsedOnce": sum(len(ids) == 1 for ids in spellings.values()),
                   "source": "public/mushaf/1405-artwork-5a5f9f3846158475/p{N}.json exact text, role=letter",
                   "metadataSha256": metadata_digest.hexdigest()},
        "coverage": {str(n): {"words": sum(len(spellings[t]) for t in ranked[:n]),
                              "percent": round(100 * sum(len(spellings[t]) for t in ranked[:n]) / len(geometry), 3)}
                     for n in [40, 100, 500, 1000, 2000, 5000]},
        "pilot": {"spellings": top, "words": pilot_count, "percent": round(100 * pilot_count / len(geometry), 3),
                  "clusters": len(all_clusters), "singletonClusters": sum(c["count"] == 1 for c in all_clusters),
                  "repeatedClusters": sum(c["count"] > 1 for c in all_clusters),
                  "wordsInRepeatedClusters": sum(c["count"] for c in all_clusters if c["count"] > 1),
                  "largestCluster": max((c["count"] for c in all_clusters), default=0),
                  "spellingsWithMultipleClusters": sum(len(entries[t]["clusters"]) > 1 for t in ranked[:top]),
                  "clusterSizeHistogram": dict(sorted(Counter(str(c["count"]) for c in all_clusters).items(), key=lambda kv: int(kv[0]))),
                  "representativesVisuallyReviewed": 0, "membersVisuallyReviewed": 0},
        "pending": {"spellings": len(ranked) - top, "words": len(geometry) - pilot_count,
                    "status": "Inventoried, not shape-clustered or annotated; deferred beyond checkpoint A."},
        "thresholds": {"minimumPairNormalizedInkCorrelation": MIN_CORRELATION,
                       "maximumPairInkAspectRatio": MAX_ASPECT_RATIO, "featureGrid": [FEATURE_WIDTH, FEATURE_HEIGHT],
                       "grayscaleInkThreshold": 160, "gaussianSigma": .45,
                       "linkage": "complete", "representative": "nearest Euclidean normalized-feature centroid",
                       "compatibility": "exact artwork text plus actual app start/end/primary/show/silent units"},
        "featureExtraction": {"mode": feature_source, "counts": dict(extraction_counts),
                              "skeletonSource": "pieces2.page_pieces: uniquely owned components intersecting the line baseline",
                              "skeletonGate": "component count equals connected groups from exact text, and at least 55% of body ink retained",
                              "skeletonInkThreshold": 128,
                              "fallback": "Full body ink; never mixed in a cluster with baseline-skeleton features."},
        "validation": {"registeredWordsInventoriedExactlyOnce": True, "missingAppUnits": 0,
                       "unitSource": "scripts/letter-masks/dump_units.mts", "syntheticUnitWordsOutsideArtwork": len(set(units) - set(geometry)),
                       "allClusterPairsSatisfyThresholds": True, "approvalOrGuessFilesRead": False,
                       "bordersGenerated": 0, "visualAcceptance": "pending"},
        "limitations": ["Algorithmic clusters organize visual work; none are approved and no border was inferred.",
                        "All members must be inspected after border transfer, even if correlation is high.",
                        "Baseline component classification is a clustering aid, not verified letter segmentation; extraction gates reduce but cannot eliminate errors.",
                        "Full-ink fallback crops retain dots, marks and any intruding neighbour ink; this can conservatively split matching drawings.",
                        "Fixed-grid normalization permits small global scale changes only within the pairwise aspect bound; no nonlinear warp or letter segmentation is used.",
                        "Thresholds are conservative geometric gates, not calibrated probabilities of correct letter attribution."],
        "perSpelling": [{"rank": entries[t]["rank"], "text": t, "words": entries[t]["count"],
                         "clusters": len(entries[t]["clusters"]), "unitVariants": len(entries[t]["unitVariants"])} for t in ranked[:top]],
        "elapsedSeconds": round(time.perf_counter() - started, 2),
    }
    result = {"schemaVersion": 1, "method": method, "ruleVersion": RULE, "pilotTopN": top,
              "notes": "Exact spelling keys. Geometry is indexed by wid. Nonpilot members are pending, not silently grouped. Clusters are unreviewed and contain no border decisions.",
              "spellings": entries, "words": geometry}
    save_json(output, result)
    save_json(report_path, report)
    print(json.dumps({"corpus": report["corpus"], "pilot": report["pilot"], "elapsedSeconds": report["elapsedSeconds"]}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--top", type=int, default=100)
    parser.add_argument("--out", type=Path, default=OUT / "groups.json")
    parser.add_argument("--report", type=Path, default=OUT / "group-report.json")
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--feature-source", choices=["skeleton", "full-ink"], default="skeleton")
    args = parser.parse_args()
    if args.self_test:
        self_test()
    else:
        if not 1 <= args.top <= 21116:
            parser.error("--top must be 1..21116")
        build(args.top, args.out, args.report, args.feature_source)
