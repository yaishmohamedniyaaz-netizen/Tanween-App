# Rank054 independent clipping second opinion

Observer: `cloud041_055-second-opinion` (delegated assistant `/root/ranks041_055`). Report recorded 2026-11-08T12:00:05.015080+00:00; image views occurred in this task session before this timestamp, not reconstructed historical views. Read-only review of root-owned decisions: no annotation, audit, cut, source artwork, or existing image was changed. This report and seven newly named context/detail PNGs are this review's only persistent outputs.

The immutable `representative.body` boxes were drawn over actual source artwork with surrounding context. Shaded outer ink limits alone are not evidence of clipping. Every image listed below was actually opened with `view_image`; a truncated two-image tool result was not counted as a view, and both images were subsequently reopened singly. There are 13 distinct successfully viewed PNGs in this review, including five original sheets. Exact token use is unavailable. No hidden answers or scoring were accessed.

## Findings for the 22 flagged first-30 representatives

**Keep clipped-ink / low: 9 right-fatha mark clips.** `11.64.4`, `44.18.6`, `55.31.1`, `2.168.13`, `2.247.7`, `3.31.9`, `4.5.7`, `4.26.3`, `4.176.43`. Source ink visibly extends right of the immutable boundary. The letter bodies remain present. Some mark tips extend only a small amount; `44.18.6` has a single narrow edge column, confirmed in edge-detail003.

**Keep clipped-ink / low conservatively: 2 minimal antialiased mark-edge clips.** `12.9.6`, `4.4.6`. At sevenfold nearest-neighbor enlargement, a faint gray fatha-tip pixel column lies outside the right boundary. This is a mark-edge issue only; no missing target body or material body truncation is visible. Confidence in the visible pixel crossing is high, while its practical segmentation significance is very small.

**Remove the clipping rationale: 11 fully contained own-word ink examples.** `60.4.2`, `57.8.1`, `58.11.5`, `65.6.21`, `69.12.1`, `5.19.6`, `9.38.4`, `26.162.1`, `43.62.4`, `61.12.1`, `4.91.28`. The complete bodies and own marks are inside their immutable boxes. In particular `65.6.21` touches the right limit closely but has no visible ink beyond it in edge-detail001; `4.91.28` retains a narrow white margin in edge-detail002. The flat left endpoint or close ink boundary is not a clipped word-box edge. This does not automatically determine overall confidence: independent connector/overlap uncertainty, if any, may still warrant a lower category.

The eight remaining first-30 representatives were viewed on the original sheets but were not the requested currently flagged cases: `12.83.3`, `17.69.18`, `11.34.7`, `6.119.1`, `20.53.6`, `2.187.1`, `5.76.8`, `12.98.3`. This report does not reassess their confidence metadata.

## Additional absence review requested by root

Actually opened root's `root-33.71.4-context.png`. For `33.71.4`, the initial lam upright and head are entirely right of the red immutable right boundary. Only its leftgoing base/connector remains inside. I see no useful lam stem body inside the box, so withholding for absent initial target body is justified; inventing a lam slot from the surviving connector would misrepresent the visible target. This is a visual second opinion, not an annotation write.

## Actual-view evidence

All paths below are relative to this report directory. SHA256 values were read from the image bytes after actual viewing. Original sheets were prepared by root; the additional absence context was also prepared by root. The seven `root-clip-second-opinion-*` files were generated solely to expose immutable-box context and magnify boundary cases, without editing the source artwork. Context sheets use red rectangles; detail images use a one-pixel red boundary guide over nearest-neighbor source pixels.

| Image | Phase | Actual viewed word IDs | SHA256 |
|---|---|---|---|
| [representatives-original-001.png](representatives-original-001.png) | original inspection | 12.83.3, 17.69.18, 60.4.2, 11.34.7, 57.8.1, 58.11.5 | `2018d80f7d86206c46b4ee19d5584c9c513fe2f661ab0aea97e4beb47e561aee` |
| [representatives-original-002.png](representatives-original-002.png) | original inspection | 65.6.21, 69.12.1, 5.19.6, 6.119.1, 9.38.4, 11.64.4 | `d6162507977b3d66fc126594e0374f496164c00cc43be98392d0d235879ac3bd` |
| [representatives-original-003.png](representatives-original-003.png) | original inspection | 12.9.6, 20.53.6, 26.162.1, 43.62.4, 44.18.6, 55.31.1 | `4a1f629a31c169312f6f515bcda0253fd0f46973387c298c48da943608d54766` |
| [representatives-original-004.png](representatives-original-004.png) | original inspection | 61.12.1, 2.168.13, 2.187.1, 2.247.7, 3.31.9, 4.4.6 | `e88180ff68ead812c91f9eea1c017a0290fab1d4f5f59b074654a362bf347a76` |
| [representatives-original-005.png](representatives-original-005.png) | original inspection | 4.5.7, 4.26.3, 4.91.28, 4.176.43, 5.76.8, 12.98.3 | `b499b3e298a5dfabafa31cb306e7880eb36f3ab218f2709358a63be1b60cf591` |
| [root-clip-second-opinion-001.png](root-clip-second-opinion-001.png) | immutable-box context | 60.4.2, 57.8.1, 58.11.5, 65.6.21, 69.12.1, 5.19.6 | `90f87d22825ba9e05ddc65f3272e129f21b80902908738e0b9be72c81e824ccd` |
| [root-clip-second-opinion-002.png](root-clip-second-opinion-002.png) | immutable-box context | 9.38.4, 11.64.4, 12.9.6, 26.162.1, 43.62.4, 44.18.6 | `09c80b0f2aa984113481cb0c9e92e4dc07451dd07c683feb2aea30afe7a295a2` |
| [root-clip-second-opinion-003.png](root-clip-second-opinion-003.png) | immutable-box context | 55.31.1, 61.12.1, 2.168.13, 2.247.7, 3.31.9, 4.4.6 | `2579a501800e622b9914f263e225b49b5a80d68fd91fd4a7508b2a5b6ecc2de3` |
| [root-clip-second-opinion-004.png](root-clip-second-opinion-004.png) | immutable-box context | 4.5.7, 4.26.3, 4.91.28, 4.176.43 | `60c021bf447ceed2cb089a27b656d55722cc19c97a539efea9cee155eac688ab` |
| [root-clip-second-opinion-edge-detail-001.png](root-clip-second-opinion-edge-detail-001.png) | magnified right-edge inspection | 65.6.21, 11.64.4, 12.9.6, 2.247.7 | `d2ea17cd10ec020c9ab7c37ce3a22fc2d148f574c5904a876dbf535af89eaef0` |
| [root-clip-second-opinion-edge-detail-002.png](root-clip-second-opinion-edge-detail-002.png) | magnified right-edge inspection | 4.4.6, 4.26.3, 4.91.28 | `bdfe441c0955e224d281c127fbf91e6e8f21f605347fe5753ba2b62d0ca524e3` |
| [root-clip-second-opinion-edge-detail-003.png](root-clip-second-opinion-edge-detail-003.png) | magnified right-edge inspection | 44.18.6 | `440608afd505ef4b49d91cb187d239c5ed9ddd44dc1dc4e1567f90b281f8c38b` |
| [root-33.71.4-context.png](root-33.71.4-context.png) | absent-lam second opinion | 33.71.4 | `5bcb5cbe041811c9409f77288176072b403bfaa2a2f13fab4b0b5860aec5d266` |

Root retains ownership of metadata reconciliation and preservation of before-files. This review makes no Checkpoint A completion claim.
