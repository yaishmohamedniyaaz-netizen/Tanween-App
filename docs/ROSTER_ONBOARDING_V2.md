# Roster Onboarding V2 with V5 fast entry

Status: implemented in the August 2026 participant-onboarding release
Scope: draft competition participant preparation only

The V3 follow-up changed participant-facing language from Division to Category
and from Muqarrar to Muqarrar start. V5 adds competition presets, faster
category-level entry, grouped import resolution, and a visually structured
Excel template with native dropdowns. Internal `divisionId` and `muqarrar`
properties remain stable so saved competitions, questions, and results do not
need a destructive migration.

## Product outcome

Tahqeeq now has one participant-list workspace. Manual entry, spreadsheet
paste, Excel/CSV upload, and editing an applied roster all enter the same
recoverable draft before the official roster changes.

The release deliberately does not include OCR or photo extraction. A checked
spreadsheet is faster to verify, preserves the organizer's existing workflow,
and avoids introducing uncertain name/number recognition into competition
identity data.

## Visual hierarchy

The editor is a separate full-width workspace instead of a wide table placed
inside the narrow Competition setup card.

1. The sticky header identifies the competition, shows device-local save
   status, and keeps the final review action available.
2. One compact summary bar shows participant, error, warning, and source
   counts. Errors are visible without dominating clean rows.
3. Numbering and source actions share one toolbar. Automatic/Supplied is a
   two-state control rather than a settings form.
4. Desktop uses an aligned semantic grid grouped into collapsible Category
   sections. The participant name receives the
   most space; the generated number remains compact and centred.
5. At narrow widths, each row becomes a labelled card. Controls remain at
   least 44px high and the action order stays Move up, Move down, Duplicate,
   Delete.
6. The review action sits in a floating footer so a long roster never requires
   returning to the top.

The palette stays near-monochrome. Red is reserved for blocking fields, amber
for optional warnings or an older template fingerprint, and green for saved or
ready status. Validation never relies on colour alone.

## Numbering contract

`CompetitionConfig.participantNumbering` is either:

- `automatic`: the final row order produces `01–99`, then continues naturally at `100`;
- `supplied`: the participant number is editable, required, and unique without
  regard to letter case.

New competitions default to automatic numbering. Existing saved competitions
without the field normalize to supplied numbering so their visible identity is
not rewritten. The sample competition also stays supplied.

Numbers are generated only when the organizer applies the draft. Historical
and live competition records are never renumbered.

## Recoverable draft contract

`JudgingState.rosterDraft` is device-local preparation data and is never copied
into a live competition snapshot. Raw strings are retained intentionally:
invalid imported rows remain editable instead of being discarded.

Every draft row stores:

- a draft-only row ID;
- an existing participant ID when editing an applied roster;
- its source row when known;
- participant number, name, internal category reference, Muqarrar start, phone,
  and institution;
- legacy age-group/category text when an older import cannot be mapped.

Issues are derived by the pure validator rather than saved. Back keeps the
draft, Discard requires confirmation, Apply clears it, and official start is
blocked while an unapplied draft remains.

A one-time `pre-roster-draft-v1` browser-state checkpoint is created before the
new state is normalized. The Git rollback baseline is
`checkpoint/pre-roster-onboarding-v2`. The V4 presentation and intake pass can
also return to `checkpoint/pre-participant-intake-v4`.

## Entry workflows

### Enter in Tahqeeq

The organizer adds, duplicates, deletes, and moves rows. Every Category header
has its own Add participant action. Add participant like creates a blank-name
row that retains the current Category, Muqarrar start, and institution rather
than copying another person's identity fields. Move controls are explicit
rather than drag-only so automatic numbering works with keyboard and touch
input. Deleted rows offer Undo.

Competition setup stores a small, competition-specific institution choice list
and optional default Muqarrar start and institution values. These values are
suggestions, not locked fields; free-text institutions remain accepted. New
rows inherit only explicit defaults. Fill empty cells can apply a default
Category, Muqarrar start, or institution to all rows or one Category. It never
overwrites an existing value.

### Paste from Excel or Google Sheets

The user-initiated paste event supplies tabular text without a clipboard
permission request. Recognized headings map automatically. Headerless or
unusual tables expose an explicit column mapper before rows enter the draft.

The parser supports TSV/CSV delimiters, quoted cells, escaped quotes, and
multiline cells. Fully blank rows are ignored.

### Upload Excel or CSV

The Participants sheet is preferred; otherwise the first sheet is used.
Template V3 uses Category and Muqarrar start directly. Template V2 Division and
Muqarrar headers remain importable. Template V1 also remains importable through
its Age Group and Category columns.

If workbook metadata reports an older category fingerprint, Tahqeeq keeps the
rows but warns the organizer to check the mapping. Missing and ambiguous
categories block Apply instead of silently selecting a replacement.

Repeated unmatched Category text is grouped in Resolve categories once. The
organizer explicitly maps one raw label to a current Category and confirms the
change; every row with the same normalized raw value updates together. There is
no fuzzy auto-merge, so a plausible-looking label cannot silently move several
participants into the wrong Category.

## Competition Template V5

The template is generated from the active competition, numbering mode, and the
organizer's column choices.

- Participants: 100 compact, visibly bordered prepared rows with a frozen
  heading row, filtering, familiar spreadsheet gridlines, practical widths,
  text-safe number and phone columns, dark text on restrained pastel header
  groups, and concise Required/Optional notes;
- Choices: exact Category and Muqarrar start values plus competition-specific
  institution suggestions;
- Instructions: competition identity, version, numbering rules, and the
  import/review sequence.

Automatic mode omits Participant Number. Supplied mode includes it first.
Name, Category, and Muqarrar start are always included. The download dialog
includes Institution by default and leaves Phone Number off by default; either
stored optional field can be included or removed without shifting the required
dropdowns. Institution has a non-blocking dropdown when selected, so a new
school, class, or independent entry can still be typed. Spreadsheet
validation helps entry but Tahqeeq's review remains authoritative because
pasted cells and third-party spreadsheet tools can bypass it.

Workbook custom properties and the very-hidden `_Tahqeeq` sheet record the
competition ID, template version, numbering mode, selected columns, and category fingerprint.
The legacy division-fingerprint value is also emitted for older Tahqeeq builds.
V4, V3, V2, and V1 files remain importable, and the 99 unused prepared rows do
not become empty participants when a completed V5 file is uploaded.

Feshey kolhu and Nimey kolhu remain explicit enum values, not Boolean
`true`/`false`. The participant editor presents them as a two-option radio
control. A blank value must remain distinguishable for validation, and question
preparation also has an Either start state.

## Category accordions

The roster editor groups rows by their mapped participant Category. The first
category and every category containing a blocking issue opens automatically.
Category required stays open until its rows are fixed. Organizers can expand or
collapse all valid sections, and row movement stays scoped to the current
category so the visible action never moves an unseen participant.

The competition-day participant selector opens only the active category,
closes categories with nobody waiting, and temporarily opens matching groups
while searching. Search totals describe the complete category even though the
recommended participant is presented separately above the list.

## Apply and identity safety

The final dialog shows current and new counts plus added, edited, and removed
participants. It also names the numbering mode and any remaining optional
warnings.

Existing participant IDs are retained when their applied row is edited. New
file or paste rows receive IDs only from their final normalized identity.
Apply is one reducer action: it changes numbering mode and roster together,
bumps the competition setup revision once, and clears the draft.

Roster changes remain forbidden during Prepared, active judging, live, and
closed competition states.

## Verification gates

- automatic numbering at 1, 8, 99, and 100 participants;
- case-insensitive duplicate supplied numbers;
- V1 age/category mapping plus V2 Division and V3/V4 Category mapping;
- invalid imported rows retained with field issues;
- quoted/multiline spreadsheet paste;
- existing participant ID preservation;
- Template V5 default and selectable-column sheet/header/style/dropdown/choice/metadata read-back;
- completed V5 prepared-row import with blank prepared rows ignored;
- stored entry preset normalization and scoped fill-without-overwrite;
- grouped identical imported-Category resolution;
- refresh recovery, discard, apply comparison, and official-start blocking;
- desktop 1366×768 and 1024×768 layout;
- mobile 390×844 row cards and dialogs;
- full existing automated suite, TypeScript, production build, and browser
  console check.

## Deferred

- photo/OCR roster extraction;
- fuzzy institution merging;
- shareable registration forms and backend intake;
- live competition roster changes.
