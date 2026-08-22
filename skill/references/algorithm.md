# For You scoring — source of truth (2026)

Verified against `github.com/xai-org/x-algorithm` (Jan 2026 open-source drop; Phoenix model weights released May 2026). Do not invent extra heads or weights — everything the engine uses is below, and `scripts/score.mjs` implements it.

## Pipeline (what actually ranks a post)

Rust codebase, four parts: **Home Mixer** (orchestration) → candidates from **Thunder** (in-network), **Phoenix retrieval** + SimClusters (out-of-network) → **Phoenix ranking** (Grok-based transformer) predicts a probability per action → weighted sum → scoring adjustments → filters.

`Final score = Σ weight_i × P(action_i)` — the weights live in `home-mixer/params/param.rs` and are now **published** (the 2023 repo hid them; the 2026 repo does not).

## Phoenix heads (the real list — nothing else)

- **Engagement:** favorite · reply · repost · quote · share · share via DM · share via copy link
- **Clicks:** post · profile · link · photo expand · video open · quoted post
- **Attention:** video quality view · dwell · dwell time · click dwell time · active seconds
- **Author:** follow author
- **Negative:** not interested · mute author · block author · report · not dwelled

There is **no bookmark head and no screenshot head** in Phoenix. "Reply engaged by author +75" and "reply 13.5" are 2023 heavy-ranker numbers — dead. Ignore any article still quoting them.

## Weights (param.rs, exact values)

| Signal | Weight | | Signal | Weight |
|---|---|---|---|---|
| share via copy link | **+20.0** | | click on post | +0.4 |
| reply (mutual follow) | +5.0 **+15.0** | | open link | +0.2 |
| reply | +5.0 | | photo expand | +0.05 |
| share via DM | +5.0 | | video open / VQV | +0.05 |
| quote | +5.0 | | dwell (per sec) | +0.004 |
| follow from post | +4.0 | | profile click | 0.0 |
| share button | +2.0 | | like/fav | +0.5 |
| repost | +1.0 | | | |

Negatives: report **−234** · mute **−58.8** · not interested **−43.2** · block **−31.2** · non-dwell −0.02.

Read the table before writing: **copy-link share is worth 40 likes**. A post someone copies the link to (to paste in a group chat) beats a post 500 people like. Reply from a mutual is worth 40 likes too. Likes are decorative.

## Scoring adjustments (after the weighted sum)

- **Same-author decay** in one feed: `0.25 + 0.75 × 0.5^n` after `n` of your posts already shown. 2nd → ×0.625, 3rd → ×0.4375, floor 0.25. Spacing posts matters more than volume.
- **Out-of-network:** graph-based OON ×**0.75**; topic-based OON ×**0.5**. Replies and reposts get a sub-1 factor even for followers.
- **New-author boost:** low-impression authors get lifted (PostUnexploredWeight 0.02).

## Two systems the old notes missed

- **Dwell regret** (the "unregretted user-seconds" machinery): a gated system where regretted attention is punished at another scale — report −60 000, mute −15 000, not-interested −10 000 inside the gate. This is why rage-bait and mute-bait don't just underperform, they poison the account.
- **Click-dwell / low-fav penalty:** posts that win clicks and dwell but a low fav rate get an explicit penalty (`ClickDwellLowFavRatePenalty*`). A hook that the body doesn't pay off is now structurally punished — clickbait detection is in the ranking math, not just in policy.

Also reported (consistent with Phoenix being Grok-based, not a param.rs constant): constructive tone gets wider distribution; combative tone gets clipped even when engagement is high.

## Text heuristics → which real head they feed

- Ends with a real judgment question → reply (5.0, up to 20 with mutuals)
- Referencable utility (guia, método, tabela, repo, recurso) → **share via copy link (20.0)** + follow (4.0)
- Code / prompt / list / concrete numbers → dwell (active seconds) + copy-link. "Saveable" is not a head anymore — it pays through these two.
- First line 18–90 chars, no URL → click (0.4) + quotable (5.0). "Screenshotable" pays through share/DM.
- First line 24–110 chars → hook, click ↑
- Under 40 chars, no media → non-dwell risk
- Link mid-body kills the read; link belongs in the first reply
- Hook that the body doesn't pay off → click-dwell/low-fav penalty
- Like bar: computed, then ignored (0.5)

## Coach (6 checks)

1. Real question at the end
2. Saveable substance (code, list, numbers, prompt, or utility)
3. Printable first line
4. Video ≥ 10s or no video
5. No mute-bait (ALL CAPS, like/follow/RT bait, >2 hashtags, emoji spam)
6. First post of the hour (same-author ×1)

## @ovictor posting constraints (do not break these to chase score)

- Body in PT. Technical nouns stay in English.
- No company names, private brands, or internal wiki in the body.
- No link in the body — link / QT in the first reply.
- First line must work for a non-dev (teste do leigo).
- One idea per post. No "like if / RT this".
