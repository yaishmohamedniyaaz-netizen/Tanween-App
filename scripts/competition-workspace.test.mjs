import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const appSource = read("../src/App.tsx");
const headerSource = read("../src/components/Header.tsx");
const idleSource = read("../src/components/CompetitionIdlePanel.tsx");
const setupSource = read("../src/components/CompetitionSetup.tsx");
const settingsSource = read("../src/components/SettingsWorkspace.tsx");
const questionWorkspaceSource = read("../src/components/QuestionPreparationWorkspace.tsx");
const mushafSource = read("../src/components/Mushaf.tsx");
const builderSource = read("../src/components/QuestionBuilder.tsx");
const previewSource = read("../src/components/QuestionMushafPreview.tsx");
const participantScreenSource = read(
  "../src/components/ParticipantSelectionScreen.tsx",
);
const participantPresentationSource = read(
  "../src/lib/participantPresentation.ts",
);
const questionScreenSource = read(
  "../src/components/QuestionNumberScreen.tsx",
);
const finishSource = read("../src/components/FinishDialog.tsx");
const preparedStripSource = read("../src/components/PreparedRecitationStrip.tsx");
const preparedSidebarSource = read("../src/components/PreparedSidebar.tsx");
const moreActionsSource = read("../src/components/MoreActionsPopover.tsx");

test("opening Tahqeeq remains a free Mushaf instead of auto-starting a session", () => {
  assert.match(appSource, /const \[startOpen, setStartOpen\] = useState\(false\)/);
  assert.match(appSource, /<CompetitionIdlePanel/);
  assert.match(appSource, /setStartMode\("start"\)/);
  assert.match(appSource, /setStartOpen\(true\)/);
  assert.match(appSource, /state\.competition\.status === "live"/);
  assert.doesNotMatch(appSource, /!state\.sessionActive && <StartDialog/);
});

test("competition preparation is a dedicated task workspace", () => {
  for (const label of [
    "Competition details",
    "Categories and portions",
    "Participants",
    "Judging panel",
    "Marks and criteria",
    "Question rules",
    "Draft questions",
    "Review and start",
  ]) {
    assert.match(setupSource, new RegExp(label));
  }
  assert.match(setupSource, /Start competition/);
  assert.match(setupSource, /Close competition/);
  assert.match(setupSource, /setup-checklist-trigger/);
  assert.match(setupSource, /aria-expanded=\{activeTask === task\.id\}/);
  assert.match(setupSource, /Discard the unsaved changes in the open setup task/);
  assert.match(setupSource, /Save Categories/);
  assert.match(setupSource, /SET_SCORE_CONFIG/);
  assert.match(moreActionsSource, /Competition setup/);
});

test("general settings remain separate from competition setup", () => {
  assert.match(headerSource, /تَحْقِيق/);
  assert.doesNotMatch(headerSource, /Øª|Ù‚/);
  assert.match(moreActionsSource, /Settings/);
  assert.match(settingsSource, /Appearance/);
  assert.match(settingsSource, /Mushaf and judging workspace/);
  assert.match(settingsSource, /Data and recovery/);
  assert.match(settingsSource, /Download backup/);
  assert.match(settingsSource, /restore-preview/);
  assert.match(settingsSource, /Ready to review/);
  assert.doesNotMatch(headerSource, /Restore preview|Mushaf zoom|Judge rail side/);
});

test("question preparation exposes the ayah rule without pretending drafts are official", () => {
  assert.match(setupSource, /Every official question starts at an ayah/);
  assert.match(setupSource, /first complete ayah ending on or after line/);
  assert.match(setupSource, /No AI, OCR or paid API is used/);
  assert.match(setupSource, /The 20-number draw is ready/);
  assert.match(setupSource, /reviewed and frozen set of at least 20 questions/);
  assert.match(setupSource, /Open question workspace/);
  assert.match(questionWorkspaceSource, /<QuestionBuilder editable/);
  assert.match(questionWorkspaceSource, /Back to competition setup/);
  assert.match(builderSource, /not an approved frozen question bank/);
  assert.match(builderSource, /Tahqeeq will not silently shorten this question/);
  assert.match(previewSource, /Tap an ayah marker/);
  assert.match(previewSource, /loadQcfPageFont/);
});

test("judging hit targets remain disabled outside an active reciter session", () => {
  assert.match(mushafSource, /judgingEnabled = state\.sessionActive/);
  assert.match(mushafSource, /judgingEnabled && \(/);
  assert.match(mushafSource, /<div className="hit-layer">/);
  assert.match(mushafSource, /onPointerDown=\{judgingEnabled \? \(event\) => onPointerDown\(event, data\.page\) : undefined\}/);
  assert.match(idleSource, /Browse freely, or prepare a competition/);
});

test("the live handoff uses quiet status text and two focused screens", () => {
  assert.doesNotMatch(headerSource, /offline-dot|chip-dot/);
  assert.doesNotMatch(idleSource, /<i aria-hidden/);
  assert.match(headerSource, /Sample · \$\{competitionLifecycle\}/);
  assert.doesNotMatch(headerSource, /Test mode/);
  assert.doesNotMatch(idleSource, /Test mode|competition-state-label/);
  assert.match(appSource, /\? "is-idle" : ""/);
  assert.match(participantScreenSource, /Participant running order/);
  assert.match(participantScreenSource, /participantContextLabel/);
  assert.match(participantPresentationSource, /participant\.institution/);
  assert.match(participantScreenSource, /aria-expanded/);
  assert.match(questionScreenSource, /aria-label="Question numbers"/);
  assert.doesNotMatch(questionScreenSource, /Choose a number/);
  assert.doesNotMatch(questionScreenSource, /Ask the reciter to choose one available number/);
  // The dialog head already says what this screen is. The board must not say
  // it again: a grid of numbers is its own instruction.
  assert.doesNotMatch(questionScreenSource, /Ask the reciter to choose/);
});

test("a draw opens a locked, recoverable Prepared Mushaf before judging", () => {
  assert.match(appSource, /state\.preparedRecitation/);
  assert.match(appSource, /type: "BEGIN_RECITER"/);
  assert.match(appSource, /state\.activeSessionId \?\? state\.preparedRecitation\?\.id/);
  assert.match(preparedStripSource, /Change reciter/);
  assert.match(preparedStripSource, /Change question/);
  assert.doesNotMatch(preparedStripSource, /drawCycle|cycle/);
  assert.match(preparedSidebarSource, /Prepared on this device/);
  assert.match(preparedSidebarSource, /Ready · begin judging/);
  assert.match(preparedSidebarSource, /This confirms only this judge device/);
});

test("finishing a reciter moves directly to the next running-order choice", () => {
  assert.match(appSource, /const hasNextReciter = state\.roster\.some/);
  assert.match(appSource, /setStartOpen\(hasNextReciter\)/);
  assert.match(appSource, /Finish recitation/);
  assert.match(finishSource, /Save and select next reciter/);
});
