# Muttasil undecided decisions

Last reviewed: 17 September 2026

Muttasil is the teaching twin of Tanween. This file holds only the choices that
still need a human answer. Confirmed rules belong in the brand standards or the
design grammar, not here. It follows the shape of
[`UNDECIDED_DECISIONS.md`](UNDECIDED_DECISIONS.md): current proposal, proposed
default, decision needed.

Per [`AGENTS.md`](../AGENTS.md), a proposal in this file is not a rule. Nothing
below has been implemented.

## Identity

1. **The mark**
   - Five candidates were cut with Tanween's own pen (nib `(-2.12, 10.34)`,
     strokes at 40°, the same 58 × 14 letter line) and compared on a 12 to 32px
     ladder.
   - Ruled out on evidence: the shadda closes its counters at 16px; the waṣl
     shuts its counter and reads as a Latin C; the kashida is the Tanween mark
     with a gap in it at favicon size.
   - Current proposal: **A2, the maddah**, one swept stroke, height 37 units
     against the parent's 44.71.
   - Alternative held open: **A1**, the tanween stroke that is never stopped,
     whose metrics match the parent exactly but which is an abstraction rather
     than a mark from the page.
   - Decision needed: A1 or A2.

2. **The wordmark face**
   - Tanween's wordmark is Platypi 600, supplied as outlines, and its standards
     say Platypi appears nowhere else.
   - Proposed default: Muttasil shares the face, so the family reads as one
     studio and differs only by the mark.
   - Decision needed: shared face, or its own.

3. **Romanisation**
   - Proposed default: `Muttasil`, no diacritics, matching Tanween's own choice
     to drop the macron from tanwīn.
   - Decision needed: confirm, and confirm whether the Arabic متصل appears in
     the lockup.

## Colour

4. **The colour law** — the largest open question
   - Tanween's law: colour is a verdict, and the four criteria colours are the
     only saturated things on screen.
   - Three laws were drawn on the student board with identical data:
     - **A, one accent.** Colour marks what is *right*. Mastery runs on one hue
       at four lightnesses, using the green Tanween does not need in a lesson,
       since Adu / Raagu is a competition impression criterion. Survives a
       red-green reader and a photocopier.
     - **B, pure ink.** No hue at all. Most faithful to the parent, and unable
       to separate *solid* from *not yet heard* at a glance.
     - **C, the criteria colours reused for weakness.** Red then means both
       *weak letter* and *Laḥn Jalī*, amber both *developing* and *Khafī*.
   - Current proposal: A.
   - Decision needed: which law, and whether the criteria colours appear at all
     outside a live marking session.

5. **Adu / Raagu's green**
   - If law A is chosen, `#377b60` carries mastery in Muttasil while still
     meaning voice and melody in Tanween.
   - Decision needed: is one hue meaning two things across two products
     acceptable, given they are never on screen together?

## The session

6. **Naming a fault**
   - The governing constraint: a teacher is listening to a child. Past roughly
     two seconds, naming stops happening and the record dies.
   - Three versions drawn: a sheet (3 taps, 3 to 4 seconds); one unbroken
     gesture with three fault pills (1 tap, under a second, but three pills
     cannot hold the taxonomy); and mark-now-name-later, where one press records
     the letter and the taxonomy is triaged while the student repeats.
   - Current proposal: mark now, name later, with the one-gesture pills
     available for the three commonest families.
   - Decision needed: confirm, and decide what a mark with no fault name yet is
     called in the record.

7. **The fault taxonomy itself**
   - Not yet written. Roughly 25 to 40 named faults grouped by makhraj, sifah,
     madd and tajweed rule.
   - Each entry needs two strings: a teacher-facing name and a parent-facing
     sentence, because the export carries both.
   - Decision needed: the list, which is content work rather than engineering,
     and who is qualified to approve it.

8. **The dock**
   - A lesson has no score, so Tanween's 99px dock has little to hold.
   - Measured on a 390 × 844 phone: with the dock the page is height-limited at
     344px wide; without it the page is width-limited at 382px, which is 23%
     more page area with 37px still spare.
   - Current proposal: no dock; Undo floats over the page and fades.
   - Decision needed: confirm, and decide whether Undo fades on a timer as
     Tanween's last-action strip does at 5s.

## Students and groups

9. **How groups hold students**
   - Settled in principle: students are flat records and groups reference them,
     so a student in a private class and a Friday group is two references rather
     than two records or a wrong home.
   - Three presentations drawn: nested list (2 taps, 87 words), one list with
     group chips (1 tap, 41 words), group cards whose subtitle is the members'
     names (2 taps, 64 words).
   - Current proposal: group cards, because the card subtitle answers the
     one-glance requirement literally.
   - Decision needed: which presentation, and whether a group is ever the unit
     of a session or always N parallel student sessions.

## Inherited problems Muttasil should not repeat

These are recorded in Tanween's own documents and were designed out of the
mockups rather than inherited. They need confirming, not deciding.

10. **Touch targets.** Tanween's calibrated page navigation measures 29 × 37 and
    26 × 37 against its own 44px rule, and item 29 of
    [`UNDECIDED_DECISIONS.md`](UNDECIDED_DECISIONS.md) is explicit that this must
    not become a production exception without a touch-safe comparison. Every
    control in the Muttasil mockups is 44px or larger.
11. **No instruction on a phone.** `MarkingCoachTip` is hidden below 900px, so a
    phone judge gets no instruction for the core gesture. The mockups carry a
    standing hint line during a session.
12. **Inert zoom.** Calibrated mobile fit makes base equal maximum, so the size
    control can only report "Fitted". Unresolved for Muttasil.
