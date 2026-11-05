# Review of `claude/judging-final-polish` before merge (6 November 2026)

Two separate review passes read the branch's logic changes against `main`
(not the CSS). Each finding was checked again before fixing.

## Fixed on the branch

| # | Problem | Severity | Commit |
| --- | --- | --- | --- |
| 1 | Bismillah/Isti'adhah marks saved on `main` (rule 2.0.0) would fail to load or save after this branch's rule change to 4.0.0 | High: saved sessions and judge files | `35c089e` |
| 2 | Page finder: an exact Arabic name did not come first, so Enter opened the wrong surah ("الحج" opened Al-Hijr, "ق" opened Al-Baqarah) | Medium | `21350de` |
| 3 | Page finder: "Al-Anbiya", "kauthar", "kawsar", "lahab", "page 50", Persian digits found nothing | Low | `21350de` |
| 4 | The prepared (Ready) reciter could be marked "Not here" in change-reciter mode, then judged | Medium | `a8efcaf` |
| 5 | After a hold on − or + that ended off the button, the next keyboard press on the stepper did nothing | Low | `27254e9` |

Checks: for 1, letters under 2.0.0 and 4.0.0 were compared on all 77,881
Quran words and 12 phrase words (identical). For 2, every one of the 114
Arabic and Latin names now finds its own surah first. All tests pass
(481 tests).

## Not changed (owner choice or visible change)

- **Letter bar past the word box:** 3 of 509 approved letters, up to about
  4 px on desktop. Proposed: clip the bar to the word box.
- **Word-count circle:** it grew from 12 to 16 units, so its tap area now
  covers a little more of the neighbouring word and the line above (about
  2-3 units more). The tap area matches what is drawn. Keep, or shrink the
  tap area only?
- **Results filter:** when the Official or Absent count drops to 0 while its
  filter is on, the filter button disappears but stays applied ("No
  participants match"; "Clear filters" still works). Minor.
- **3.0.0 audit status:** marks saved under the merged rule 3.0.0 would be
  labelled "exact" after moving to 4.0.0. 3.0.0 was never released, so no
  real record has it.

## Checked and found correct

Finish dialog waits for the save and blocks double clicks; save failure
keeps the recovery controls; question preparation cannot run twice; the
"Opening question" state cannot hang; result status matches the results
rows; silent-letter flags on all 604 pages; letter ids unchanged by the
silent flag; tray display changes never reach stored data.
