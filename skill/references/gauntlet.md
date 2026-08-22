# Gauntlet Loop — For You edition

Source pattern: Shumer's gauntlet-loop. Here the **artifact is a post**, the **bar is the score JSON**. The point of the gauntlet is that nobody argues taste: the engine decides, the critic re-runs it, the builder loses gracefully.

## Objective

A publishable @ovictor post that raises **For You potential** and **coach count** without mute-bait, without clickbait-shaped hooks, and without breaking the constraints in `references/algorithm.md`.

## Bar (inspectable — run the script, trust the JSON)

Run `scripts/score.mjs` on every candidate. A rewrite wins only if **all** hold:

- `potential.inNetwork` ≥ original, and preferably ≥ 70
- `checkCount` ≥ original, target 6/6
- `risks` is empty
- `monetization.eligibleFormat` is true (standalone original post — not a reply, not a repost)
- `heads.share.ev` only rises **without** a URL in the body (link lives in the first reply)
- No "clickbait-shaped" note: if the hook got stronger, the payload must have too — the click-dwell/low-fav penalty is real math in prod, and a hotter hook over the same thin body scores better here but dies there
- First line still passes the teste do leigo

## Boundaries

- Same turn. Max **2** rewrite rounds — the third rewrite is always worse, ship the winner.
- Do not spawn subagents unless the user says "gauntlet fundo".
- Do not invent algorithm weights; the engine is the only score source.
- Do not add private brand names or a body link to juice share.
- Stop early if the second rewrite doesn't beat the first on `inNetwork` **or** repeats the same failed trick.

## Roles (same conversation, no ceremony)

1. **Lead** — parse input, set flags (video/image/thread/posts/repost/reply), run the script on the original.
2. **Builder** — rewrite targeting the weakest head **that writing can legally move** (see playbook). One lever per round, not five.
3. **Critic** — re-run `score.mjs` on the rewrite. Trust the JSON, not the builder's claim. Check the clickbait guard: did the hook improve more than the payload?
4. **Integration** — ship original score + winning rewrite + one line on why it won.

## Weak-head playbook (what writing can actually move)

| Weak head | Weight it feeds | Legal lift |
|-----------|----------------|------------|
| reply | 5.0 (→20 w/ mutuals) | Real judgment question on the last line — não "curte aí?", mas uma pergunta que pede opinião |
| share | **20.0** copy-link | Make it referencable: guia, método, tabela, número que a pessoa quer mandar no grupo. Never via URL in body |
| attention | click 0.4 + dwell 0.004/s | Printable first line 24–90 chars; structure that holds the read (list, code, concrete number) |
| amplify | quote 5.0 + rt 1.0 | One quotable sentence — a take someone wants to stamp their opinion on |
| follow | 4.0 | Utility + voice: the post should read like a sample of the account |
| fav | 0.5 | Ignore. Decorative. Anyone optimizing likes is playing the 2023 game |

## When not to rewrite hard

- Original already ≥ 75 in-network and 6/6 — say so, offer a micro-tweak only. Don't sand off the voice to win 2 points.
- Input is an idea, not copy — write a full capa (and optional first reply), then score that. The gauntlet needs an artifact.
- The weakest head is one writing can't move (mutuals share, posting history) — say that honestly instead of torturing the text.
