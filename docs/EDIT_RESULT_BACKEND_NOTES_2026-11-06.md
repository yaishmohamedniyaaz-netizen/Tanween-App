# "Edit result": what the code already does, and what a backend must add

Status: notes for the owner and the backend developer (6 November 2026).
Plan only; no code changed. Decision record: `UNDECIDED_DECISIONS.md`, item 34.

## What already exists (checked in the source)

- **Every judge record is a list of events** (mistake added, mistake removed,
  note changed, session finalized ...). The score is rebuilt from the events,
  so history is never overwritten. (`src/lib/resultPackages.ts`)
- **A judge can already reopen a finished record.** Reopening writes a
  `session_reopened` event with a reason, and the record gets a new revision
  number. (`resultPackages.ts`, `competitionResults.ts`)
- **A final result remembers which revision it used.** If a judge record later
  gets a newer revision, the Results screen reports
  `final-source-revision-changed` and the result must be finalized again.
  (`src/lib/resultsReview.ts`, `src/lib/finalResults.ts`)
- **Final results have their own revision number** and an optional reason.
  (`finalResults.ts`)
- **Records live on each device** and move between devices as exported files
  (judge result packages). There is no server yet.

So the owner's current leaning (save writes a new judge revision, the old one
is kept, an Official result must be finalized again) fits the existing design:
"Edit result" is close to "reopen the judge record, change marks, finish
again", started from the Results screen instead of the judge screen.

## What is new work

| Need | Why it is new | Size |
| --- | --- | --- |
| Start an edit from the Results screen | Today only the judge screen reopens a record | Small: reuse reopen, new entry point |
| "Only the responsible judge may edit" | Needs to know *who* is using the device. Today a judge seat is chosen on the device, not proven by a login | Needs sign-in (backend) |
| Old revisions visible to that judge and the organiser only | Needs roles and access rules | Backend |
| Reason not asked | Today `session_reopened` stores a reason (may be empty) | Tiny: allow an empty reason |
| Delete recordings after the appeal period, period as a setting | Recordings are stored per device; deletion must reach every copy | Backend + device clean-up |
| Two devices with different versions | With files there is no single "latest"; a server must order revisions | Backend |

## Open questions, with options

**1. Responsible judge is absent**

| Option | Fairness | Simplicity | Score /10 |
| --- | --- | --- | --- |
| Organiser may edit, a reason is required, the judge is told | Good: clear audit | Medium | 8 |
| Nobody may edit; the result stays as is | Strict, may block a fix | Simple | 6 |
| Another judge of the same criterion may edit with a reason | Spreads trust | Medium | 5 |

**2. Which copy wins when two devices disagree** (only matters once there is
a server)

| Option | Score /10 | Note |
| --- | --- | --- |
| Server accepts a save only if it builds on the latest revision; otherwise the judge must reload | 9 | The app already uses this rule for its local storage ("stale checkpoint") |
| Newest save wins | 4 | Simple, but can silently drop marks |
| Keep both and ask the organiser | 6 | Safe, slower |

**3. Appeal period length**: a competition setting (for example 7, 14 or
30 days). No technical limit; it only sets when recordings are deleted.

## Questions for the backend developer

1. Sign-in for judges and organisers: which method, and does a judge seat
   become an account?
2. Where events are stored and how revisions are numbered on the server.
3. How recordings are uploaded, kept and deleted after the appeal period.
4. Offline first: how a device that was offline sends its events later.

Sources: repository files named above. Data protection context in item 34
(Maldives Personal Data Protection Bill, 22 June 2026).
