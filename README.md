# For You Composer

A single-file, client-only composer that scores a draft against the **X For You ranking** — engine 0.2, weights verified from the open-source [`xai-org/x-algorithm`](https://github.com/xai-org/x-algorithm) (`home-mixer/params/param.rs`, Jan 2026 drop; Phoenix model May 2026).

Live (after you push Pages): `https://victorsodre.github.io/foryou-composer/`

## Two front-ends, one engine

| | Composer (this) | `/foryou` skill |
|---|---|---|
| Where | Browser, `index.html` | Grok chat, `~/.grok/skills/foryou` (public copy: [`skill/`](./skill)) |
| For | Live manual tuning, param experiments | Score → Gauntlet → rewrite, automated |
| Engine | Inline copy of `score.mjs` core | `scripts/score.mjs` |

The engine block in `index.html` (between `ENGINE-START` / `ENGINE-END`) is a **verbatim copy** of the core of `skill/scripts/score.mjs` (only `export` removed). Update `score.mjs` first, then:

```bash
node skill/scripts/self-check.mjs --sync
node skill/scripts/self-check.mjs
```

JSON isolation: `propensities` is text→p (heuristic). `heads.*.ev` / `ev` are Σ w·p (param.rs). Do not retune `W` because a heuristic p looks off.

## What it shows, live

- In-network / out-of-network / topic-OON potential (0–100, squashed EV — never saturates, two candidates always comparable)
- Six heads with their EV contribution: reply · amplify · share (copy-link is the 20.0) · attention · follow · fav (dimmed — 0.5)
- Coach checklist (6) from the @ovictor posting protocol
- Monetization read — Original Content Rewards (Sep 8, 2026): eligible format, reply/repost warnings, bait-kills-payout
- Mute-bait risks + clickbait-shaped warning (mirrors the prod click-dwell/low-fav penalty)
- URL in the body → risk action `mova pro reply` (click-exit, not a share driver)
- Thread opener ≠ mid (`--thread` vs `--thread-mid`)
- Light anti-cliché / hype-voice note (heuristic, not a Phoenix head)
- **Engine params configurator**: every weight editable live, reset to param.rs. Custom params stay in the tab — the skill always runs stock.
- "Copy skill command" — exports your current draft + flags as a ready `score.mjs` command

English-first UI, toggle to PT-BR. No analytics. No `localStorage`. No network calls.

## Honesty

> Weights verified from xai-org/x-algorithm (home-mixer/params/param.rs). Text-to-probability mapping is heuristic and isolated from Σ w·p; production values can drift via feature switches.

Verified in the repo: the full weight table (positives, negatives), same-author decay `0.25 + 0.75·0.5^n`, OON ×0.75, topic-OON ×0.5, dwell-regret gate values, click-dwell/low-fav penalty params, Phoenix head list. **Not** in the repo: our text→probability heuristics (labeled as ours), and the Grok sentiment claim (reported, consistent with Phoenix being Grok-based).

Dead 2023 numbers you'll still see in articles — not used here: bookmark/screenshot heads, "reply 13.5", "reply engaged by author 75".

See [CHANGELOG.md](./CHANGELOG.md), [skill/references/drift.md](./skill/references/drift.md), and [skill/references/gap-log.md](./skill/references/gap-log.md). Gap-log outcomes stay `WAITING` until a post matures — no fake metrics.

**0.2 (2026-08-24).** Weights unchanged. Isolate text→p from Σ w·p. Thread opener ≠ mid. URL-in-body risk carries action `mova pro reply`. Light anti-cliché/voice heuristic. Gap-log scaffold + self-check.

**0.1 (2026-08-14) — first public release.** A URL in the body no longer earns share EV — readers click out instead of copy-linking. It now raises a `link in body` risk instead. The `openLink` head (+0.2, real in param.rs) is kept, honest and small. The link belongs in the first reply.

## Repo

```bash
git clone https://github.com/victorsodre/foryou-composer.git
cd foryou-composer
node skill/scripts/self-check.mjs
```

Pages fallback: Settings → Pages → Deploy from branch → main / root.

### Install the skill

```bash
cp -r skill ~/.grok/skills/foryou   # Grok
# structure is portable — adapt the runner path for other agents
```

## Built by

[x.com/ovictor](https://x.com/ovictor) · [github.com/victorsodre](https://github.com/victorsodre)

Based on the open-source [X algorithm](https://github.com/xai-org/x-algorithm).
