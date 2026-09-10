# Timing tools extraction — 2026-09-10

Implemented locally in the fixed-Mushaf replay integration branch. Not committed, pushed or published. Combined visual review is deferred until publication at the owner's request.

## Scope

Retained the existing media element, decoder, timing values, revision/conflict persistence and analysis cancellation. Replaced the embedded timing accordion with a native modal dialog, following the app's native-dialog approach. The existing transport is portalled into the dialog while it is open; no second audio element or mobile state copy exists. Legacy non-embedded review retains its inline editor.

The dialog has a visible Close, native Escape handling and focus containment, and returns focus to Timing tools. Header and playback remain outside the editor's scrolling content. Source label and recording part remain visible in the editor. Source switching stays outside and is inert while the modal is open.

Opening and closing pause and cancel normal playback; closing cancels experimental analysis and never resumes. Word changes inside timing tools use a separate selection-only callback, not word-tap autoplay. Normal replay still continues; the specialist bounded action is explicitly named Preview short interval.

Boundary edits mark an unsaved draft. Word/scope/occurrence changes are disabled until save or explicit discard. Close/Escape offers Keep editing or Discard changes in the same dialog, not a nested modal. Discard restores the pre-edit boundaries. Successful revision persistence clears the dirty state; conflicts/failures retain the draft. Original recordings, scores and judge records are unchanged.

## Checks

- Production build passed, with existing bundle-size warning.
- Main tests: 380 passed, one optional asset skip. Focused results/replay/dialog tests: 57 passed. Dialog source tests verify wiring, not native-device accessibility.
- In-app Chromium: native modal confirmed; one audio element and one transport inside it.
- Edited start boundary to 0.25; Close offered discard, Keep editing retained the draft; Escape offered discard; discarding and reopening restored 0.00. No timing revision was saved during browser QA.
- Closing during playback left the audio paused and restored focus to Timing tools.
- Desktop and approximately 393x852 compact views inspected; compact dark and light themes inspected. No horizontal overflow in the checked compact dialog. Header and transport stayed visible while editor content scrolled.
- Full save/conflict race coverage, physical iPhone/Safari/PWA, VoiceOver, enlarged-text and complete viewport matrix remain part of combined release acceptance; not claimed complete here.

Confidence: practicality 93/100, architecture/data safety 92/100, visual certainty 83/100 pending combined owner/device review.
