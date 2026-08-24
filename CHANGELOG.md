# Changelog

Weights in `param.rs` are not a knob. Heuristic mapping is. This file records which layer moved.

## 0.2 — 2026-08-24

Engine. **Weights unchanged** (no casual retune of W / ADJ / CAL).

- Isolate **text→p** (heuristic) from **Σ w·p** (verified param.rs) in code and JSON (`propensities` vs `heads.*.ev`)
- Thread mode: opener ≠ mid (`--thread` vs `--thread-mid`). For You sees the opener; mid withholds opener click/reply bonuses
- URL-in-body risk is structured and carries action `mova pro reply`
- Light anti-cliché / hype-voice heuristic (labeled note + small amplify nudge; not a Phoenix head)
- Gap-log scaffold + drift note
- Self-check: ENGINE parity, weight freeze, fixtures, isolation

## 0.1 — 2026-08-14

First public release. Composer + skill.

- Weights verified from xai-org/x-algorithm (`home-mixer/params/param.rs`)
- A URL in the body earns no share EV — readers click out instead of copy-linking. It raises a `link in body` risk. The `openLink` head (+0.2, real in param.rs) is kept, honest and small. The link belongs in the first reply.
