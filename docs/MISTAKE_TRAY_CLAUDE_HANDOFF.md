# Mistake log handoff

I want to work on the mistake log tray in Tanween, the Quran judging app. We tried a redesign and then several previews, but the overall direction wasn't working for me. I've asked to restore the original tray in the code so we can start again from there.

The baseline is the tray before commit `c7a3c08`, not one of the later previews. The code restoration keeps the touch and pen page swiping work. The old `LETTER_FIRST_MISTAKE_TRAY_PLAN.md` and `MISTAKE_TRAY_REDESIGN_PLAN.md`, plus the four-direction previews, are previous attempts, not an approved direction to continue.

Please start by running the app and looking at this area in context: the mistake log sits with the score and notes beside the Mushaf, and on mobile it has a different presentation. I don't want another standalone card mockup that looks reasonable on its own but doesn't fit the app.

What bothered me was the overall spacing and proportions. The cards felt too long, the letter looked too close to the edge, and letters like ain didn't have enough height to look comfortable. The kalimah preview also felt awkward, especially with the yellow box and the surah/ayah reference competing with the word. The scrollbar and the space reserved around it made the tray look shifted to one side. Those are things to investigate, not instructions to immediately remove everything.

The letter should lead. In the layout we discussed, the letter and related kalimah are on the left with a comfortable shared inset, the deduction adjuster is in the middle, and Undo is at the far right. Please don't interpret that as moving the Arabic evidence to the right. Also don't squeeze the Arabic text or make the controls tiny just to make the card shorter.

I was interested in a subtle category colour on the card with a matching border, instead of repeating the category name and a little colour square everywhere. But that was part of the attempt I rejected, so don't treat it as settled. Let's first see what the original tray needs. The problem is bigger than choosing a different mark selector. Floating overlays, shared editors, and always-visible rulers didn't solve it for me.

Start with a short plan and show me one restrained revision in the actual app. Keep the original interactions for now. Look at closed and open rows, short and long kalimahs, letters with different shapes, scrolling, and the full review view. Check desktop, tablet, and phone, in light and dark mode. Aim for something calm and properly spaced that belongs next to the Mushaf. Don't add buttons or new interaction patterns unless there's a clear reason and we discuss it first.

The main files are `src/components/MistakeLog.tsx` and the `.log` / `.mistake-panel` styles in `src/styles/global.css`. Read `AGENTS.md` and `docs/DESIGN_GRAMMAR.md` first. Some styles override earlier rules further down the stylesheet, so check the effective layout rather than changing the first matching selector. `scripts/adu-raagu.test.mjs` includes checks for this component; the scoring and ledger tests matter if any behaviour changes later.

Please preserve the Quran text, scoring, evidence, Undo/history, and device preferences. There's unrelated work in the main checkout; don't sweep it into this change. Work from the `codex/touch-pen-page-swipe` branch in `.worktrees/touch-pen-page-swipe` and check its current status before editing.

For now, this is planning and a local preview. Show me the result before committing or publishing a new design. The restoration commit itself is authorised, but it isn't a request to push or deploy. Tell me clearly what you checked and what still needs a real device or my visual approval.
