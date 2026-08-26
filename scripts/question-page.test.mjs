import assert from "node:assert/strict";
import test from "node:test";
import {
  questionIsVisibleOnPages,
  questionOpeningKey,
  questionOpeningPage,
} from "../src/lib/questionPage.ts";

const prepared = {
  version: 1,
  id: "question-assignment:participant-a:draft-7",
  kind: "prepared-draft",
  participantId: "participant-a",
  divisionId: "division-1",
  muqarrar: "feshey-kolhu",
  selectedAt: 1000,
  label: "78:1–78:16",
  startPage: 582,
  endPage: 582,
};

const manual = {
  ...prepared,
  id: "question-assignment:participant-a:manual",
  kind: "manual",
  startPage: undefined,
  endPage: undefined,
};

test("a prepared question opens on its own starting page", () => {
  assert.equal(questionOpeningPage(prepared), 582);
  assert.equal(questionOpeningPage({
    ...prepared,
    version: 2,
    startPage: undefined,
    range: { startPage: 598 },
  }), 598);
});

test("a manual question leaves the current page alone", () => {
  assert.equal(questionOpeningPage(manual), null);
});

test("a missing question leaves the current page alone", () => {
  assert.equal(questionOpeningPage(null), null);
  assert.equal(questionOpeningPage(undefined), null);
});

test("a page outside the Mushaf is refused rather than clamped", () => {
  assert.equal(questionOpeningPage({ startPage: 0 }), null);
  assert.equal(questionOpeningPage({ startPage: 605 }), null);
  assert.equal(questionOpeningPage({ startPage: -3 }), null);
});

test("the first and last pages are both accepted", () => {
  assert.equal(questionOpeningPage({ startPage: 1 }), 1);
  assert.equal(questionOpeningPage({ startPage: 604 }), 604);
});

test("a non-integer page is refused", () => {
  assert.equal(questionOpeningPage({ startPage: 12.5 }), null);
  assert.equal(questionOpeningPage({ startPage: Number.NaN }), null);
  assert.equal(questionOpeningPage({ startPage: "582" }), null);
});

test("the return control appears only after every visible page leaves the question span", () => {
  assert.equal(questionIsVisibleOnPages(prepared, [581, 582]), true);
  assert.equal(questionIsVisibleOnPages(prepared, [582, 583]), true);
  assert.equal(questionIsVisibleOnPages(prepared, [580, 581]), false);
  assert.equal(questionIsVisibleOnPages(manual, [582]), null);
  assert.equal(questionIsVisibleOnPages({
    ...prepared,
    version: 2,
    startPage: undefined,
    endPage: undefined,
    range: { startPage: 603, endPage: 604 },
  }, [602, 603]), true);
});

test("no session means nothing to open", () => {
  assert.equal(questionOpeningKey(null, prepared), null);
  assert.equal(questionOpeningKey(undefined, prepared), null);
  assert.equal(questionOpeningKey("", prepared), null);
});

test("the same session and question stays on one key, so a refresh keeps the judge's page", () => {
  const first = questionOpeningKey("session-1", prepared);
  const again = questionOpeningKey("session-1", prepared);
  assert.equal(first, again);
});

test("re-judging the same passage in a new session reopens it", () => {
  const first = questionOpeningKey("session-1", prepared);
  const rejudge = questionOpeningKey("session-2", prepared);
  assert.notEqual(first, rejudge);
});

test("changing the question inside one session reopens the page", () => {
  const first = questionOpeningKey("session-1", prepared);
  const swapped = questionOpeningKey("session-1", {
    ...prepared,
    id: "question-assignment:participant-a:draft-9",
  });
  assert.notEqual(first, swapped);
});

test("a session without a question still produces a stable key", () => {
  const key = questionOpeningKey("session-1", null);
  assert.equal(key, "session-1:none");
  assert.equal(key, questionOpeningKey("session-1", undefined));
});
