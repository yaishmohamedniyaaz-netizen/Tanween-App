# Undecided decisions

Last reviewed: 21 August 2026

This file contains only decisions that still need a human answer. Confirmed
product rules belong in `PRODUCT_FOUNDATION.md`, not here.

## Questions and scoring

1. **Final printed line**
   - Current proposal: a target such as seven lines continues to the first ayah
     ending on or after the seventh printed recitation line.
   - Proposed default: show the complete ending ayah, but do not deduct marks
     for mistakes on its final printed line.
   - Decision needed: does "final line" mean the last printed line only, or the
     complete ending ayah? May each competition include that area in scoring?

2. **How the first printed line counts**
   - Confirmed: a question starts at the beginning of an ayah, even when that
     ayah begins partway through a printed Mushaf line.
   - Proposed default: count the printed line containing that starting ayah as
     line one.
   - Decision needed: confirm this for every competition or allow it to vary.

3. **Maximum extension after the target line**
   - Confirmed rule: continue to the first complete ayah ending at or after the
     target printed line.
   - Corpus finding: a few starts extend much further than line eight.
   - Decision needed: always accept the first ending, or make starts exceeding
     a configured maximum ineligible?

4. **Not enough lines before the Quran ends**
   - Corpus finding: the final eight ayahs do not have seven printed recitation
     lines remaining.
   - Decision needed: exclude them as starting points, allow a reviewed shorter
     question, or use a different rule for short final surahs?

5. **Non-repetition**
   - Current proposal: do not repeat a question within one participant's draw.
   - Decision needed: must questions also remain unused across a division,
     round, day, venue, or the whole competition?

6. **Question approval**
   - Decision needed: which role may approve a question for official use?
   - Decision needed: does one approval suffice, or do important competitions
     require two reviewers?

7. **First official question pool**
   - Decision needed: how many manually reviewed questions are required per
     division before random drawing is enabled?

## Participant display

8. **Hifz display**
   - Confirmed: questions always start at the beginning of an ayah.
   - Decision needed: does the participant see the opening ayah prompt, hear it
     from a judge, or see no Quran text at all?

9. **Hifz inability to start or continue**
   - Problem: a participant may be unable to start the next ayah, may stop
     partway through an ayah or page, or may be unable to complete the assigned
     question. Marking the first letter of the missing passage as Lahn Jali
     would make a memory failure look like a letter-level recitation finding.
     Marking every remaining word or letter would create evidence that the
     judge did not actually observe.
   - Proposed direction: record a distinct judge-created Hifz event anchored to
     the ayah or remaining question range, with the last successfully recited
     location and any prompt or intervention. A versioned competition rule may
     translate that event into a deduction, cap, prompt penalty, question
     termination, or another official outcome without changing what happened.
   - Decision needed: which event types are required, for example unable to
     start ayah, unable to continue, prompt required, ayah omitted, and question
     not completed?
   - Decision needed: is the evidence scope one ayah, the unrecited remainder of
     the assigned passage, or a judge-selected range? When may a judge resume
     scoring later in the question?
   - Decision needed: for each reviewed Hifz rule set, how does each event affect
     marks, prompts, maximum score, termination, and the result sheet? A rules
     owner must decide whether any of these outcomes is officially classified
     as Lahn Jali; the interface must not assume that classification.

10. **Reading display**
   - Decision needed: show the familiar complete Mushaf page, emphasize the
     assigned passage, or show only the assigned passage?
   - Passage dimming and hiding are postponed until this is decided.

11. **Judge and participant surfaces**
   - Proposed architecture: one codebase and backend, with separate secured
     judge and participant/display routes. Do not maintain two independent
     Mushaf implementations.
   - Decision needed: should the display be opened on a separate device using a
     short session code, or mirrored from the judge's device?

## Competition operations

12. **Live central results**
   - Decision needed: must the central organizer see results immediately, after
     each participant, or only after a venue submits a completed batch?

13. **Offline requirement**
   - Confirmed direction: cloud-first web application; no native mobile app is
     planned for the first production release.
   - Decision needed: how long must judging continue if internet access fails?
     Options range from a short retry queue to several hours of full offline
     work.

14. **More than one judge per criterion**
    - Current implementation allows one owner for each criterion in use — Jali,
      Khafi, and the optional Fasaha and Adu & Raagu — so it has at most four
      scoring seats.
    - This must not be confused with a global limit on users or judge devices.
    - Decision needed: if two judges score the same criterion, are their marks
      averaged, combined, compared by a chief judge, or resolved another way?
      Do not add duplicate criterion owners until that rule is confirmed.

15. **Largest supported event for the first official release**
    - Expected Maldivian use: normally one to six judges.
    - Future target: approximately twenty simultaneous judge devices and
      several venues, with no hard-coded judge limit.
    - Decision needed: what device and venue count must pass the first official
      load rehearsal?

16. **Maldivian competition presets**
    - Decision needed: which published competition and year should become the
      first reviewed preset?
    - Exact Dhivehi division names, age boundaries, Quran portions, and marking
      rules must be confirmed by a rules owner before they are encoded.

17. **Judging focus and Mushaf navigation lock**
    - Problem: an accidental swipe, browser gesture, page change, or control
      activation during a live recitation can move the judge away from the
      assigned passage or record an unintended action.
    - Proposed direction: entering live judging creates a visible focus mode
      that keeps the assigned question and score state in place. Leaving the
      assigned range or exiting focus mode requires a deliberate control; an
      official session may require a recorded reason or authorized role.
    - Decision needed: lock only accidental page navigation, lock navigation to
      the assigned question range, or lock the complete judge workspace? Which
      controls remain available for correction, emergency pause, accessibility,
      and recovery?

18. **Stylus-first versus stylus-only marking**
    - Research finding: a web application can distinguish common pen, touch,
      and mouse pointer events and can refuse finger-created marking commits on
      the Mushaf. This is application behavior, not a hardware guarantee; device
      and browser testing is still required, and a stylus may be unavailable,
      uncharged, or reported as an unknown pointer.
    - Proposed default for pilot: offer an explicit pen-preferred mode. Pen or
      mouse may commit a pinpoint; finger input may navigate or scroll but does
      not create an official Mushaf mark. Keep an authorized, visible fallback
      to ordinary touch input and never make stylus ownership an unrecorded
      accessibility requirement.
    - Decision needed: should official events require pen-only pinpoint commits,
      merely recommend a pen, or allow each judge to choose? While pen mode is
      active, may one finger pan, turn pages, or operate the scoring rail?
    - Decision needed: which supported tablet and stylus combinations must pass
      palm-rejection, pointer-type, latency, missed-tap, and accidental-touch
      tests before this mode is approved?

19. **Browser, installed PWA, kiosk mode, or native shell**
    - Research finding: browser fullscreen and an installed PWA can remove most
      browser chrome, but users and the operating system retain ways to leave
      fullscreen. A web page cannot by itself guarantee a locked competition
      device. iPad Guided Access and managed iPad/Android kiosk modes provide a
      stronger single-app boundary outside the web application.
    - Proposed release path: keep one web codebase, install it as a PWA on
      dedicated tablets, provide a tested full-screen judging action, and use
      the device's guided-access, screen-pinning, or managed-kiosk procedure for
      official sessions. Consider a native wrapper only if device pilots prove
      that the required pen filtering, kiosk control, offline recovery, or
      peripheral access cannot be made reliable enough on the web.
    - Decision needed: which device-control level is required for a local pilot,
      a national competition, and a bring-your-own-device event? Who prepares,
      verifies, unlocks, and recovers each device?

## Later research, not current blockers

20. **AI question suggestions**
    - AI may later suggest themes, mutashabihat, difficulty, or candidate ending
      ayahs. It will not approve an official question.
    - Decision needed later: what reviewer-labelled sample and acceptance rate
      are required before this leaves research mode?

21. **Audio and automatic recitation following**
    - Still a later research track. It is not required for the question bank or
      the first scalable judging release.

22. **Structured mistake detail and likely suggestions**
    - Confirmed boundary: a suggestion may help the judge describe an observed
      mistake, but it must not decide Jali versus Khafi or create an official
      deduction without the judge's action.
    - Proposed first step: derive a short deterministic list from the selected
      target's reviewed features and the active rule set. Let the judge accept,
      edit, skip, or complete the detail during later review. Audio- or
      model-ranked suggestions remain a later advisory layer.
    - Decision needed: which minimum detail taxonomy is required for Hifz,
      Jali, Khafi, Fasaha, and Adu & Raagu, and which details vary by riwayah,
      discipline, age group, or competition rule set?
    - Decision needed: when is detail entry optional, required before finishing,
      or delegated to a reviewer? Which accepted, rejected, and edited
      suggestions are retained with rule/model version and confidence?
    - Decision needed: what separate consent, retention, de-identification, and
      scholarly review are required before judge-labelled records or children's
      recordings may be used to evaluate or train a future model?

23. **Adu & Raagu defaults and shape**
    - Implemented as one criterion covering voice and melody, optional per
      competition, defaulting to Jali 50, Khafi 30, Fasaha 10, Adu & Raagu 10.
    - Decision needed: is Adu & Raagu judged as one criterion, or as separate
      voice and melody criteria, in the competitions this must serve?
    - Decision needed: which allocation should the first reviewed Maldivian
      preset use?

24. **Grouping mistakes from the same kalimah**
    - Problem: two or more findings on different targets in one kalimah are
      easier to review together, but a permanently grouped list can obscure
      which finding was recorded most recently. Grouping must also not merge,
      rewrite, or reorder the append-only judging history.
    - Possible presentation rule: group only the current-mistake view by the
      stable `wordId` within one recitation session. Order each group by its
      newest finding and order findings inside it newest first. Keep category,
      deduction, adjustment, undo, target identity, and timestamp separate for
      every finding; keep History strictly chronological and ungrouped.
    - Decision needed: should the compact live log group immediately, group
      only in View all, or remain a flat newest-first list everywhere?
    - Decision needed: when a new finding joins an older kalimah group, should
      that whole group move to the top, briefly reveal the new finding, or leave
      the current scroll position untouched?
    - Decision needed: what should the collapsed group show: the whole kalimah
      once with a finding count, every primary target glyph, total deduction,
      or some combination? A qualified reviewer should confirm that the visual
      grouping cannot imply one combined religious or scoring judgment.
    - Current implementation evidence (2026-08-15): the clipping and navigation
      correction deliberately retained a flat, newest-first current list and a
      chronological History. No findings were grouped, merged, or reordered,
      so this product decision remains open.

25. **Additional participant contact and school fields**
    - Current implementation: the participant record retains Institution and
      Phone Number. The V5 Excel-template dialog can include or omit those
      stored optional fields; it does not offer Grade/Class or Address because
      Tahqeeq would discard them after import.
    - Decision needed: should Grade/Class and Address become retained participant
      fields? If yes, which are needed for competition operation rather than
      convenience, who may see them, how long are they retained, and must they
      be excluded from judge and result exports by default?
