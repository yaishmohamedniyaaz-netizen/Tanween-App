# Tahqeeq product foundation and delivery roadmap

Status: research decision record  
Date: 2026-08-11  
Scope: Hafs, KFGQPC/QPC V1, 1405H Madani Mushaf, 604 pages  
Product stage: manual judging product first; audio assistance and AI later

This document supersedes the future-product assumptions in `VISION.md` and the
older implementation notes in `PROGRESS.md`. Those files remain useful history.

## 1. The decisions in one page

1. **Do not change or simplify the printed Mushaf.** Keep the current QPC V1
   1405H page glyphs, line layout, and tashkeel intact. They are the judge's
   visual source of truth.
2. **Stop treating every Unicode base character as a selectable letter.** The
   connected rail needs a versioned map of judge-actionable recitation targets.
   A target can be a consonant or hamza, or a consonant with an attached madd,
   shadda, vowel, carrier, or contextual rule.
3. **Make the rail visually simple without losing information.** Its default
   chip should show the primary glyph (`ف`, `ء`, `و`), while the full marked form
   (`فَّٰ`, `ئِ`, `وۡاْ`) remains attached to the target and appears in details and
   the audit record. Tashkeel is hidden only from the tiny primary chip, not
   deleted from the Quran text or data.
4. **The shippable product is a trustworthy record of human judging.** Its core
   value is fast pinpointing, consistent calculation, an auditable correction
   history, replayable evidence, and reliable results. It does not need AI to be
   valuable.
5. **Audio bookmarks are feasible before audio understanding.** Record the
   session, save the recording-clock time when the judge first touches a word,
   and let a reviewer replay and adjust a short window. This is evidence, not a
   claim that the app found the exact phoneme boundary.
6. **AI must remain advisory.** It may later suggest the current word or likely
   mismatch, ranked by confidence. It must never create an official deduction
   without a judge accepting it. Tajweed-level automatic judging is a research
   program, not a near-term shipping dependency.
7. **A question is not merely “page X, seven lines.”** It needs an immutable
   Quran passage anchor and a separate 1405H page/line delivery anchor. A small
   reviewed starter bank is honest; a “best questions from ten years” bank is
   not honest until the historical source material is acquired, attributed,
   normalized, and reviewed.
8. **Excel is an output, not the calculator.** Tahqeeq computes and validates
   official totals internally from a versioned event ledger. The `.xlsx` file
   exports values, audit data, and a verification manifest.
9. **Do this in bounded phases.** First correct the recitation-target model,
   then make judging append-only and reviewable, then make rankings and exports
   safe, then add the question bank and audio assistance. Do not wait for AI.

## 2. What the reported letter problems actually are

The two examples reveal different failure classes.

### 2.1 Surah Al-Falaq 113:4 — `ٱلنَّفَّٰثَٰتِ`

The current tokenizer already attaches shadda, fatha, and dagger alif to their
host. Its present targets are:

```text
ٱ | ل | نَّ | فَّٰ | ثَٰ | تِ
```

The `فَّٰ` target is semantically reasonable. The UI defect is that the rail
tries to display the complete marked cluster at 24px inside a small chip. The
shadda, fatha, and dagger alif compete for the same small visual area and make
the fa look blocked or malformed.

The rail should therefore render:

```text
Primary chips:  ٱ | ل | ن | ف | ث | ت
Selected detail:                 فَّٰ
Features:                        shadda, fatha, dagger-alif/madd
```

The printed word on the page remains exactly as it is.

### 2.2 Surah Al-Asr 103:3 — `وَتَوَاصَوۡاْ`

The current tokenizer produces seven targets:

```text
وَ | تَ | وَ | ا | صَ | وۡ | اْ
```

For the proposed Tahqeeq judging workflow, that should become the following
five-target **interface policy**, subject to qualified Hafs/1405H review:

```text
وَ | تَ | وَا | صَ | وۡاْ
```

- The medial alif is the madd/long-vowel part of `وَا`; it is not an
  independently articulated consonant target.
- The final alif after the plural waw is written but not independently
  pronounced. It belongs to the final waw target as orthographic/context
  metadata and must not create a separate chip.

The [Quranic Arabic Corpus morphology for this word](https://corpus.quran.com/wordmorphology.jsp?location=%28103%3A3%3A8%29)
analyzes it as conjunction + Form VI perfect verb + attached masculine-plural
subject pronoun. That supports this interface policy, but it does not by itself
make the segmentation a tajweed ruling or remove the need for reviewer approval.

An important source-contract detail was found in this word on Mushaf page 601
during a scan of the app's complete 604-page corpus. Its final sequence is
encoded as `و U+06E1 ا U+0652`, not with U+06DF. A rule
copied from a different Uthmani text source and keyed only to U+06DF would miss
this app's actual data. This is why the semantic compiler must be versioned to
the precise source text, not written as a loose list of Unicode guesses.

### 2.3 Hamza on a carrier

For `سُئِلَ`, the proposed primary interaction locus is the hamza, while ya is
its written seat. The compact judge-facing labels would be:

```text
س | ء | ل
```

The target must still retain the complete rasm/source span `ئِ`, its visible
carrier, and `orthographyRole: hamza-on-ya`. Showing `ء` on a compact rail is an
interaction label; it must never imply that the carrier is absent from the
Mushaf or can never matter to a reviewer.

For the QPC encoding in a form such as `يَسۡـَٔلُونَ`, the sequence
`tatweel + combining hamza` is likewise one hamza target. The current code
already recognizes this particular encoding; the new model generalizes the
same meaning to precomposed hamza-on-alif, hamza-on-waw, and hamza-on-ya forms.
[Unicode's Arabic-script specification](https://www.unicode.org/versions/Unicode16.0.0/core-spec/chapter-9/)
documents both the precomposed carrier forms and this Quranic
tatweel-plus-combining-hamza convention; it is encoding evidence, not a
substitute for the reviewer-approved interaction policy.

### 2.4 Allah

The current product convention exposes three judge-facing targets for
`ٱللَّهِ`:

```text
ٱ | لَّ | ه
```

This matches the previously requested audible/judging path: contextual wasl,
one geminated-lam locus, and ha. It should be represented as an explicit
semantic policy (`geminated: true`) rather than a typography hack that happens
to merge two Unicode lams. Prefixed forms such as `لِلَّهِ` need their prefix
and divine-name target distinguished. A qualified reviewer should approve the
complete Allah-form fixture set before this rule is frozen.

## 3. The correct abstraction: an auditable recitation target

“Letter” is too ambiguous for this product. It may mean a Unicode code point, a
printed rasm shape, a grapheme cluster, an Arabic orthographic letter, a sound,
or the location where a judge records a rule error. Those are not identical.

Tahqeeq should use this operational definition:

> A recitation target is the smallest stable Quran-text location to which a
> judge can meaningfully attach a pronunciation, vowel, madd, shadda, wasl,
> tajweed, or clarity decision without creating a misleading silent or carrier
> target.

This is deliberately a hybrid “judge-actionable locus,” not a claim that each
target is exactly one phoneme.

Each target needs four layers:

| Layer | Purpose | Example for `فَّٰ` |
|---|---|---|
| Anchor | Stable Quran location | 113:4, word 3, source span 5–9 |
| Primary glyph | Clean rail label | `ف` |
| Full form | Exact marked display snapshot | `فَّٰ` |
| Features | What can go wrong here | fatha, shadda, dagger alif, madd |

### 3.1 Default grouping rules

These are candidate **Hafs/QPC V1 judge-interface policies** to validate one
rule class at a time with a named, qualified reviewer. They are not a new
religious ruling made by the software, and none becomes corpus-wide policy
merely because the compiler can generate it.

| Written element | Judge-facing behavior |
|---|---|
| Ordinary consonant | Independent target |
| Standalone or carried hamza | Hamza target; retain carrier metadata |
| Fatha, damma, kasra, tanwin, sukun | Attach to host; never a separate chip |
| Shadda | Attach to host as gemination; never a separate chip |
| Dagger/superscript alif | Attach to host as a long-vowel/madd feature |
| Madd alif after its host | Candidate: merge into its sounding host; reviewer approval required |
| Madd waw/ya | Candidate: merge according to reviewed Hafs context; never infer from shape alone |
| Small waw/ya and Quranic pronunciation signs | Attach to their semantic host; retain exact type |
| Hamzat al-wasl | Addressable contextual target; beginning and continuation behavior differ |
| Definite-article lam before a sun letter | Keep a contextual assimilation locus unless the reviewer chooses a different audit anchor |
| Silent plural alif | No independent target; attach to the plural waw locus |
| Pause signs and ornaments | Display only; never a letter target |
| Ayah number ornament | Display only; never a judging target |

### 3.2 Why removing all tashkeel is the wrong fix

Removing tashkeel from the Mushaf would remove precisely the information a
judge may be assessing. A vowel, shadda, madd, tanwin, or Quranic sign can be
the source of a consequential recitation error.

The safe split is:

- **Mushaf page:** complete authoritative print form;
- **rail primary label:** uncluttered anchor glyph;
- **selected-target detail:** complete marked form and named features;
- **mistake record:** immutable full-form snapshot plus source/version data.

This fixes the fa display without throwing away the evidence needed for manual
classification or future AI.

## 4. Why the current heuristic cannot be patched forever

`src/lib/judgingUnits.ts` is already better than raw `Intl.Segmenter`: it keeps
combining marks with a host, removes ornaments, recognizes QPC's
tatweel-plus-hamza encoding, and merges the Allah lams. The remaining core rule
is nevertheless “ordinary Arabic base character equals target.” That is why it
cannot distinguish a madd alif, a silent plural alif, and a hamza carrier.

A local corpus scan of the current 604 page files found 77,882 recited words,
including this many **words containing** each feature:

| Feature | Words |
|---|---:|
| Hamzat al-wasl | 13,818 |
| Shadda | 22,036 |
| Dagger alif | 9,414 |
| Small waw | 1,256 |
| Small ya | 957 |
| QPC tatweel + combining hamza | 495 |

These are not isolated page-604 exceptions. The solution must cover the full
corpus and preserve its source contract.

## 5. The recitation-target data pipeline

The page renderer and the selector should be decoupled.

### 5.1 Immutable inputs

1. `mushafEdition`: QPC V1, 1405H Madani print.
2. `riwayah`: Hafs from Asim, with its declared source/version.
3. QPC page glyph code and page-line layout used by the current renderer.
4. One selected, reuse-cleared semantic Uthmani word source, with its version,
   license, file hashes, token-coordinate definition, and word-alignment report.
5. A versioned Tahqeeq recitation-rule authority document and signed-off
   fixtures from a named qualified reviewer.

The research has **not yet selected or licensed** item 4; that is a phase-1
decision gate, not an implementation detail to guess. The visual page glyph
remains untouched. The generated target map is a parallel data asset joined
only after a reproducible word-level alignment/mismatch report proves the link.
An existing `wid` alone is not proof that two independently versioned sources
have the same token identity.

### 5.2 Compiler stages

```text
source word
  -> decode into orthographic characters and attached marks
  -> identify carriers, silent signs, contextual signs, madd relationships
  -> emit provisional judge-actionable targets
  -> apply a small explicit override table for reviewed exceptions
  -> mark unknown or unreviewed rule classes instead of guessing
  -> validate invariants over every word
  -> emit versioned target data + aliases + audit report
```

Unicode grapheme boundaries are useful for cursor and string offsets; they are
not the religious or phonetic boundary model. The Quranic Arabic Corpus makes
the same technical distinction: its orthography model represents a character
with attached diacritics because multiple Unicode sequences can carry the same
orthographic interpretation.

### 5.3 Proposed target record

```ts
type RecitationTarget = {
  id: string;                  // persistent generated ID, not array position
  riwayah: "hafs";
  mushafEdition: "qpc-v1-1405h";
  sourceVersion: string;
  ruleVersion: string;
  wordKey: string;             // canonical surah:ayah:word identity
  canonicalTokenId: string;    // ID from the locked semantic source
  wordTextHash: string;
  rasmStart: number;           // exact source-text span retained for audit
  rasmEnd: number;
  primaryGlyph: string;        // clean rail label
  fullGlyph: string;           // exact source substring/snapshot
  kind: "consonant" | "hamza" | "contextual";
  carrier?: "alif" | "waw" | "ya" | "tatweel";
  orthographyRoles: string[];  // e.g. hamza-on-ya, silent-plural-alif
  features: Array<
    | "fatha" | "damma" | "kasra" | "tanwin" | "sukun"
    | "shadda" | "dagger-alif" | "madd" | "small-waw" | "small-ya"
    | "hamzat-wasl" | "sun-lam" | "silent-plural-alif"
  >;
  contextRule?: string;
  authorityReference?: string;
  reviewStatus: "generated" | "reviewed" | "override" | "blocked";
  approvalRecordId?: string;
  aliases: string[];           // IDs from earlier selector versions
};
```

The exact TypeScript may change; the separation of canonical identity, complete
rasm span, compact interaction label, orthographic roles, recitation features,
and review authority should not.

### 5.4 Stable IDs and saved-history migration

The current ID is `wordId@uN`. Any new merge changes later indices and can make
old records point at a different target. `legacyGraphemeIndices` helps with one
past format but does not make future semantic revisions inherently safe.

The generated asset must assign persistent target IDs and emit an explicit
old-to-new alias map. A saved mistake must also retain:

- the old ID;
- the canonical word key;
- the full selected glyph snapshot;
- the source/rule version used at judging time;
- its migrated target, if a later version changes the map.

Historical evidence must never silently change meaning after a tokenizer
update.

### 5.5 Full-corpus validation gate

No selector version ships until all of these pass:

- all 604 expected pages and all 77,882 recited words load under the declared
  page/font/text contract;
- every source code point is classified as anchor, attached feature,
  contextual/silent metadata, or non-recitation ornament;
- targets are ordered, non-overlapping, and cover their assigned source spans;
- no ayah marker, pause ornament, or hizb/sajdah ornament is selectable;
- no silent plural alif or hamza carrier becomes a misleading independent chip;
- every target has a primary glyph and full-form snapshot;
- generated output and manifests are byte-reproducible from the locked inputs;
- a diff report lists every target merge/split since the previous version;
- saved-ID migration fixtures pass;
- visual rail snapshots pass for narrow, heavily marked, long, and mobile cases;
- the named rule authority and reviewer approval record are stored with the
  generated artifact;
- a qualified reviewer approves a stratified golden set covering every rule and
  every manual override;
- every target changed by a rule or override diff receives regression review.

An unreviewed or unknown rule class may fall back to whole-word selection in an
exploratory build. It must be marked visibly in diagnostics and blocked from an
official-mode selector; the compiler must never disguise a guess as a reviewed
letter-level boundary.

Required golden fixtures include, at minimum:

- `ٱلنَّفَّٰثَٰتِ` -> six targets, clean fa chip, full `فَّٰ` detail;
- both occurrences of `وَتَوَاصَوۡاْ` in 103:3 -> five targets;
- Allah with and without prefixes;
- precomposed hamza on alif, waw, and ya;
- QPC tatweel-plus-hamza;
- dagger alif, small waw, small ya, madd, shadda, tanwin;
- hamzat al-wasl at a start and in connected recitation;
- sun-letter assimilation and moon-letter non-assimilation;
- silent written-letter patterns and pause/ayah ornaments.

## 6. Capturing the actual mistake without slowing the judge

The near-term solution to “we know Jali/Khafi, but not what happened” does not
require speech AI.

### 6.1 Two-stage interaction

1. The existing fast gesture commits the target, broad category, deduction,
   and observation time.
2. A small non-blocking detail row offers likely descriptions based on the
   target's features. The judge may choose one immediately or fill it during
   review.

Examples:

| Target features | Useful detail candidates |
|---|---|
| Ordinary consonant | omitted, substituted, inserted, makhraj/sifah, other |
| Fatha/damma/kasra | vowel changed, vowel omitted, ending/i'rab issue, other |
| Shadda | shadda omitted, shadda added, gemination length, other |
| Madd/dagger alif | shortened, overextended, wrong madd count, other |
| Hamza with carrier | hamza omitted, hamza substituted, carrier display only |
| Hamzat al-wasl | pronounced in continuation, omitted at valid beginning, other |
| Sun-lam context | lam pronounced instead of assimilated, assimilation issue |
| Waqf/ibtida context | incorrect stop, incorrect restart, changed ending |

These suggestions do not decide Jali versus Khafi. Competition rule sets and
judges may classify the same observed behavior differently in different
contexts. The detail list is a speed aid and a better audit record, not an
automatic ruling.

### 6.2 Why this matters for future AI

An optional structured detail accepted or corrected by a qualified judge is
exactly the data needed to evaluate later models. A vague “Khafi on this word”
history is much less useful for training or auditing than:

```text
target=113:4:3/fa
features=shadda,dagger-alif
judge_category=khafi
judge_detail=madd_shortened
audio_window=...
```

The product can create a high-quality, consented, adjudicated corpus while
delivering immediate manual value. It must not quietly use competition audio
for model training without separate consent.

## 7. The product's reliable core

Tahqeeq's first promise should be:

> Every official deduction can be traced to the judge, rule set, Quran
> location, question, time, explanation, correction history, and—when enabled—
> replayable audio evidence.

The app records the judge's decision. It does not claim the app itself heard or
proved the mistake.

### 7.1 Current-state gap

The current prototype has useful UI, but its data model is not yet an official
competition record:

- state and history live in mutable `localStorage`;
- a mistake can be edited or removed with no retained reversal event;
- a finished session stores a snapshot, not an append-only ledger;
- score categories and the total-100 assumption are hard-coded;
- there is no judge identity, rule-set version, question ID, finalization lock,
  tie workflow, or independent result verification;
- the CSV is an analysis export, not a verified winners workbook.

This is normal prototype debt, but it must be resolved before the app is called
competition-safe.

### 7.2 Append-only judging events

A mistake, edit, reversal, note, prompt, and finalization should be an event.

```ts
type JudgingEvent = {
  eventId: string;
  sessionId: string;
  competitionId: string;
  contestantId: string;
  judgeId: string;
  questionId?: string;
  ruleSetVersion: string;
  targetId?: string;
  eventType: "mistake" | "adjustment" | "reversal" | "note" |
             "prompt" | "finalize" | "reopen";
  category?: string;
  detail?: string;
  amountUnits?: number;
  recordingId?: string;
  observedAtMs?: number;       // monotonic offset in the session recording
  finalizedAtMs?: number;      // category-commit offset in that recording
  recordedAt: string;          // UTC wall-clock audit time
  reversesEventId?: string;
  reason?: string;
  priorHash?: string;
  eventHash?: string;
};
```

Corrections append a new event referencing the old event. Nothing that affected
an official result disappears. A readable UI can still say “removed”; the
ledger says who reversed it, when, and why.

On one device this is an **audit history and corruption check**, not proof
against an operator who can rewrite IndexedDB or an exported file. A local hash
chain is not a trusted signature. Reserve “tamper-evident official record” for
a later design with authenticated server receipt, protected organization keys,
signed/notarized finalization, and a trusted server timestamp. The pilot UI and
documentation must use those terms accurately.

### 7.3 Local-first, not local-only

For a single-device pilot, write events transactionally to IndexedDB and make
automatic backups/export possible. `localStorage` is not enough for durable
competition evidence.

For multi-judge official use, a server database and identity/role layer become
necessary. The client should write locally first and sync idempotent events so
temporary network loss does not stop judging. Suggested roles are organizer,
judge, chief judge/reviewer, results officer, and auditor. A static bundle must
not contain secret competition question sets.

## 8. Audio evidence and AI

### 8.1 What a solo build can reliably ship

Modern browsers can obtain microphone input over HTTPS and record it through
standard browser APIs ([getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia),
[MediaRecorder](https://www.w3.org/TR/mediastream-recording/), and the
[AudioContext clock](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/currentTime)).
The important product design is timing:

- start one recording clock for the session;
- save `observedAtMs` when the judge first presses the word, before the rail and
  category choice introduce delay;
- also save `finalizedAtMs` when the category is committed;
- default replay to a forgiving window such as four seconds before and three
  seconds after `observedAtMs`;
- let the reviewer nudge the window and save the correction;
- keep `writtenTarget`, `judgeBookmark`, and any later model alignment as
  separate fields.

Persist a recording-clock map, not only the event offsets: recording ID,
capture-start monotonic time, media duration/chunk sequence, pause/resume and
page-background transitions, permission/device changes, MIME type/codec, and
the final blob hash. Browser/device recovery tests must prove how those points
map to seekable media time after a crash or interruption. Until then, call the
result a manually adjustable **near-word bookmark**, never an exact timestamp.

The judge's reaction time means this is a useful bookmark, not an exact phoneme
timestamp.

### 8.2 Useful existing resources

QUL publishes reference-reciter word segments and tools for correcting timing.
Those segments are useful for expected-recitation playback, word highlighting,
and question boundaries. They must not be copied onto a child's recording as
if every reciter has the same timing.

Tarteel is evidence that Quran ASR is possible but also evidence of the scope:

- its original public mistake detector was word-level after years of R&D and a
  large curated audio set;
- its current help documentation describes word and tashkeel indications;
- its current help documentation separately says tajweed mistakes are not yet
  recognized;
- its public `tarteel-ml` repository is an archived experimental repository,
  not the current production model.

There is therefore no open, competition-certified “Tarteel engine” that
Tahqeeq can simply integrate.

Primary research supports the cautious boundary. A 2024
[Quran-recitation forced-alignment study](https://irep.iium.edu.my/111820/2/111820_Improving%20automatic%20forced%20alignment.pdf)
found that long-vowel/tajweed duration sharply complicated 30 ms phoneme
segmentation in its limited test set: the classic method averaged 23% correct
classification and its specialized method 45%. Those numbers are not a general
benchmark for modern models, but they rule out assuming phoneme-exact timing is
already solved. A separate
[crowdsourced Quranic-audio dataset paper](https://arxiv.org/abs/2405.02675)
collected about 7,000 recitations from 1,287 participants, yet annotated 1,166
and reported inter-rater agreement of 0.63. That reinforces the need for expert
definitions, adjudication, and held-out evaluation before competition use.

YouTube is not an alignment backend. The ordinary Data API does not provide a
participant-audio phoneme stream, and YouTube policies restrict separating or
downloading audiovisual content. Use direct, consented recordings instead.

### 8.3 Staged AI path

| Stage | Output | Official scoring role |
|---|---|---|
| A | Judge-created audio bookmark | Evidence only |
| B | Post-session alignment to the known question range | Navigation aid |
| C | Ranked possible omission/substitution/repetition/location drift | Judge accepts/rejects |
| D | Ranked vowel/tashkeel candidate | Research pilot; judge confirms |
| E | Tajweed/phonetic candidate | Research only until independently validated |

The first experiments should be constrained to a known Hafs passage from the
question bank. Full-Quran unconstrained recognition is harder and unnecessary
for this workflow.

Every suggestion needs model version, confidence, reason, and acceptance or
rejection. Evaluation must hold out both reciters and passages and report false
positives, false negatives, calibration, latency, and override rate by age,
accent/first language, recording quality, noise, pace, and recitation style.

### 8.4 Privacy boundary

Competition recordings, especially children's recordings, require explicit
consent, clear recording state, access controls, retention and deletion rules,
and jurisdiction-specific review before cloud storage. Local-only recording
with explicit export is the lowest-risk first mode. Training consent must be a
separate decision from competition participation.

### 8.5 Research radar, without making AI a dependency

Recheck QUL/Tarteel releases, public Quran-ASR repositories, peer-reviewed
forced-alignment work, and expert-labelled datasets at planned milestones (for
example before each major version), not continuously inside the shipping path.
Promote a new model or dataset from “watch” to “pilot” only when its license,
riwayah, training/evaluation split, error definitions, and independently
reported accuracy are clear. A public repository name alone is not evidence
that the deployed model or a competition-safe evaluation is available.

## 9. Question bank foundation

### 9.1 Canonical passage plus printed delivery

A question needs both identities:

```ts
type Question = {
  id: string;
  riwayah: "hafs";
  sourceVersion: string;
  canonicalTextHash: string;
  start: { tokenId: string; surah: number; ayah: number; word: number };
  end:   { tokenId: string; surah: number; ayah: number; word: number };
  prompt: {
    cueMode: string;
    startInstruction: string;
    stopInstruction: string;
    basmalaPolicy: string;
    waqfIbtidaPolicy: string;
  };
  delivery: {
    mushafEdition: "qpc-v1-1405h";
    startPage: number;
    startLine: number;
    endPage: number;
    endLine: number;
    recitationLineCount: number;
    partialLinePolicy: "count" | "exclude" | "explicit";
    layoutHash: string;
  };
  trackEligibility: string[];
  promptType: string;
  difficulty: number;
  difficultyReason: string;
  mutashabihatLinks: string[];
  provenance: string;
  reviewStatus: "draft" | "reviewed" | "approved" | "retired";
  reviewedBy?: string[];
};
```

This prevents zoom or a future Mushaf edition from changing the meaning of
“seven lines.” It also lets the app darken everything outside the exact
question while retaining an edition-independent Quran reference.

For a page with surah headers or basmala, the line count must explicitly mean
recitation lines, not decorative layout rows. Every rule set must decide how
basmala, surah starts, first/last partial lines, cross-page boundaries, and
waqf/ibtida instructions count. Cross-page questions are first-class rather
than forced into one page.

### 9.2 What belongs in the bank

- direct continuation passages;
- beginnings, middles, and ends of surahs;
- easy, medium, and difficult coverage;
- mutashabihat/confusable phrase prompts;
- juz/track and competition-round eligibility;
- source/topic-based prompts when the competition requires them;
- an explanation of why the item has its difficulty and what it tests;
- provenance, reviewer, approval date, and version.

QUL's phrase-level mutashabihat data is a useful candidate generator. It is not
by itself a competition question approval. A qualified reviewer must decide
whether a relation creates a fair and useful question.

### 9.3 Historical questions: what the research did and did not find

Official sources show that strong competitions deliberately prepare questions
and use controlled electronic/random selection. Qatar's
[public test generator](https://www.islam.gov.qa/Jassim/En/enquiry.html)
supports configurable Quran ranges, question counts, and 5–7, 8–10, or 13–15
line ranges. JAKIM documents a
[four-day expert workshop](https://www.islam.gov.my/en/sdsds/1204-bengkel-pemilihan-ayat-sempena-mthqk-dan-mthqa-tahun-1441h-2020m)
specifically for selecting national and international competition verses.

No open, attributable, normalized corpus of “the last ten years of questions
across competitions” was found. Tahqeeq must not label a bank that way without
the source documents and permissions.

The honest acquisition workflow is:

1. collect official question sheets or administrator-owned archives;
2. record competition, year, round, category, source link/file, and rights;
3. manually anchor each passage to canonical word IDs;
4. deduplicate exact and overlapping passages;
5. tag difficulty, coverage, and mutashabihat purpose;
6. have qualified reviewers approve or reject each item;
7. only then calculate frequency and call an item historically repeated.

### 9.4 Starter bank and custom builder

Ship in this order:

1. a small, named, reviewed “Tahqeeq starter bank” with no claim that it is the
   universal best bank;
2. a manual passage selector on the 1405H Mushaf;
3. a constrained set builder: track/range, count, line length, difficulty mix,
   mutashabihat quota, and no-repeat window;
4. a review/approval queue;
5. provenance-preserving historical imports.

“A trained organizer can prepare a compliant custom set in under an hour” is a
usability-test target, not a shipping promise. Test it with real organizers as
they select passage start/end directly, preview the resulting lines, choose
tags, and submit for review; do not claim it until the measured workflow passes.

### 9.5 Fair tile selection

The 20-tile screen should reveal from a frozen competition set, not generate a
new arbitrary question after a participant taps.

- filter to eligible, approved, unused items;
- build a balanced set with declared constraints;
- record the candidate-set hash, generator version, seed, and output;
- lock the set before the round;
- randomize tile positions without changing their contents;
- record reveal time, participant, tile, and question ID;
- require an authorized reopen/replacement event if a question is invalid;
- prevent repeats according to the competition's rule.

This makes the draw fast, fair, and reconstructable.

## 10. Competition structure, scoring, and winners

Official competition structures differ too much to hard-code one set of age
groups or one rubric. Use configurable templates over a neutral hierarchy:

```text
Competition
  -> edition/event
  -> discipline (Hifz, reading from Mushaf/Tartil, Tilawah, Qira'at, Tafsir...)
  -> track (full Quran, juz range, level...)
  -> eligibility group (age/date boundary, gender if used, school/region...)
  -> round
  -> question set
  -> judging panel
  -> rule-set version
```

The UI can offer Hifz and Tartil toggles/templates. The database must not assume
they have the same fields, maximum marks, deductions, prompt rules, or ties.

### 10.1 Versioned rule set

A rule set must define:

- scoring components and maximums;
- permitted mistake types and deduction units;
- caps, prompts/corrections, rounding, and aggregation;
- number of judges and missing-score handling;
- whether high/low scores are excluded;
- withdrawal/disqualification handling;
- tie policy and who can resolve an unresolved tie;
- finalization and reopening permissions;
- a human-readable official rules document/version.

Freeze the version when a session begins. Never silently edit a live event's
rules.

### 10.2 Deterministic calculation

- Store marks as integer minor units (for example, hundredths of a mark), not
  floating-point values that are repeatedly rounded.
- Calculate from active append-only events with one pure, versioned engine.
- Produce a trace explaining every component total and aggregate.
- Do not rank across categories with different rubrics unless an explicit
  normalized “overall winner” rule exists.
- Do not invent a tie-breaker. If the rule set does not resolve a tie, show
  “committee decision required” and keep the winners list provisional.

### 10.3 Runtime verification before results can be final

Block final publication when any required check fails:

- every included session is finalized under the expected rule version;
- all required judges submitted exactly one active score;
- all questions were approved and eligible;
- deduction sums equal component scores;
- aggregates equal the configured method;
- scores stay within bounds;
- each contestant belongs to exactly one ranking division;
- withdrawn/disqualified contestants follow the configured rule;
- placements are contiguous and match the tie policy;
- no tie requiring a committee decision remains unresolved;
- a second complete recomputation matches the saved result run;
- the result run records its calculation version and ledger hash.

Before an official pilot, add a separate read-only verifier that consumes only
the frozen rule snapshot and event export, not the live UI reducer or leaderboard
state. Compare its output with the primary engine. Both paths must also pass
organizer-approved, manually calculated golden examples and property/invariant
tests. This is more meaningful protection against a formula bug than simply
opening the same workbook twice.

Required golden tests include tied first place, missing judge, corrected score
after provisional ranking, deduction cap, fractional rounding, withdrawal,
disqualification, two age groups, Hifz and Tartil in one event, and an explicit
overall-winner rule.

### 10.4 Safe Excel output

Tahqeeq—not Excel—is authoritative. Microsoft's documentation confirms that
[SpreadsheetML stores formulas and cached values separately](https://learn.microsoft.com/en-us/office/open-xml/spreadsheet/working-with-formulas)
and that [Excel calculation mode can be manual](https://learn.microsoft.com/en-us/office/client-developer/excel/excel-recalculation).
A workbook that depends on formulas can therefore show stale or locally altered
results.

Export value-only sheets:

1. **Read me** — competition, export time, result-run ID, source/rule/calculation
   versions, status, ledger hash;
2. **Winners** — final placements by division and unresolved-tie status, with
   first/second/third visually color-coded and also labelled in text so color is
   never the only indicator;
3. **Category totals** — each age/track/discipline ranking;
4. **Score ledger** — judge inputs and computed aggregates;
5. **Mistake audit** — active and reversed deductions;
6. **Question log** — exact passage anchors and reveal history;
7. **Verification** — every invariant and pass/fail result;
8. **Rules snapshot** — the plain-language frozen configuration.

Verification levels:

- **Pilot:** workbook includes result-run ID and SHA-256 ledger manifest; the
  app can re-import and compare it with the locally stored finalized run.
- **Official multi-device:** the server stores the finalized run and verifies
  an uploaded workbook against it.
- **Later public verification:** organization-signed manifest/QR. A bare hash
  detects accidental changes but is not a digital signature against a malicious
  editor.

All human-controlled strings must be escaped against spreadsheet/CSV formula
injection (`=`, `+`, `-`, `@`, tabs, and line prefixes as applicable).

## 11. Delivery roadmap for a solo developer

These are rough **coding-only planning ranges**, not delivery promises. They
assume focused work on the existing codebase after each phase's decisions are
ready. Semantic-source licensing, Quran review, competition-owner decisions,
question authoring/review, privacy/legal review, and pilot scheduling are
separate external tracks with unbounded calendar time.

| Phase | Estimated development | Deliverable | Exit gate |
|---|---:|---|---|
| 0. Research foundation | complete | This decision record, source map, current gap analysis | Product boundary agreed |
| 1. Recitation targets v2 | 2–4 coding weeks | Generated corpus-wide target map, clean rail labels, saved-ID migration, reviewer fixtures | All 604-page invariants pass; expert approves rule set |
| 2. Reliable judging ledger | 3–5 coding weeks | Versioned rules, append-only events/corrections, session finalization, structured optional details, IndexedDB | Crash/offline recovery and audit reconstruction pass |
| 3. Results safety | 3–5 coding weeks | Divisions/tracks, multi-component score engine, ties, validation report, value-only XLSX | Golden edge cases and re-import verification pass |
| 4. Question bank v1 | 4–8 coding weeks | Canonical passage model, manual builder, frozen tile sets, small reviewed starter pool | Every question has provenance and approval |
| 5. Audio evidence | 2–4 coding weeks | Consent-aware recording, near-word bookmarks, replay/nudge review | Mobile/desktop recording recovery and deletion tests pass |
| 6. Official pilot foundation | 6–10 coding weeks | Identities/roles, local-first sync, multi-judge aggregation, central finalization | Simulated network loss and complete pilot rehearsal pass |
| R. AI pilot | open-ended research | Known-passage word alignment and ranked suggestions | Independent expert evaluation; no automatic marks |

### 11.1 The shortest credible shipping path

If time is tight, ship phases 1–3 first. That creates the core product promised
to competitions: accurate pinpointing, transparent correction history, and
verified winners. The question bank and recording are valuable additions but
must not delay fixing the semantic target and official-result foundations.

### 11.2 What does not require a rewrite

- The QPC V1 page rendering can stay.
- Word-level click/hold and the connected rail can stay.
- The three broad category gesture can stay as a default rules template.
- Page navigation, zoom, layout, and offline page caching can stay.

The major changes are a generated semantic data layer and a trustworthy state/
calculation model. They are substantial, but they do not require replacing the
entire Mushaf implementation.

## 12. Confidence and decisions that require human authority

| Finding | Confidence |
|---|---:|
| Keep the full QPC V1 page and tashkeel | 98% |
| Use generated recitation targets instead of Unicode bases | 97% |
| Fix the fa case with a clean primary chip, not deleted data | 95% |
| Adopt five-target `وَتَوَاصَوۡاْ` as a reviewed Hafs/QPC V1 interface policy | 86% |
| Keep AI outside official automatic scoring | 98% |
| Use append-only events and app-calculated value-only exports | 97% |
| Store both canonical passage and print-line anchors for questions | 95% |
| Generalize all grouping rules without expert review | 65% |

The following must be approved by a qualified Hafs/Quran-recitation reviewer:

- the exact unit policy for Allah forms, gemination, hamzat al-wasl, sun-lam,
  madd/leen, silent letters, small letters, and waqf/ibtida context;
- the golden fixture set and every override;
- the optional mistake-detail taxonomy and its relationship to each
  competition's Jali/Khafi/Fasaha rules;
- the starter question bank and its mutashabihat/difficulty labels.

The following must be supplied by competition owners:

- disciplines, tracks, age/date boundaries, scoring components, panels,
  aggregation, ties, withdrawals, and overall-winner rules;
- which records are visible to contestant, judge, chief judge, organizer, and
  auditor;
- audio consent, retention, deletion, and permitted research use.

## 13. Source map

Accessed 2026-08-11. These sources support technical and product analysis;
they are not automatically religious authority or permission to redistribute
their data. Phase 1 must record license/reuse status separately for every asset
actually selected. A qualified reviewer must explicitly adopt any source-backed
rule used as Tahqeeq's Hafs/QPC V1 interface policy.

### Quran text, orthography, and rendering

- [King Fahd Complex developer platform](https://qurancomplex.gov.sa/en/techquran/dev/)
  — official Unicode Hafs resources, source fields, versions, and file hashes.
- [QUL QPC V1 glyph resource](https://qul.tarteel.ai/resources/quran-script/57)
  and [QUL glyph-based font explanation](https://qul.tarteel.ai/docs/glyph-based)
  — relationship between word glyphs, page fonts, and the 1405H V1 print.
- [QUL Mushaf layout resources](https://qul.tarteel.ai/resources/mushaf-layout?view=list)
  — edition-specific pages, lines, and word ranges.
- [Quranic Arabic Corpus orthography model](https://corpus.quran.com/java/orthographymodel.jsp),
  [Unicode serialization](https://corpus.quran.com/java/unicode.jsp), and
  [phonetic transcription](https://corpus.quran.com/documentation/phonetic.jsp),
  plus its [morphology for 103:3:8](https://corpus.quran.com/wordmorphology.jsp?location=%28103%3A3%3A8%29)
  — distinction between Unicode sequences, orthographic characters, attached
  marks, and context-sensitive pronunciation. Its data/license must be reviewed
  before commercial reuse; the model is research evidence, not a dependency
  selected by this document.
- [Unicode Arabic chapter](https://www.unicode.org/versions/Unicode16.0.0/core-spec/chapter-9/),
  [Arabic names list](https://www.unicode.org/charts/nameslist/n_0600.html), and
  [Arabic mark rendering report](https://www.unicode.org/reports/tr53/tr53-12.html)
  — joining, combining marks, superscript alif, hamza encodings, and Quranic
  annotation rendering.
- [Tanzil Uthmani text notes](https://tanzil.net/docs/Uthmani) and
  [text types](https://tanzil.net/docs/quran_text_types) — source-specific
  encoding and optional-symbol differences.
- [Diyanet's Learning the Qur'an guide](https://yayin.diyanet.gov.tr/File/Download?id=526&path=kuran_ogreniyorum_elif_ba_ingilizce.pdf)
  and [King Salman Academy explanation of madd letters](https://almustashar.ksaa.gov.sa/bank/9596)
  — madd/leen relationships used as reviewer-facing background, not as an
  automatic competition rubric.

### Audio and AI

- [W3C MediaStream Recording](https://www.w3.org/TR/mediastream-recording/),
  [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia),
  and [AudioContext clock](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/currentTime)
  — browser capture and timing primitives.
- [QUL word segments](https://qul.tarteel.ai/docs/with-segments) and
  [timestamp correction tools](https://qul.tarteel.ai/docs/timestamp) —
  reference-reciter timing and the need to review alignment.
- [Tarteel's original mistake-detection announcement](https://tarteel.ai/blog/introducing-mistake-detection/),
  [current tashkeel help](https://support.tarteel.ai/en/articles/12414420-how-to-turn-on-tashkeel-recognition),
  [current tajweed limitation](https://support.tarteel.ai/en/articles/12414457-tarteel-is-not-recognising-my-tajweed-mistakes), and
  [archived public ML repository](https://github.com/TarteelAI/tarteel-ml).
- [Quran-recitation forced-alignment study](https://irep.iium.edu.my/111820/2/111820_Improving%20automatic%20forced%20alignment.pdf)
  and [crowdsourced Quranic-audio dataset paper](https://arxiv.org/abs/2405.02675)
  — primary research on timing difficulty, data scale, annotation, and reviewer
  agreement; neither is a competition-certified model.
- [YouTube developer policy](https://developers.google.com/youtube/terms/developer-policies)
  — why YouTube is not the participant-audio extraction/alignment path.

### Questions, competition operations, and results

- [Qatar Sheikh Jassim competition electronic-system description](https://www.islam.gov.qa/Jassim/En/achievements-comp.html)
  and [test-model generator](https://www.islam.gov.qa/Jassim/En/enquiry.html)
  — controlled random questions, non-repetition, electronic entry/ranking, and
  selectable question line ranges.
- [Saudi 1447H competition regulations](https://quran.moia.gov.sa/pdfs/file2.html)
  — differing branches, question counts, judge averaging, prompts, and tie
  authority.
- [JAKIM 2024 rules](https://www.islam.gov.my/images/muat-turun/2024/BUKU_PERATURAN_DAN_PENGHAKIMAN_MAJLIS_TILAWAH_DAN_HAFAZAN.pdf)
  and [JAKIM verse-selection workshop](https://www.islam.gov.my/en/sdsds/1204-bengkel-pemilihan-ayat-sempena-mthqk-dan-mthqa-tahun-1441h-2020m)
  — rubric diversity and expert preparation of questions.
- [QUL mutashabihat guide](https://qul.tarteel.ai/docs/tutorial-mutashabihat-end-to-end)
  — phrase similarity data as a candidate-generation source.
- [Microsoft SpreadsheetML formulas](https://learn.microsoft.com/en-us/office/open-xml/spreadsheet/working-with-formulas)
  and [Excel recalculation behavior](https://learn.microsoft.com/en-us/office/client-developer/excel/excel-recalculation)
  — formula/cached-value and calculation-mode risks.
- [OWASP CSV/formula injection](https://owasp.org/www-community/attacks/CSV_Injection)
  — export sanitization requirements.

## 14. Immediate next implementation brief

When implementation is approved, phase 1 should be one isolated change set:

1. select a reuse-cleared semantic source, freeze its hash/token coordinates,
   and prove its alignment to the QPC V1 page/word assets with a mismatch report;
2. define `RecitationTarget` v2 and persistent-ID migration;
3. implement provisional source-specific rules for the two reported words and
   the complete special-feature fixture set, with a blocked/whole-word fallback
   for every unknown or unreviewed class;
4. generate and audit the map over all 604 pages;
5. make the connected rail show `primaryGlyph` while details/logs retain the
   full form and features;
6. do not touch the QPC page glyph renderer;
7. publish only after automated corpus checks, visual mobile/desktop checks,
   stored reviewer approval of every rule/override fixture, and regression
   review of every target changed from the prior release.

That is the smallest change that fixes the root problem and leaves a clean path
to mistake details, audio evidence, questions, and later AI.
