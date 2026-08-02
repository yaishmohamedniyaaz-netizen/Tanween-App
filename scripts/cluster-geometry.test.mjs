import assert from "node:assert/strict";
import test from "node:test";
import { buildClusterGeometry } from "../src/lib/clusterGeometry.ts";

const measurement = (rawLeft, rawRight, boundaryAfter) => ({
  rawLeft,
  rawTop: 10,
  rawRight,
  rawBottom: 30,
  boundaryAfter,
});

test("uses contextual RTL caret boundaries as disjoint ownership cells", () => {
  const geometry = buildClusterGeometry(
    [
      measurement(125, 140, 130),
      measurement(115, 135, 118),
      measurement(100, 121, 100),
    ],
    100,
    140,
    true,
  );

  assert.deepEqual(
    geometry.map(({ hitLeft, hitRight }) => [hitLeft, hitRight]),
    [
      [130, 140],
      [118, 130],
      [100, 118],
    ],
  );
  assert.deepEqual(
    geometry.map(({ inkLeft, inkRight }) => [inkLeft, inkRight]),
    [
      [130, 140],
      [118, 130],
      [100, 118],
    ],
  );
});

test("falls back to positive disjoint cells when a ligature hides carets", () => {
  const geometry = buildClusterGeometry(
    [
      measurement(28, 40, 24),
      measurement(12, 34, 24),
      measurement(0, 16, 0),
    ],
    0,
    40,
    true,
  );

  for (const cluster of geometry) {
    assert.ok(cluster.hitRight > cluster.hitLeft);
    assert.ok(cluster.inkLeft >= cluster.hitLeft);
    assert.ok(cluster.inkRight <= cluster.hitRight);
  }
  assert.equal(geometry[0].hitRight, 40);
  assert.equal(geometry.at(-1).hitLeft, 0);
  assert.equal(geometry[0].hitLeft, geometry[1].hitRight);
  assert.equal(geometry[1].hitLeft, geometry[2].hitRight);
});

test("supports left-to-right words without reversing ownership", () => {
  const geometry = buildClusterGeometry(
    [measurement(0, 12, 10), measurement(8, 20, 20)],
    0,
    20,
    false,
  );

  assert.deepEqual(
    geometry.map(({ hitLeft, hitRight }) => [hitLeft, hitRight]),
    [
      [0, 10],
      [10, 20],
    ],
  );
});
