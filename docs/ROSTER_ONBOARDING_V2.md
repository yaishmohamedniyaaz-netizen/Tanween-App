# Roster Onboarding V2

Status: implemented in the August 2026 participant-onboarding release
Scope: draft competition participant preparation only

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
4. Desktop uses an aligned semantic grid. The participant name receives the
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

- `automatic`: the final row order produces `01–99`, then `001–999`;
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
- participant number, name, division ID, Muqarrar, phone, and institution;
- legacy age-group/category text when an older import cannot be mapped.

Issues are derived by the pure validator rather than saved. Back keeps the
draft, Discard requires confirmation, Apply clears it, and official start is
blocked while an unapplied draft remains.

A one-time `pre-roster-draft-v1` browser-state checkpoint is created before the
new state is normalized. The Git rollback baseline is
`checkpoint/pre-roster-onboarding-v2`.

## Entry workflows

### Enter in Tahqeeq

The organizer adds, duplicates, deletes, and moves rows. Move controls are
explicit rather than drag-only so automatic numbering works with keyboard and
touch input. Deleted rows offer Undo.

Fill empty cells can apply a default division, Muqarrar, or institution. It
never overwrites an existing value.

### Paste from Excel or Google Sheets

The user-initiated paste event supplies tabular text without a clipboard
permission request. Recognized headings map automatically. Headerless or
unusual tables expose an explicit column mapper before rows enter the draft.

The parser supports TSV/CSV delimiters, quoted cells, escaped quotes, and
multiline cells. Fully blank rows are ignored.

### Upload Excel or CSV

The Participants sheet is preferred; otherwise the first sheet is used.
Template V2 uses Division directly. Template V1 remains importable through its
Age Group and Category columns.

If workbook metadata reports an older division fingerprint, Tahqeeq keeps the
rows but warns the organizer to check the mapping. Missing and ambiguous
divisions block Apply instead of silently selecting a replacement.

## Competition Template V2

The template is generated from the active competition and numbering mode.

- Participants: the clean entry surface;
- Choices: exact Division and Muqarrar values;
- Instructions: competition identity, version, numbering rules, and the
  import/review sequence.

Automatic mode omits Participant Number. Supplied mode includes it first.
Workbook custom properties record the competition ID, template version,
numbering mode, and division fingerprint.

The current lazy SheetJS writer does not emit Excel data-validation rules. The
Choices sheet and Tahqeeq's own validator are therefore authoritative; the
release does not pretend spreadsheet dropdowns can guarantee correct imports.
This also protects against pasted or filled Excel cells bypassing validation.

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
- V1 age/category mapping and V2 division mapping;
- invalid imported rows retained with field issues;
- quoted/multiline spreadsheet paste;
- existing participant ID preservation;
- Template V2 sheet/header/choice/metadata read-back;
- refresh recovery, discard, apply comparison, and official-start blocking;
- desktop 1366×768 and 1024×768 layout;
- mobile 390×844 row cards and dialogs;
- full existing automated suite, TypeScript, production build, and browser
  console check.

## Deferred

- photo/OCR roster extraction;
- fuzzy institution merging;
- shareable registration forms and backend intake;
- live competition roster changes;
- the larger Competition setup accordion redesign.
