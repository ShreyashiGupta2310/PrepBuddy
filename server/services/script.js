import { chat } from "./ollama.js";
import { SYSTEM_PROMPT, buildUserPrompt } from "../prompts.js";

const TONES = new Set(["calm", "warm", "energetic", "emphasis", "slow"]);

const clamp = (v, lo, hi, fallback) => {
  const x = Number(v);
  return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : fallback;
};

const clean = (v) => {
  if (v === null || v === undefined) return null;
  let s = String(v).split(/[{}]/)[0]; // junk after a stray brace
  s = s.replace(/\s*\d+\s+(spoken\s+)?words?\s*$/i, ""); // echoed word-count instruction
  s = s.replace(/["”]+\s*$/, ""); // a quote mark left hanging at the end
  s = s.trim();
  return ["", "null", "none", "n/a"].includes(s.toLowerCase()) ? null : s;
};
function parseJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON found");
  return JSON.parse(text.slice(start, end + 1));
}


export function normalize(raw, wantQuestion) {
  const segments = [];
  for (const s of Array.isArray(raw.segments) ? raw.segments : []) {
    const text = clean(typeof s === "string" ? s : s?.text);
    if (!text) continue;
    const tone = String(s?.tone ?? "calm").toLowerCase();
    segments.push({
      text,
      tone: TONES.has(tone) ? tone : "calm",
      pauseMs: Math.round(clamp(s?.pause_after_ms, 300, 1500, 600)),
      speed: Math.round(clamp(s?.speed, 0.85, 1.05, 0.95) * 100) / 100,
    });
  }
  if (!segments.length) throw new Error("no segments");
  return {
    opening: clean(raw.opening),
    segments,
    audienceQuestion: wantQuestion ? clean(raw.audience_question) : null,
    deliveryTip: clean(raw.delivery_tip),
    transition: clean(raw.transition),
    missingInfo: clean(raw.missing_info),
  };
}


export function buildTimeline(s) {
  const t = [];
  if (s.opening)
    t.push({ kind: "opening", text: s.opening, tone: "warm", speed: 0.95, pauseMs: 900 });
  for (const seg of s.segments)
    t.push({ kind: "segment", text: seg.text, tone: seg.tone, speed: seg.speed, pauseMs: seg.pauseMs });
  if (s.audienceQuestion)
    t.push({ kind: "question", text: s.audienceQuestion, tone: "warm", speed: 0.95, pauseMs: 3500 });
  if (s.transition)
    t.push({ kind: "transition", text: s.transition, tone: "calm", speed: 0.95, pauseMs: 600 });
  return t;
}

export function estimateSeconds(timeline) {
  const words = timeline.reduce((n, i) => n + i.text.split(/\s+/).length, 0);
  const pauses = timeline.reduce((n, i) => n + i.pauseMs, 0) / 1000;
  return Math.round(words / 2.4 + pauses);
}

export async function generateScript({ n, total, text, prevText, audience, seconds, imageBase64 }) {
  const wantQuestion = n % 2 === 0 && n !== total; // a question on every second slide
  const user = {
    role: "user",
    content: buildUserPrompt({ n, total, audience, seconds, text, prevText, wantQuestion }),
  };
  if (imageBase64) user.images = [imageBase64.replace(/^data:image\/\w+;base64,/, "")];
  const messages = [{ role: "system", content: SYSTEM_PROMPT }, user];

  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await chat(messages);
    try {
      const script = normalize(parseJson(raw), wantQuestion);
      const timeline = buildTimeline(script);
      return { ...script, timeline, estSeconds: estimateSeconds(timeline) };
    } catch (err) {
      lastError = err;
      messages.push(
        { role: "assistant", content: raw },
        { role: "user", content: "That was not valid. Reply again with ONLY the JSON object in the required shape." }
      );
    }
  }
  throw new Error(`The model returned unusable output (${lastError.message}). Press retry.`);
}