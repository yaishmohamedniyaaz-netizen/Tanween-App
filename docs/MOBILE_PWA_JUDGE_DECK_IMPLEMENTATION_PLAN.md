# Mobile PWA judge deck — Direction A implementation plan

Status: local flagged implementation in review. Production activation is not part of this pass.

## Current slice

- Surface: portrait phone, installed-PWA geometry, active judging session only.
- Gate: `?mobileJudgeDeck=1`.
- Composition: unchanged compact header, one authoritative Mushaf page, fixed
  44px status/last-action row, fixed 48px action row, and bottom sheets for
  the existing score and mistake components.
- State: `ScorePanel`, `MistakeLog`, `NotesBox`, `JudgeRoleStrip`, and
  `FinishDialog` continue to read and write the existing judging store.
- Persistence: the existing V5 device-preference key and version are retained;
  the two Direction A view settings normalize to safe defaults when absent.
- Release boundary: desktop, phone landscape, non-active states, scoring,
  evidence, Finish validation, exports, and saved session data stay unchanged.

## Acceptance gate

Run the matrix in `docs/design/mobile-pwa-judging/HANDOFF.md`, compare desktop
screenshots at 1024×768, 1280×800, and 1400×900, compare phone landscape, and
obtain explicit approval of the 393×852 portrait view before committing this
slice.

## Deferred product work

The following are deliberately not implemented by Direction A:

1. Decide whether compact and desktop score summaries should continue to show
   both Deducted and Score, and which one a future compact summary should lead
   with.
2. Research a separate, visible handle before considering press-and-hold Adu /
   Raagu entry from a score chip. The whole chip must not become an invisible
   destructive scoring gesture.
3. Plan a Results-screen overhaul separately, including whether the rejected
   four-card bento direction is useful when vertical space is no longer scarce.
