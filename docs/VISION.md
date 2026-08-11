# Recitation Judging Tool — Raw Vision and Notes

> Historical note: this is the original raw vision, not the current product
> contract. The research-backed decisions, current architecture gaps, and phased
> delivery plan are in [`PRODUCT_FOUNDATION.md`](./PRODUCT_FOUNDATION.md).

## The basic idea
A web app for judging Quran recitation competitions. Web, not local. Today the process is
analog: judges tally marks by hand. E.g. Lahn Jali might be 30 marks, and the judge
reduces marks one by one as the reciter makes mistakes.

## How judging works now
Sometimes each judge has a separate allocation (one does Lahn Jali, another Lahn Khafi,
another Fasaha, another voice & melody; international comps may add Waqf & Ibtida). For
regular competitions it's usually Lahn Jali, Lahn Khafi, Fasaha, and voice & melody, done
by one person, or two people each doing all three major categories.

Existing software mostly only does plus/minus deductions (no slider), often with question
banks (each participant has a number, picks randomly, recites what they pick).

Big vs small mistakes is mostly universal/agreed; rarely a judge is stricter about whether
a letter counts. The real problem is **transparency** — judging isn't accountable. Even a
strong judge may be inconsistent. There must be accountability, kept within the system
(not public, to avoid outrage).

## What this app does differently
- Gradual deduction with **per-competition increments** (e.g. 2 marks for Lahn Jali,
  adjustable), not just plus/minus.
- The big difference is **pinpointing**: point at the actual mistake on the page. This may
  multiply the value of each competition tenfold — mistakes no longer live only in the
  judge's head.

## Why it matters
The point of competing / reciting before a teacher is to be corrected. If a mistake is
just a fleeting moment with no record, long-standing mistakes persist. Many kids never get
them addressed. The system has to mean something. Reviewable accuracy exposes weak judges,
creates accountability (they must say which parts were mistakes), and helps good judges
teach better. Weak judges who pretend get phased out.

## The interface — how you mark
Ideally a pen: point at an Arabic letter, press and hold, a drop-down opens, drag down and
release to enter the mistake. The menu should feel like a pill that drags down. Very
modern UI, not outdated. Menu order can be prioritised by most common mistakes (AI-ordered
later, decided in beta). Finite set of mistakes; in the Maldives similar mistakes repeat.

Mouse support needed (can't assume tablets). First prototype is mouse, desktop-first; same
gesture with the mouse. Tablet/pen later.

## Mushaf page and hitboxes
The page should look like a normal mushaf. Tarteel.ai mushaf pages are available
open-source; KFGQPC Uthmanic Hafs works. "Hitbox" = the page looks normal but every
letter, tashkeel, sukun, madd, ghunna, end-of-ayah is its own press target (click, hold,
menu, drag, release). Tarteel has word-by-word selections but nothing letter-by-letter;
also need secondary marks (Mudd, Hamzatul Wasl) pressable/draggable.

Hitboxes must be consistent → done by computer, once, not by hand each time, and without
wasting AI tokens. First test on very short surahs: Al-Ikhlas, Al-Falaq, An-Nas, laid out
like a real mushaf page.

## Categories and source
Menu (for now) = scoring categories: Lahn Jali, Lahn Khafi, Fasaha. Later, when one person
judges multiple categories, the drag can go deeper (Jali → which letter, frequent swaps
first, full letter table below → release). Authoritative tajweed source for separating
Lahnul Jali from Lahnul Khafi: Ibn al-Jazari (classical), al-Marsafi's Hidayat al-Qari
(modern comprehensive); the Jali/Khafi distinction is settled across the tradition.

Fasaha = e.g. a letter stressed too much; cut under Fasaha, not Khafi. Not judged on every
part. Can be a notes section like voice & melody — one box for now where the judge writes a
note. Judge decides Jali vs Khafi for now; system guidance is a later layer.

## Data and accountability
Track mistakes by atoll / island / Quran class with real statistics — teachers'
limitations mean the same mistakes repeat, so the problem becomes visible and solvable.
Accountability stays within the system, not public.

## Design feel
Really clean, not AI-looking. Swiss cleanliness but not Swiss-minimal. Stripe / Apple /
top startups with animated sites; Anthropic-level design. Simplicity as mastery.

## Money and scale
Small admin fee (~1000–1500 rupees per competition); adaptable globally.

## First vs later
**First prototype:** single judge; desktop + mouse first; the three surahs (Al-Ikhlas,
Al-Falaq, An-Nas) on a real mushaf page; every letter and mark pressable;
press-hold-drag-release; the categories; live scores + mistake log together; one notes box
for Fasaha and voice & melody. It records what the judge calls; it does not detect
correctness.

**Later:** statistics/accountability across islands & classes; multiple judges; Jali/Khafi
guidance layer; deeper mistake-type capture per category; AI-ordered mistake menu; full
mushaf coverage; tablet and pen.

## Still open
- Image of the real Tarteel mushaf page vs rendered KFGQPC text that looks like the mushaf.
  (Resolved in build: rendered font — see PROGRESS.md.)
- The full interface, to design and brainstorm further.
