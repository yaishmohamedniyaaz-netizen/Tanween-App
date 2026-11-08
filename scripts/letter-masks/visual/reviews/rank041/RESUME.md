# Cloud continuation: owned ranks 040-070

Stopped on the owner request to transfer to cloud. No commit, push, hidden-test scoring, app changes, or global rebuild was performed by this continuation.

## Saved state
- Rank040: **174 unique accepted visual guesses / 174 eligible words**, complete. Includes 99 newly saved decisions after the prior 75. Original sheets06-19, all resulting shaded self-checks and carry sheets were actually opened. Batch006-008 use worker39_70.py; batches009,011,014,017 use worker40_70.py. Current annotations/rank040.jsonl has no duplicates and all spans are at least2px and within ceil/floor immutable boxes.
- Rank040 partial clipping is flagged low. Five prior medium records with reviewFlags were archived in rank040/superseded-confidence.jsonl and lowered to low. New clipped records are flagged low. These are guesses, not owner approvals.
- Rank041: **90 unique accepted visual guesses / 174 eligible words**. All accepted records passed 7-border count, >=2px widths, and immutable-box structural checks.
- Rank041 original representative sheets01-04 were actually opened. Sheets01-02: all shaded checks AND every carry sheet were actually opened, with 78 accepted decisions. Initial sin-mim cuts were refined after self-check; all changed representatives and carries were actually re-opened. Archive batch001 is superseded by batch101 for first six clusters; batch002 is the second six clusters. Superseded current decisions are archived in superseded-decisions.jsonl. sheet02-pass1 preserves the unaccepted first-pass pictures and audit.
- Rank041 original sheets03-04: all12 representatives and both shaded representative-check sheets were actually opened. These12 reps are accepted in batch-003-partial, bringing total to90. Open-mim clusters c0015/c0021 are low confidence.
- **Current rank041 member-check-01.png and member-check-02.png (30 copies) have NOT been viewed.** They are pending drafts, not accepted. draft-decisions.json contains42 decisions:12 accepted reps plus30 pending copies. batch-003-partial/state.json lists exact IDs.
- Ranks042-070: this continuation did not initialize, view, or annotate them. Do not infer existing files elsewhere are this worker's work.

## Next action
1. Open both current rank041 member-check sheets, inspect every carried word. Archive and audit these actual views. Save only those visually checked copies; corrections require original inspection, manual cuts, shaded self-check and actual re-view.
2. Continue rank041 at original representatives-05.png through12.png. No originals beyond04 have been viewed.
3. Continue ranks042-070, then stop. Do not read hidden approvals or evaluate the hidden test, commit, or push.

## Helpers and constraints
- Local Python: ../letter-borders-all-pages/.venv-letter-borders/Scripts/python.exe. Cloud must supply numpy/Pillow/scipy and adapt Windows Arial/GDI label rendering paths in renderer if needed, without changing Quran assets or targets.
- worker40_70.py prepare RANK '[SHEET_NUMBERS]' '[[MANUAL INNER CUTS],...]' CONFIDENCE 'NOTE' is called only AFTER actually viewing those original sheets. It logs exact original views, builds draft reps/copies using annotation_grouping.py and restores cumulative manual-cuts.json.
- worker40_70.py accept RANK UNIQUE_BATCH_NUMBER must be called only AFTER actually viewing EVERY sheet in current review-sheets.json. It archives pictures, records audit path/IDs/observer/hash, validates box/spans and writes unique current annotations. It archives superseded decisions when replacing. For current partial batch do not re-use batch003-partial path; after both pending member sheets viewed, accept e.g.batch003 will harmlessly retain already-saved reps but would log fresh views of all sheets, so first re-open both rep checks OR manually save/audit only pending member sheets.
- Archived originals and selfchecks are evidence; rendered files do not count as viewed.
- Helper/init excludes hidden IDs; no hidden truth read. Faint rejected-round reference is immutable base2837f6f.
- Borders use exact app target count; all spans>=2px; all cuts within ceil/floor immutable word boxes. Partial clipped body ink => low plus reviewFlags. Entire missing target => withhold in pending-owner.json with actual image evidence; never invent a slot.
- Save one current decision per word in annotations/rankNNN.jsonl. Do not change src/, Quran artwork/page data, approved border files, or other workers' ranks/global progress.
