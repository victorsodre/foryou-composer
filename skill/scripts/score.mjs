#!/usr/bin/env node
// For You engine 0.2 — weights verified from xai-org/x-algorithm (home-mixer/params/param.rs, Jan 2026 drop).
// 0.1 (2026-08-14): first public release. URL in body earns no share EV and raises a risk —
// a link in the body is a click exit, not a share driver; it belongs in the first reply.
// 0.2 (2026-08-24): isolate text→p (heuristic) from Σ w·p (param.rs). Thread opener ≠ mid.
// URL-in-body risk carries action "mova pro reply". Light anti-cliché/voice heuristic.
// Weights unchanged — do not casual-retune W because a heuristic p looks off.
//
// Usage:
//   node score.mjs --text "..." [--image] [--video] [--vid10] [--thread] [--thread-mid]
//                  [--posts N] [--follows] [--second] [--repost] [--reply] [--mutuals 0.2]
//   echo '{"text":"...","hasVideo":true,"vid10":true}' | node score.mjs
//   node score.mjs --help
//
// Output: JSON only. potential.inNetwork / outOfNetwork / topicOutOfNetwork are 0–100.
// Scores are comparative (candidate A vs candidate B), not absolute predictions.
// `propensities` is text→p (ours). `heads.*.ev` / `ev` are Σ w·p (verified weights).

/* ============================================================================
   ENGINE-START (0.2) — verbatim copy in index.html (only `export ` removed).
   Keep the two in sync. Self-check: node skill/scripts/self-check.mjs
   ========================================================================= */
const ENGINE_VERSION = "0.2";

// ---------------------------------------------------------------- weights (param.rs)
// Verified layer. Do not retune these to chase a handful of posts.
const W = {
  fav: 0.5,
  reply: 5.0,
  replyMutualBoost: 15.0, // BidirectionalFollowReplyWeightBoost
  retweet: 1.0,
  quote: 5.0,
  share: 2.0, // share button
  shareDm: 5.0,
  shareCopyLink: 20.0, // largest positive weight in the file
  followAuthor: 4.0,
  click: 0.4,
  openLink: 0.2,
  photoExpand: 0.05,
  videoOpen: 0.05,
  vqv: 0.05, // video quality view (video ≥ 10s)
  dwellContPerSec: 0.004, // ContDwellTimeWeight
  profileClick: 0.0,
  neg: { notInterested: -43.2, block: -31.2, mute: -58.8, report: -234.0, notDwelled: -0.02 },
};

const ADJ = {
  authorDecay: 0.5, // AuthorDiversityDecay
  authorFloor: 0.25, // AuthorDiversityFloor
  oon: 0.75, // OonWeightFactor
  topicOon: 0.5, // TopicOonWeightFactor
};

const CAL = { K: 6 }; // squash calibration: score = 100·ev/(ev+K). Reference strong post ⇒ ~75. Object so the HTML configurator can tune it live.

// ---------------------------------------------------------------- text signals (heuristic layer — text → features)
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu;
const URL_G = /https?:\/\/[^\s]+/gi; // for .match only
const URL_ONE = /https?:\/\/\S+/i; // for .test (no `g` — global regexes are stateful in .test)
const HASH_G = /#[\p{L}\p{N}_]+/gu;
const BAIT_RE =
  /\b(like if|like this|follow me|follow for|rt this|rt if|retweet if|smash (the )?like|drop a like|link in bio|curte a[ií]|segue l[aá]|d[aá] (um )?rt|marca (um|a) amigo)\b/i;
const Q_END = /[?？]\s*$/;
const REAL_Q = /\b(what|why|how|when|where|who|which|should|would|could|is|are|do|does|did|can|o que|por ?que|como|quando|onde|qual|quais|quem|ser[aá]|vale|cabe|faz sentido|concorda|discorda|e voc[eê]s?|ou n[aã]o)\b/i;
const CODEISH =
  /```|`[^`]+`|\bprompt\b|\bconsole\b|\bfunction\b|\bconst\b|\bnpm\b|\bnpx\b|\bpnpm\b|\bgit\b|\bsql\b|\bapi\b|\btypescript\b|\breact\b|\bnext\.?js\b|\bunreal\b|\bv-?ray\b|^\s*[-*]\s|^\s*\d+[.)]\s/im;
const NUMBY = /\d|%/;
const UTIL =
  /\b(guide|guia|checklist|table|tabela|repo|github|resource|recurso|template|how to|como fazer|passo a passo|tutorial|m[eé]todo|f[oó]rmula|atalho|dica|cheat ?sheet|docs?|workflow|setup)\b/i;

// Light anti-cliché / hype-voice list. Heuristic, not a Phoenix head. Keep short on purpose.
// Do not flag "não é X. É Y." — that is this account's voice, not a template.
const CLICHE_RE =
  /\b(let'?s dive in|game[- ]?changer|unlock your|in today'?s world|here'?s the kicker|at the end of the day|secret sauce|never been easier|you won'?t believe|stop scrolling|vamos explorar|[eé] importante (ressaltar|destacar)|desvende|revolucion[ae]|o futuro [eé] agora|nunca foi t[aã]o f[aá]cil|neste artigo|sem mais delongas)\b/i;
const HYPE_RE =
  /\b(insane|mind-?blown|unleash(?:ing)?|crushing it|must-?see|insano|surpreendente|revolucion[aá]ri[oa])\b/gi;

function countEmoji(s) {
  // Grapheme-aware when available (Node ≥ 16), so 👨‍👩‍👧 counts once, not thrice.
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    let n = 0;
    for (const { segment } of new Intl.Segmenter("und", { granularity: "grapheme" }).segment(s)) {
      if (EMOJI_RE.test(segment)) n++;
      EMOJI_RE.lastIndex = 0;
    }
    return n;
  }
  return (s.match(EMOJI_RE) || []).length;
}

function analyze(text) {
  const trimmed = (text || "").trim();
  const chars = [...trimmed].length;
  const lines = trimmed.split(/\n/);
  const first = (lines[0] || "").trim();
  const last = (lines.filter((l) => l.trim()).pop() || "").trim();
  const urls = trimmed.match(URL_G) || [];
  const hashes = (trimmed.match(HASH_G) || []).length;
  const emojis = countEmoji(trimmed);
  const letters = trimmed.replace(/[^\p{L}]/gu, "");
  const uppers = letters.replace(/[^\p{Lu}]/gu, "");
  const capsRatio = letters.length ? uppers.length / letters.length : 0;

  const mid = trimmed.slice(0, Math.floor(trimmed.length * 0.7));
  const linkMid = urls.some((u) => mid.includes(u));
  const linkEnd = urls.length > 0 && !linkMid;

  const question = Q_END.test(last) && (REAL_Q.test(last) || [...last].length > 12);
  const softQuestion = !question && last.includes("?");
  const saveable = CODEISH.test(trimmed) || (NUMBY.test(trimmed) && /[-*•]|\d+[.)]/.test(trimmed));
  const numbers = NUMBY.test(trimmed);
  const util = UTIL.test(trimmed) || /github\.com/i.test(trimmed);
  const printable = first.length >= 18 && first.length <= 90 && !URL_ONE.test(first);
  const hook = first.length >= 24 && first.length <= 110;

  const baitPhrase = BAIT_RE.test(trimmed);
  const tooManyHash = hashes > 2;
  const tooManyEmoji = emojis >= 6 || (chars > 0 && emojis / Math.max(chars, 1) > 0.12);
  const allCaps = letters.length >= 12 && capsRatio > 0.62;

  const clicheHit = CLICHE_RE.test(trimmed);
  CLICHE_RE.lastIndex = 0;
  HYPE_RE.lastIndex = 0;
  const hypeHits = trimmed.match(HYPE_RE) || [];
  const cliche = clicheHit || hypeHits.length >= 2;

  const risks = [];
  if (allCaps) risks.push({ id: "all-caps", label: "ALL CAPS" });
  if (baitPhrase) risks.push({ id: "bait", label: "like/follow/RT bait" });
  if (tooManyHash) risks.push({ id: "hashtag-spam", label: "hashtag spam (>2)" });
  if (tooManyEmoji) risks.push({ id: "emoji-spam", label: "emoji spam" });
  // Click-exit, not a share driver. Coach action is the protocol, not a weight.
  if (urls.length > 0) risks.push({ id: "url-in-body", label: "link in body", action: "mova pro reply" });

  const baitSignals = [allCaps, baitPhrase, tooManyHash, tooManyEmoji].filter(Boolean).length;

  return {
    trimmed, chars, first, last, urls: urls.length, hashes, emojis, capsRatio,
    linkMid, linkEnd, question, softQuestion, saveable, numbers, util, printable, hook,
    bait: baitSignals > 0, baitLevel: baitSignals >= 2 || baitPhrase ? 2 : baitSignals, risks,
    cliche, hypeHits: hypeHits.length,
  };
}

// ---------------------------------------------------------------- propensities (heuristic layer — features → p ∈ [0,1])
// Isolated from Σ w·p. Fix the mapping here when a gap-log case misses; do not touch W.
function propensities(A, o, notes) {
  const p = {};
  const role = o.threadRole || null;

  // reply — a real judgment question is the one lever writing controls directly
  p.reply = 0.08;
  if (A.question) { p.reply += 0.35; notes.push("+ reply: real question at the end"); }
  else if (A.softQuestion) { p.reply += 0.12; notes.push("+ reply: '?' without a clear interrogative"); }
  if (role === "opener") p.reply += 0.04;

  // amplify — retweet (1.0) + quote (5.0): quotable takes travel
  p.amplify = 0.06;
  if (A.printable) p.amplify += 0.08;
  if (A.util) p.amplify += 0.08;
  if (A.numbers && A.chars > 80) p.amplify += 0.04;

  // share via copy link (20.0!) — people copy links to useful, referencable posts
  p.shareCopy = 0.04;
  if (A.util) { p.shareCopy += 0.3; notes.push("+ share: referencable utility (copy-link weight is 20.0)"); }
  if (A.saveable) p.shareCopy += 0.12;
  if (A.linkEnd) { p.shareCopy -= 0.05; notes.push("\u2212 share: link in body \u2014 readers click out instead of copy-linking; move it to the first reply"); }
  if (A.linkMid) { p.shareCopy -= 0.08; notes.push("\u2212 share: link mid-body interrupts the read \u2014 move it to the first reply"); }

  // share via DM (5.0) + share button (2.0)
  p.shareDm = 0.05 + (A.util ? 0.1 : 0) + (A.numbers && A.chars > 80 ? 0.05 : 0);
  p.shareBtn = 0.05 + (A.util ? 0.08 : 0);

  // click into post (0.4) — the hook's job. Opener-only: For You sees tweet 1, not tweet 4.
  p.click = 0.25;
  if (A.hook) { p.click += 0.15; notes.push("+ click: hook-length first line"); }
  if (role === "opener") { p.click += 0.1; notes.push("+ click: thread opener"); }
  else if (role === "mid") { notes.push("thread mid: not the For You opener — opener click/reply bonuses withheld"); }
  if (A.chars < 40 && !o.hasImage && !o.hasVideo) { p.click -= 0.1; notes.push("− attention: < 40 chars and no media"); }

  // continuous dwell — seconds, paid at 0.004/s (small but real)
  let dwellSec = 2 + A.chars / 40;
  if (o.hasImage) dwellSec += 2;
  if (o.hasVideo && o.vid10) dwellSec += 8;
  if (A.saveable) { dwellSec += 4; notes.push("+ dwell: saveable structure (code/list/numbers) holds the read"); }
  p.dwellSec = Math.min(dwellSec, 30);

  // media heads
  p.photoExpand = o.hasImage ? 0.35 : 0;
  p.videoOpen = o.hasVideo ? 0.4 : 0;
  p.vqv = o.hasVideo && o.vid10 ? 0.3 : 0;

  // follow author (4.0) — utility posts convert profile visits into follows
  p.follow = 0.02 + (A.util ? 0.06 : 0) + (A.printable ? 0.02 : 0);

  // fav (0.5) — decorative, computed for honesty
  p.fav = 0.3 + (A.printable ? 0.1 : 0) + (o.hasImage ? 0.08 : 0) + (A.bait ? 0.05 : 0);

  // open link (0.2)
  p.openLink = A.linkEnd || A.linkMid ? 0.15 : 0; // real head, kept honest \u2014 but small; the link tax lives in shareCopy

  // light anti-cliché / voice — nudge amplify, do not touch W
  if (A.cliche) {
    p.amplify = Math.max(0, p.amplify - 0.04);
    notes.push("− voice: cliché/hype phrasing (heuristic; not a Phoenix head; weights unchanged)");
  }

  // negative propensities — small p, huge weights; dwell-regret gates amplify these in prod
  if (A.baitLevel >= 2) {
    p.notInterested = 0.05; p.mute = 0.03; p.report = 0.002;
    notes.push("− bait: mute/report propensity up (dwell-regret gates make this fatal in prod)");
  } else if (A.baitLevel === 1) {
    p.notInterested = 0.02; p.mute = 0.008; p.report = 0.0005;
    notes.push("− mild bait signal");
  } else {
    p.notInterested = 0.004; p.mute = 0.001; p.report = 0.0001;
  }
  p.notDwelled = A.chars < 40 && !o.hasImage && !o.hasVideo ? 0.5 : 0.2;

  Object.keys(p).forEach((k) => { if (k !== "dwellSec") p[k] = Math.max(0, Math.min(1, p[k])); });
  return p;
}

// ---------------------------------------------------------------- scoring (verified layer — p → Σ w·p)
// Reads weights + propensities + scoring flags. Does not read the draft text.
function squash(ev) {
  if (ev <= 0) return 0;
  return Math.round((100 * ev) / (ev + CAL.K));
}

function sameAuthorMult(nAlready, forceSecond) {
  const n = forceSecond ? Math.max(1, nAlready || 1) : nAlready || 0;
  return ADJ.authorFloor + (1 - ADJ.authorFloor) * Math.pow(ADJ.authorDecay, n);
}

function expectedValue(p, o) {
  const replyW = W.reply + W.replyMutualBoost * o.mutualShare;
  const heads = {
    reply: { p: r2(p.reply), ev: r3(replyW * p.reply) },
    amplify: { p: r2(p.amplify), ev: r3((W.retweet + W.quote) * p.amplify) },
    share: {
      p: r2(Math.max(p.shareCopy, p.shareDm, p.shareBtn)),
      ev: r3(W.shareCopyLink * p.shareCopy + W.shareDm * p.shareDm + W.share * p.shareBtn),
    },
    attention: {
      p: r2(p.click),
      ev: r3(
        W.click * p.click + W.dwellContPerSec * p.dwellSec + W.openLink * p.openLink +
        W.photoExpand * p.photoExpand + W.videoOpen * p.videoOpen + W.vqv * p.vqv
      ),
    },
    follow: { p: r2(p.follow), ev: r3(W.followAuthor * p.follow) },
    fav: { p: r2(p.fav), ev: r3(W.fav * p.fav) },
  };
  let ev =
    heads.reply.ev + heads.amplify.ev + heads.share.ev + heads.attention.ev + heads.follow.ev + heads.fav.ev;
  const negEv =
    W.neg.notInterested * p.notInterested + W.neg.mute * p.mute + W.neg.report * p.report +
    W.neg.notDwelled * p.notDwelled;
  ev += negEv;
  return { heads, ev, negEv };
}

function roundPropensities(p) {
  const out = {};
  for (const k of Object.keys(p)) out[k] = k === "dwellSec" ? r3(p[k]) : r2(p[k]);
  return out;
}

export function scoreDraft(opts) {
  const o = {
    text: opts.text || "",
    hasImage: !!opts.hasImage,
    hasVideo: !!opts.hasVideo,
    vid10: !!opts.vid10,
    isThread: !!opts.isThread || !!opts.threadMid,
    threadMid: !!opts.threadMid,
    postsHour: Number.isFinite(Number(opts.postsHour)) ? Math.max(0, Number(opts.postsHour)) : 0,
    follows: !!opts.follows,
    forceSecond: !!opts.forceSecond,
    isRepost: !!opts.isRepost,
    isReply: !!opts.isReply,
    mutualShare: Number.isFinite(Number(opts.mutualShare))
      ? Math.max(0, Math.min(1, Number(opts.mutualShare)))
      : 0.2,
  };
  o.threadRole = o.threadMid ? "mid" : o.isThread ? "opener" : null;
  const A = analyze(o.text);
  const notes = [];

  if (!A.trimmed) return result(o, A, {}, { ev: 0, heads: zeroHeads() }, notes);

  const p = propensities(A, o, notes);
  const S = expectedValue(p, o);
  let ev = S.ev;
  const negEv = S.negEv;
  const heads = S.heads;

  // After Σ w·p: clickbait-shaped guard mirrors ClickDwellLowFavRatePenalty.
  // Hybrid (reads substance from text + p.click) — labeled, not a weight retune.
  const substance = A.saveable || A.util || (A.numbers && A.chars > 100);
  if (p.click >= 0.35 && !substance && A.chars < 120) {
    ev *= 0.85;
    notes.push("− clickbait-shaped: hook without payload (click-dwell/low-fav penalty exists in prod)");
  }

  ev = Math.max(0, ev);

  const same = sameAuthorMult(o.postsHour, o.forceSecond);
  notes.push(`multipliers: same-author ×${same.toFixed(4)} · oon ×${ADJ.oon} · topic-oon ×${ADJ.topicOon}`);

  return result(o, A, p, { ev: r3(ev), negEv: r3(negEv), heads, same }, notes);
}

function result(o, A, p, S, notes) {
  const same = S.same ?? sameAuthorMult(o.postsHour, o.forceSecond);
  const ev = S.ev ?? 0;
  const checks = {
    question: !!A.question,
    save: !!(A.saveable || A.util),
    print: !!A.printable,
    vid: !o.hasVideo || !!o.vid10,
    bait: !A.bait,
    first: o.postsHour === 0 && !o.forceSecond,
  };
  const monetizable = !o.isRepost && !o.isReply;
  const mNotes = [];
  if (o.isReply) mNotes.push("replies earn nothing since early 2026 — post this as a standalone post");
  if (o.isRepost) mNotes.push("reposted/unoriginal content fails the Original Content Rewards test (Sep 8, 2026)");
  if (monetizable) mNotes.push("payout ∝ qualified impressions (unique Premium home-timeline views, ≥50% visible) — OON reach is the growth lever");

  return {
    engine: `foryou ${ENGINE_VERSION} (xai-org/x-algorithm param.rs)`,
    engineVersion: ENGINE_VERSION,
    empty: !A.trimmed,
    chars: A.chars,
    first: A.first,
    last: A.last,
    threadRole: o.threadRole,
    layers: { heuristic: "text→p", verified: "Σw·p from param.rs" },
    propensities: Object.keys(p).length ? roundPropensities(p) : {},
    heads: S.heads,
    ev,
    potential: {
      inNetwork: squash(ev * same),
      outOfNetwork: squash(ev * same * ADJ.oon),
      topicOutOfNetwork: squash(ev * same * ADJ.topicOon),
    },
    multipliers: { sameAuthor: r3(same), oon: ADJ.oon, topicOon: ADJ.topicOon },
    checks,
    checkCount: Object.values(checks).filter(Boolean).length,
    signals: {
      question: A.question, softQuestion: A.softQuestion, saveable: A.saveable, utility: A.util,
      printableFirstLine: A.printable, hookLength: A.hook, numbers: A.numbers,
      linkMid: A.linkMid, linkEnd: A.linkEnd, hashtags: A.hashes, emojis: A.emojis,
      cliche: !!A.cliche, threadRole: o.threadRole,
    },
    risks: A.risks,
    monetization: { eligibleFormat: monetizable, assumedOriginal: !o.isRepost, notes: mNotes },
    notes,
    disclaimer:
      "Weights verified from xai-org/x-algorithm (home-mixer/params/param.rs). Text-to-probability mapping is heuristic and isolated from Σ w·p; production values can drift via feature switches.",
  };
}

function zeroHeads() {
  const z = { p: 0, ev: 0 };
  return { reply: { ...z }, amplify: { ...z }, share: { ...z }, attention: { ...z }, follow: { ...z }, fav: { ...z } };
}

function formatRisk(r) {
  if (typeof r === "string") return r;
  if (!r || !r.label) return "";
  return r.action ? `${r.label} \u2192 ${r.action}` : r.label;
}

const r2 = (n) => Math.round(n * 100) / 100;
const r3 = (n) => Math.round(n * 1000) / 1000;
/* ==== ENGINE-END ========================================================= */

export { ENGINE_VERSION, analyze, propensities, expectedValue, formatRisk, W, ADJ, CAL };

// ---------------------------------------------------------------- CLI
const HELP = `foryou score ${ENGINE_VERSION} — For You potential for a post draft
  --text "..."     the post body (or pipe raw text / JSON with a "text" field)
  --image          has a still image        --video      has video
  --vid10          video is ≥ 10s           --thread     thread opener
  --thread-mid     mid-thread post (not the opener; opener bonuses withheld)
  --posts N        posts already this hour  --second     force 2nd-post decay
  --follows        score as in-network      --mutuals X  mutual-follower share 0..1 (default 0.2)
  --repost         not original content     --reply      body is a reply (kills monetization)
JSON out: propensities (text→p), heads{reply,amplify,share,attention,follow,fav} (Σw·p),
  ev, potential{inNetwork,outOfNetwork,topicOutOfNetwork}, checks(6), signals, risks, monetization, notes.`;

function parseArgs(argv) {
  const o = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--text") o.text = argv[++i] ?? "";
    else if (a === "--image") o.hasImage = true;
    else if (a === "--video") o.hasVideo = true;
    else if (a === "--vid10") o.vid10 = true;
    else if (a === "--thread") o.isThread = true;
    else if (a === "--thread-mid") o.threadMid = true;
    else if (a === "--posts") o.postsHour = argv[++i];
    else if (a === "--follows") o.follows = true;
    else if (a === "--second") o.forceSecond = true;
    else if (a === "--repost") o.isRepost = true;
    else if (a === "--reply") o.isReply = true;
    else if (a === "--mutuals") o.mutualShare = argv[++i];
    else if (a === "--help" || a === "-h") { console.log(HELP); process.exit(0); }
  }
  return o;
}

async function main() {
  let opts = parseArgs(process.argv);
  if (!opts.text && !process.stdin.isTTY) {
    const buf = await new Promise((resolve) => {
      const chunks = [];
      process.stdin.on("data", (c) => chunks.push(c));
      process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
    const raw = buf.trim();
    if (raw.startsWith("{")) {
      try {
        const j = JSON.parse(raw);
        opts = { ...opts, ...j, text: j.text ?? opts.text };
      } catch (e) {
        console.error(`stdin looked like JSON but failed to parse: ${e.message}`);
        process.exit(1);
      }
    } else if (raw) {
      opts.text = raw;
    }
  }
  process.stdout.write(JSON.stringify(scoreDraft(opts), null, 2) + "\n");
}

if (process.argv[1]?.endsWith("score.mjs")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
