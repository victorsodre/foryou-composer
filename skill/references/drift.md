# Drift

Two layers. They drift for different reasons. Do not "fix" one by retuning the other.

## Verified — Σ w·p

Weights and adjustments from [`xai-org/x-algorithm`](https://github.com/xai-org/x-algorithm) `home-mixer/params/param.rs` (Jan 2026 drop; Phoenix May 2026). The engine's `expectedValue(p)` is this sum. `W`, `ADJ`, and squash `K` are frozen in the self-check.

If X ships a new param.rs, copy the new constants, note the commit here and in CHANGELOG, do not interpolate "what we wish the weight was."

## Heuristic — text → p

Ours. Labeled. Maps draft text to action probabilities (`analyze` → `propensities`). Production Phoenix p-values can also drift via feature switches — that is the disclaimer, not a license to invent heads.

Known heuristic traps (watch, don't silent-retune W):

- `\brepo\b` inside the utility regex matches "Repo em risco." Share EV on that post is partly a false positive. Log it; don't hide it by shrinking `shareCopyLink`.
- Thread opener click bonus on a thin body can trip the clickbait-shaped guard. Mid-thread withholds that bonus — opener ≠ mid, including this side effect.
- The cliché list is short on purpose. Stale phrases miss; overgrown lists start flagging the account's actual voice ("não é X. É Y." is voice, not a template).

## When a gap-log case matures

1. Write the outcome. Do not invent. Early vanity counts stay `WAITING`.
2. Decide which layer moved: mapping (text→p) or weights (param.rs dump) or the live switch.
3. If heuristic, patch the mapping and log it. If weights, wait for a new dump.
4. Never casual-retune `W` to chase a handful of posts.

## What this file does not claim

- Absolute impression prediction
- Mature metrics on a post that has not matured
- That the cliché list is complete
