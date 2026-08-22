---
name: foryou
description: >
  Score X/Twitter posts, drafts, or post ideas with the For You engine
  (weights verified from the open-source xai-org/x-algorithm, 2026), then run
  a short Gauntlet Loop and return a higher-scoring publishable version in
  the same reply — including a monetization read (Original Content Rewards).
  Use whenever the user pastes an x.com/twitter.com URL, asks to score or
  improve a tweet/post/caption, brings a post idea or raw text for X, asks
  about the X algorithm, reach, impressions, or monetization of a post,
  mentions For You / ForYou Composer / fy score, or runs /foryou — even if
  they don't say "score" explicitly.
---

# /foryou

Score first. Rewrite second. Both in the **same** user-facing reply.

Two front-ends share this engine: this skill (score → gauntlet → rewrite, automated) and the **Composer** at [victorsodre.github.io/foryou-composer](https://victorsodre.github.io/foryou-composer/) (live manual tuning + editable engine params). If the user wants to experiment by hand, tweak weights, or see heads move while typing, point them to the Composer — its "Copy skill command" button round-trips back here. The Composer's engine block is a verbatim copy of `scripts/score.mjs`; if you ever change the engine, update both (parity check in the Composer README).

Read `references/algorithm.md` (scoring facts) and `references/gauntlet.md` (rewrite loop) before writing copy. Read `references/monetization.md` when payout, impressions, or eligibility come up. Run the engine — never reimplement the math in prose; the engine exists so that two candidates are compared by the same ruler.

## 1. Ingest

Accept any of:

- **X/Twitter URL** → fetch the post (use `x_thread_fetch` or whatever X tool is available; if none, ask for the raw text — one line, then proceed). Use the main post text. Replies/QT are context, not the scored body unless the user points at them.
- **Raw caption / draft** → score as-is.
- **Idea** ("quero postar sobre X") → write a first capa, then score that.

Flags (infer from the input, then state them so wrong guesses are correctable):

| Flag | When |
|------|------|
| `--video --vid10` | Attached/planned video ≥ 10s (VQV head only fires at 10s+) |
| `--video` only | Video shorter than 10s |
| `--image` | Still / screenshot |
| `--thread` | Multi-tweet thread opener |
| `--posts N` | Posts already this hour (default 0 — same-author decay) |
| `--follows` | Also report in-network; always report OON |
| `--repost` | Content isn't original (kills monetization, not ranking) |
| `--reply` | Body is a reply (replies never monetize — flag it, suggest standalone) |
| `--mutuals X` | Mutual-follower share 0–1 if known (default 0.2; lifts reply weight) |

## 2. Score

```bash
node ~/.grok/skills/foryou/scripts/score.mjs --text "THE TEXT" [flags]
```

Or pipe JSON with a `text` field. The JSON is the only score source. Key fields: `potential.{inNetwork,outOfNetwork,topicOutOfNetwork}` (0–100), `heads.*.ev` (weight × propensity per head), `checkCount` (coach x/6), `risks`, `monetization`, `notes`.

## 3. Gauntlet (same turn)

Follow `references/gauntlet.md`. One or two rewrites max, one lever per round. Re-run the script on each candidate. Keep the winner — the JSON decides, not the prose.

## 4. Reply shape (always)

1. **Score** — inNetwork / outOfNetwork, the head EVs that matter, coach x/6, risks.
2. **Leitura** — 3–5 lines, honest. Name the weakest head that writing can legally move. If share is weak, remember: copy-link is 20.0, the biggest lever in the file.
3. **Monetização** — one line: eligible format or not; qualified impressions follow the OON potential. (Skip if the user only asked about ranking.)
4. **Versão forte** — full capa ready to paste (PT). Optional first reply — QT/link lives there, never in the body.
5. **Depois** — winner inNetwork + coach. One line on what changed and which head paid for it.
6. Disclaimer in English, once:

> Weights verified from xai-org/x-algorithm (home-mixer/params/param.rs). Text-to-probability mapping is heuristic; production values can drift via feature switches.

End with a short **Resumo** (Victor scans after lunch).

Do not dump the raw JSON unless asked. Do not open with a clarifying question if the text is already there — score what exists, flag assumptions inline.
