# Tahqeeq working agreement

This repository is a Quran-judging product. Preserve its religious text,
scoring, competition, evidence, and device-preference contracts. Do not turn a
proposal into a competition rule. Keep unresolved product or rules choices in
`docs/UNDECIDED_DECISIONS.md`.

## Confidence is a release gate

For a material plan, research conclusion, architecture choice, or visible UI
change, report confidence in three parts: practicality, architecture/data
safety, and visual certainty.

- **85-100:** implementation-ready after the named checks pass.
- **70-84:** promising, but prototype or gather browser/source evidence before
  treating it as production-ready.
- **Below 70:** narrow, defer, or reject the proposal. State the unresolved risk
  plainly.

If a score is low, first try to improve it with primary sources, comparable
product patterns, repository evidence, and a focused prototype. If that does
not resolve the uncertainty, be transparent instead of inflating the score.
Confidence is not proof: distinguish verified facts, product claims,
inference, and visual judgment.

## Visible UI and release gates

- Work in one coherent component or slice at a time.
- State what is retained, recomposed, and removed when redesigning a surface.
- Check the relevant desktop and compact viewports in a real browser. Passing
  lint, overflow, or keyboard checks is not visual approval.
- Present visible changes for explicit approval before committing or
  publishing unless the user has explicitly asked to skip that checkpoint.
- Preserve unrelated work in a dirty worktree.
- Release in order: scoped tests, full validation where proportionate, diff
  review, commit, push, publish, then verify the hosted result.

Use `docs/DESIGN_GRAMMAR.md` for the product's visual and interaction rules.
