# Approved Tanween header release

The owner reviewed the local phone preview and explicitly approved commit and Sites publication on 13 September 2026.

Scope: replace the header's Tahqeeq mark/name with the supplied outlined Platypi Tanween lockup; use the supplied standalone mark on compact screens. Artwork remains exact, ink/paper colours are explicit, and the brand has one accessible name. Inter remains the interface font. App icons, browser metadata and remaining visible copy are outside this approved slice.

Release base: `db95f8fbae9b1ffaf8bd2a11e7aab7666a365f33`, the source of Sites version 131. The preview originated in an older local branch, so its scoped header diff was applied to this newer release base to preserve published Mushaf, replay and mobile improvements. Unrelated dirty source and research in the original checkout were not included.

Validation on the release source: 381 app tests passed, one optional skip; 14 fixed-Mushaf tests passed; production build passed with the existing large-chunk warning. The competition-workspace smoke test was updated to expect the accessible Tanween brand instead of the retired Arabic name. Thirty Chromium checks cover setup, prepared and live judging at five desktop/compact viewport sizes in light/dark: no header overflow or page exceptions. Desktop light and compact dark screenshots were visually inspected. Physical-device acceptance is the owner's phone review, not automated mobile emulation; no broader device, recording or offline-upgrade claim is made.

Compatibility: storage keys, cache namespaces, backup/import formats, audio storage, manifest identity and production origin are unchanged. Brand SVGs are bundled into the compiled application; the existing build precache includes its generated JS/CSS.

Authoritative source ZIP SHA-256: `88620d21c0dec45600dca41822adef7e2f14cef5e0a947747af77c82297fe9f1`.

Confidence: practicality 97/100, architecture/data safety 96/100, visual certainty 90/100 for the approved header slice. Publish to the existing public Sites audience and verify the hosted bundle and brand after deployment.
