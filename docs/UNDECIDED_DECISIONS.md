# Undecided decisions

Last reviewed: 12 August 2026

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

9. **Reading display**
   - Decision needed: show the familiar complete Mushaf page, emphasize the
     assigned passage, or show only the assigned passage?
   - Passage dimming and hiding are postponed until this is decided.

10. **Judge and participant surfaces**
   - Proposed architecture: one codebase and backend, with separate secured
     judge and participant/display routes. Do not maintain two independent
     Mushaf implementations.
   - Decision needed: should the display be opened on a separate device using a
     short session code, or mirrored from the judge's device?

## Competition operations

11. **Live central results**
   - Decision needed: must the central organizer see results immediately, after
     each participant, or only after a venue submits a completed batch?

12. **Offline requirement**
   - Confirmed direction: cloud-first web application; no native mobile app is
     planned for the first production release.
   - Decision needed: how long must judging continue if internet access fails?
     Options range from a short retry queue to several hours of full offline
     work.

13. **More than three scoring judges**
    - Current implementation allows one owner for each of Jali, Khafi, and
      Fasaha, so it has at most three scoring seats.
    - This must not be confused with a global limit on users or judge devices.
    - Decision needed: if two judges score the same criterion, are their marks
      averaged, combined, compared by a chief judge, or resolved another way?
      Do not add duplicate criterion owners until that rule is confirmed.

14. **Largest supported event for the first official release**
    - Expected Maldivian use: normally one to six judges.
    - Future target: approximately twenty simultaneous judge devices and
      several venues, with no hard-coded judge limit.
    - Decision needed: what device and venue count must pass the first official
      load rehearsal?

15. **Maldivian competition presets**
    - Decision needed: which published competition and year should become the
      first reviewed preset?
    - Exact Dhivehi division names, age boundaries, Quran portions, and marking
      rules must be confirmed by a rules owner before they are encoded.

## Later research, not current blockers

16. **AI question suggestions**
    - AI may later suggest themes, mutashabihat, difficulty, or candidate ending
      ayahs. It will not approve an official question.
    - Decision needed later: what reviewer-labelled sample and acceptance rate
      are required before this leaves research mode?

17. **Audio and automatic recitation following**
    - Still a later research track. It is not required for the question bank or
      the first scalable judging release.
