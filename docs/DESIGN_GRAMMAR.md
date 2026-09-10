# The Tahqeeq design grammar

The Mushaf view works. The setup screens do not, and the difference is not
taste — the Mushaf obeys rules, and the screens around it were each decided on
their own. This file states the rules already in force, so a new screen can be
**failed against them** rather than argued about.

Every rule below is one the app already keeps somewhere. None is invented here.

---

## 1. The page is the evidence. Everything else is chrome.

The recitation is the work; the interface is how a judge touches it. So the
Mushaf gets the room and the chrome gets out of the way — the rail is narrow,
the page is wide, and no panel competes with the text for the same region.

In the live workspace, the scorecard stays on the chosen outer edge before and
after a recitation begins. A two-page spread owns the remaining width, but its
shared page control also owns a small row between the top bar and the pages;
Fit accounts for that row instead of laying the control over Quran text, and
Fit is the smallest live size rather than one stop among smaller scales. A
temporary return-to-question control shares the same fixed row when the judge
has navigated outside the selected passage; appearing or disappearing must not
move the page selector or change the row's height. The spread uses a compact
4px outer rhythm around that row; the single-page marginalia remains untouched.

For the fixed-artwork integration (now the local app default), the accepted
replacement places that one compact selector separately above the pages, with
minimal spacing and no repeated page labels. Fit reserves its top row. This
supersedes the earlier bottom placement at the owner's request on September 10.
The score rail keeps its existing home; mobile return-to-question retains its
existing mobile control location. This replaces the historical top-row arrangement
above. The legacy renderer remains available through `fixedMushaf=0` for rollback
checks. Public release is separate from local default activation.

**Fails this rule:** a screen where the explanation is larger than the thing
being explained. The setup review carries 248 words to convey nine facts.

## 2. One thing has one home.

Adu / Raagu used to be a row in the score panel *and* a separate marking
panel, so a judge had to work out which one to touch. The panel was retired
and the row became the control. The pinpointed criteria never had this
problem: the page is the control and the row is the readout.

**Test:** can a judge point at exactly one place on screen for any given
decision? If two places both look responsible, one of them is wrong.

## 3. Colour is a verdict, and nothing else is coloured.

The stylesheet says it at the top: *near-monochrome; the category colours are
the only saturated things on screen.* Jalī is red, Khafī is amber, Faṣāḥa is
indigo, Adu / Raagu is teal. A colour appearing anywhere else is a false
signal.

Two bugs came from breaking this, both now fixed: holding a word washed it in
Faṣāḥa's exact indigo, so a word under the finger looked already marked; and
the mark bar, portalled out of its row, lost `--c` and rendered ink while its
own row read teal.

**Corollary for portals.** Custom properties inherit down the DOM, not the
React tree. Any control rendered through `createPortal` must be handed its
category explicitly, or it will silently lose its meaning.

## 4. A considered action costs one deliberate gesture.

Press, drag, release — the letter tray, the mark bar, the category pills all
speak it. Nothing commits until the press ends, so a gesture that lands wrong
is corrected without lifting, and the ledger gets **one event per gesture**
rather than one per twitch.

A control that needs 26 presses to reach a value is a control for correcting a
number, not for entering one. That is what retired the stepper.

## 5. Nothing is ever set by accident.

The wheel adjusts a mark only after the control has been focused on purpose,
never on hover — the same reason Firefox disabled wheel-on-number-input
outright. Destructive actions sit away from the ones next to them. A tray
never survives navigation.

## 6. Say it once.

The dialog head and the number board both explained that the reciter picks a
number: four lines of instruction above a grid of numbers that needs none. A
grid of numbers is its own instruction.

A division named "Under 14 · Hifz" does not also need its category appended;
that is how rows came to read `Hifz · Hifz`.

**Test:** delete every sentence that repeats what the controls already show.
If the screen still works, the sentence was decoration.

## 7. Nothing is unreachable.

The reciter dialog clipped its own tail with `overflow: hidden` and no
scroller, so the last row of the reciter queue and the external-question link
did not exist as far as a judge was concerned.

**Test, and it is mechanical:** for every element, if `scrollHeight >
clientHeight` and `overflow-y` is not `auto` or `scroll`, that content is
unreachable. Run it at 1400×900, 1280×800 and 1024×768.

## 8. The scale is fixed. Do not nudge.

Type: `--t-micro 12` · `--t-small 14` · `--t-body 15` · `--t-lead 17` ·
`--t-title 21` · `--t-display 27`. Whole pixels only. The half-pixel sizes
these replaced came from nudging individual screens until each looked right,
which is exactly why no two agreed.

Space is the 4px grid, `--sp-1` through `--sp-7`. Radii are 8 / 12 / 20.
Anything a judge reads mid-recitation starts at `--t-small`; `--t-micro` is
the floor anywhere.

## 9. Contrast is a measured number, not a look.

`--ink-3` is `#6a6a73`: 5.35:1 on surface, 4.74:1 on bg. It replaced `#9b9ba3`
at 2.76:1 — roughly half what WCAG AA asks of body text, while carrying most
of the secondary text in the app. Secondary does not mean unreadable.

## 10. A control pressed during a live recitation is at least 44px.

`--tap: 44px`. A judge is listening to a person recite; they cannot also be
aiming. This is why twenty square number tiles were wrong for a different
reason than being too tall — and why the ruler strip's 12px ticks survive only
because the drag gesture covers them.

---

---

## One open violation, recorded so it is not re-derived

Rule 7 has a sibling the app does not yet keep: **a screen should fit the
window it is given.** The shell never quite does.

Measured at 1400×900 on the landing view:

| | px |
| --- | --- |
| Sticky header | 63 |
| Workspace padding (24 top + 24 bottom) | 48 |
| Stage content | 804 |
| **Total** | **915** against a 900 viewport |

So the overflow is 15px at 1400×900, 37px at 1280×800 and 69px at 1024×768.
The page *can* be scrolled — this is not unreachable content, and an early
sweep that called it unreachable was wrong — but a settings screen that a
judge must scroll to see whole is the complaint that started this work.

The cause is structural, not cosmetic: `.app` is `min-height: 100vh` with a
sticky header above an intrinsically-sized stage, so the stage never learns
that it has only 789px to live in. Fixing it means deciding who owns the
viewport height — the shell or the Mushaf's own `.mushaf-scroll` — which is a
design decision, not a patch. It belongs to the setup-flow work, where the
target is: **the whole setup flow fits 1024×768 with no page scroll.**

## How to use this

Mobile fixed-Mushaf exception: in portrait prepared/live judging, the shared
page selector sits below the paper with a 44px hit area. Desktop and landscape
retain navigation above it. Compact only added paper margins, never the
religious artwork; fit the entire page and label constrained zoom honestly.
In that portrait scope, 100% Fit means the largest complete page after reserving
the deliberate top gap and navigation touch row, not the old layout's base size.
Retain the phone's safe area when removing decorative dock padding.

When proposing a screen, state which rules it keeps and which it bends, and
why. A bend needs a reason in one sentence; a rule broken silently is a bug.

When comparing designs, measure rather than argue: **clicks to complete, words
on screen, height at 1024×768, count of targets under 44px, and unreachable
regions.** Those five numbers decided the mark bar, and they were right.

Confidence is a gate, not decoration. Score **practicality, architecture/data
safety, and visual certainty** separately. A score of 85 or more may proceed
after its named checks; 70-84 needs a focused prototype or more evidence;
below 70 must be narrowed, deferred, or rejected transparently. Browser proof
and explicit visual approval are still required for visible UI work: neither a
high score nor a passing test suite can substitute for seeing the result.
