#!/usr/bin/env node
// Engine 0.2 self-check: parity, isolation, fixtures, docs. No network. No X publish.
// Usage:
//   node skill/scripts/self-check.mjs
//   node skill/scripts/self-check.mjs --sync   # copy score.mjs ENGINE block into index.html

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MJS = path.join(ROOT, "skill/scripts/score.mjs");
const HTML = path.join(ROOT, "index.html");
const CHANGELOG = path.join(ROOT, "CHANGELOG.md");
const DRIFT = path.join(ROOT, "skill/references/drift.md");
const GAP = path.join(ROOT, "skill/references/gap-log.md");

const GAP_TEXT = `O agente tocou no arquivo errado.
Diff feio. Repo em risco.

O freio não é “confiar na IA”.
É branch + ler o diff + saber reverter.

Como voce faz para frear isso?`;

const W_FREEZE = {
  fav: 0.5,
  reply: 5.0,
  replyMutualBoost: 15.0,
  retweet: 1.0,
  quote: 5.0,
  share: 2.0,
  shareDm: 5.0,
  shareCopyLink: 20.0,
  followAuthor: 4.0,
  click: 0.4,
  openLink: 0.2,
  photoExpand: 0.05,
  videoOpen: 0.05,
  vqv: 0.05,
  dwellContPerSec: 0.004,
  profileClick: 0.0,
  neg: { notInterested: -43.2, block: -31.2, mute: -58.8, report: -234.0, notDwelled: -0.02 },
};
const ADJ_FREEZE = { authorDecay: 0.5, authorFloor: 0.25, oon: 0.75, topicOon: 0.5 };
const CAL_FREEZE = { K: 6 };

const fails = [];
function ok(cond, msg) {
  if (!cond) fails.push(msg);
  else console.log("ok  " + msg);
}
function fail(msg) { fails.push(msg); }

function engineSpan(src) {
  const startTok = src.indexOf("ENGINE-START");
  if (startTok < 0) return null;
  const c0 = src.lastIndexOf("/*", startTok);
  // Close the START comment first so an awk example containing "ENGINE-END" cannot match.
  const afterStart = src.indexOf("*/", startTok);
  if (c0 < 0 || afterStart < 0) return null;
  const endTok = src.indexOf("ENGINE-END", afterStart);
  if (endTok < 0) return null;
  const c1 = src.indexOf("*/", endTok);
  if (c1 < 0) return null;
  return { c0, c1: c1 + 2 };
}

function normalizeEngine(block) {
  return block
    .replace(/^export /gm, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .trim();
}

function syncHtml() {
  const mjs = fs.readFileSync(MJS, "utf8");
  const html = fs.readFileSync(HTML, "utf8");
  const a = engineSpan(mjs);
  const b = engineSpan(html);
  if (!a) throw new Error("score.mjs missing ENGINE-START/END");
  if (!b) throw new Error("index.html missing ENGINE-START/END");
  const core = mjs.slice(a.c0, a.c1).replace(/^export /gm, "");
  const next = html.slice(0, b.c0) + core + html.slice(b.c1);
  fs.writeFileSync(HTML, next);
  console.log("synced ENGINE 0.2 from skill/scripts/score.mjs → index.html");
}

async function main() {
  if (process.argv.includes("--sync")) {
    syncHtml();
    return;
  }

  const mjsSrc = fs.readFileSync(MJS, "utf8");
  const htmlSrc = fs.readFileSync(HTML, "utf8");
  const changelog = fs.readFileSync(CHANGELOG, "utf8");
  const drift = fs.readFileSync(DRIFT, "utf8");
  const gap = fs.readFileSync(GAP, "utf8");

  ok(mjsSrc.includes('ENGINE_VERSION = "0.2"'), "score.mjs ENGINE_VERSION 0.2");
  ok(htmlSrc.includes('ENGINE_VERSION = "0.2"') || htmlSrc.includes("engine <b>0.2</b>"), "index.html engine 0.2");

  const a = engineSpan(mjsSrc);
  const b = engineSpan(htmlSrc);
  ok(!!a, "score.mjs has ENGINE markers");
  ok(!!b, "index.html has ENGINE markers");
  if (a && b) {
    const na = normalizeEngine(mjsSrc.slice(a.c0, a.c1));
    const nb = normalizeEngine(htmlSrc.slice(b.c0, b.c1));
    ok(na === nb, "ENGINE core parity (score.mjs ↔ index.html, export stripped)");
    if (na !== nb) {
      const n = Math.min(na.length, nb.length);
      let i = 0;
      while (i < n && na[i] === nb[i]) i++;
      fail("  first ENGINE diff at " + i + " mjs=" + JSON.stringify(na.slice(i, i + 40)) + " html=" + JSON.stringify(nb.slice(i, i + 40)));
    }
  }

  const mod = await import(pathToFileURL(MJS).href);
  const { scoreDraft, ENGINE_VERSION, analyze, propensities, expectedValue, formatRisk, W, ADJ, CAL } = mod;
  ok(ENGINE_VERSION === "0.2", "exported ENGINE_VERSION is 0.2");
  ok(JSON.stringify(W) === JSON.stringify(W_FREEZE), "W matches param.rs freeze (no casual retune)");
  ok(JSON.stringify(ADJ) === JSON.stringify(ADJ_FREEZE), "ADJ matches param.rs freeze");
  ok(JSON.stringify(CAL) === JSON.stringify(CAL_FREEZE), "CAL.K freeze");

  const gapJ = scoreDraft({ text: GAP_TEXT });
  ok(gapJ.engineVersion === "0.2", "gap post engineVersion 0.2");
  ok(gapJ.potential.inNetwork === 69, "gap post inNetwork 69 (0.1 parity on this text)");
  ok(gapJ.potential.outOfNetwork === 62, "gap post outOfNetwork 62 (engine JSON; spec cited 63)");
  ok(gapJ.checkCount === 6, "gap post coach 6/6");
  ok(gapJ.signals.cliche === false, "gap post is not cliché — do not flag this voice");
  ok(gapJ.threadRole === null, "gap post is not a thread");
  ok(gapJ.layers && gapJ.layers.heuristic === "text→p" && gapJ.layers.verified.includes("Σw·p"), "layers isolate text→p from Σw·p");
  ok(gapJ.propensities && Number.isFinite(gapJ.propensities.reply), "JSON exposes propensities (text→p) separately from heads.ev");

  const opener = scoreDraft({ text: GAP_TEXT, isThread: true });
  const mid = scoreDraft({ text: GAP_TEXT, threadMid: true });
  ok(opener.threadRole === "opener" && mid.threadRole === "mid", "threadRole opener vs mid");
  ok(opener.ev !== mid.ev, "thread opener ev ≠ mid ev");
  ok(opener.propensities.click !== mid.propensities.click, "thread opener p.click ≠ mid p.click");
  ok(opener.notes.some((n) => n.includes("thread opener")), "opener note present");
  ok(mid.notes.some((n) => n.includes("thread mid")), "mid note present");
  ok(!mid.notes.some((n) => n.includes("thread opener")), "mid does not get opener click note");

  const urlJ = scoreDraft({ text: "Guia de git rebase passo a passo\nhttps://example.com/a" });
  const urlRisk = (urlJ.risks || []).find((r) => r.id === "url-in-body" || (r.label || r).includes?.("link in body"));
  ok(!!urlRisk, "URL in body raises a risk");
  ok(urlRisk && urlRisk.action === "mova pro reply", 'URL risk action is "mova pro reply"');
  ok(formatRisk(urlRisk).includes("mova pro reply"), "formatRisk surfaces the action");

  const clicheJ = scoreDraft({
    text: "Lets dive in to this game changer. In todays world you wont believe it.\nComo voce comeca?",
  });
  ok(clicheJ.signals.cliche === true, "light anti-cliché heuristic fires on hype phrasing");
  ok(clicheJ.notes.some((n) => n.includes("cliché") || n.includes("hype")), "cliché is a labeled heuristic note");

  const A = analyze(GAP_TEXT);
  const notes = [];
  const p = propensities(A, { threadRole: null, hasImage: false, hasVideo: false, vid10: false, mutualShare: 0.2 }, notes);
  const S = expectedValue(p, { mutualShare: 0.2 });
  const S2 = expectedValue({ ...p }, { mutualShare: 0.2 });
  ok(JSON.stringify(S) === JSON.stringify(S2), "expectedValue is deterministic on p (no hidden text read)");
  ok(typeof S.heads.share.ev === "number" && typeof p.shareCopy === "number", "Σw·p consumes p, not raw text");

  const empty = scoreDraft({ text: "   " });
  ok(empty.empty === true && empty.engineVersion === "0.2", "empty draft still reports 0.2");

  ok(changelog.includes("0.2") && changelog.includes("0.1"), "CHANGELOG has 0.1 and 0.2");
  ok(/isolat/i.test(changelog) && /thread/i.test(changelog), "CHANGELOG names isolation + thread");
  ok(/mova pro reply/.test(changelog), "CHANGELOG names URL action");

  ok(/text→p|text->p|text → p/i.test(drift), "drift.md states the heuristic vs verified split");
  ok(/do not|não retune|do not casual/i.test(drift), "drift.md forbids casual weight retune");
  ok(!/impressions:\s*\d{3,}/i.test(drift), "drift.md does not invent mature impression counts");

  ok(gap.includes("2091894616685416886"), "gap-log has the scaffold case id");
  ok(gap.includes("https://x.com/ovictor/status/2091894616685416886"), "gap-log has the case URL");
  ok(/\b69\b/.test(gap) && /\b63\b/.test(gap) && /6\/6/.test(gap), "gap-log records spec pre 69/63/6/6");
  ok(/WAITING/.test(gap), "gap-log outcomes are WAITING");
  ok(!/\b(impressions|likes|views):\s*[1-9]\d{2,}\b/i.test(gap), "gap-log does not fake mature metrics");

  ok(!htmlSrc.includes("engine <b>0.1</b>") || htmlSrc.includes("ENGINE_VERSION"), "composer is not stuck on 0.1");

  if (fails.length) {
    console.error("\nFAILED " + fails.length);
    for (const f of fails) console.error(" - " + f);
    process.exit(1);
  }
  console.log("\nself-check 0.2 OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
