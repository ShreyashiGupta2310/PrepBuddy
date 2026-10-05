// THE IDEA of the whole project: the browser voice can't be told "pause here".
// So I speak, then make my own silence with setTimeout, then speak again.
// The pauses are exactly what the script says, not what the voice feels like.
//
// Expression is faked with the only 3 knobs the browser gives me: rate, pitch, volume.
// Real "acting" would need a better voice model (Kokoro, ElevenLabs). Mention in the post as next step.

let token = 0; // bump this to cancel whatever is playing. Old loops notice and quit

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Voices I tested on this laptop. All are local (work offline). Checked in this order.
const PREFERRED = ["Heera", "Ravi"];

// Keeps a number inside a range (used for rate, pitch and volume)
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// How each tone from Gemma sounds. rate is multiplied by the line's own speed (about 0.95).
// Tweak these numbers by ear. Small changes are audible.
const TONE = {
  calm:      { rate: 0.95, pitch: 0.95, volume: 0.9 },
  warm:      { rate: 1.0,  pitch: 1.08, volume: 1.0 },
  energetic: { rate: 1.1,  pitch: 1.15, volume: 1.0 },
  emphasis:  { rate: 0.88, pitch: 1.1,  volume: 1.0 },
  slow:      { rate: 0.8,  pitch: 0.92, volume: 0.9 },
};


// Which voice to use, in order:
// 1) the one picked in the dropdown (remembered in localStorage),
// 2) my PREFERRED list, checked IN THE ORDER I WROTE IT (the old version ignored the order),
// 3) any local en-IN / en-GB / English voice.
// Local voices only (localService = true), so nothing is sent to the internet.
// Gotcha: getVoices() can be empty on first load, so this runs at play time.
let chosenName = "";
try { chosenName = localStorage.getItem("voiceName") || ""; } catch {}

function pickVoice() {
  const all = window.speechSynthesis.getVoices();
  const local = all.filter((x) => x.localService);
  const pool = local.length ? local : all;

  const picked = chosenName && pool.find((x) => x.name === chosenName);
  if (picked) return picked;

  for (const n of PREFERRED) {
    const v = pool.find((x) => x.name.includes(n));
    if (v) return v;
  }
  return (
    pool.find((x) => /en-IN/i.test(x.lang)) ||
    pool.find((x) => /en-GB/i.test(x.lang)) ||
    pool.find((x) => /^en/i.test(x.lang)) ||
    null
  );
}


// Chrome quirk: if nothing holds a reference to an utterance, it can be garbage-collected
// mid-speech and then onend never fires (the loop hangs or the voice stops). So I keep
// each one in this Set until it finishes.
const alive = new Set();

// Speaks one chunk of text and resolves when it ends.
// Quirks handled: speak() right after cancel() can be dropped (so I wait 60ms), and the
// engine can get stuck "paused" (so I resume() first). Logs are for debugging, delete later.
function speak(text, { rate, pitch, volume }) {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = clamp(rate, 0.6, 1.3);
    u.pitch = clamp(pitch, 0.6, 1.5);
    u.volume = clamp(volume, 0.3, 1);
    const voice = pickVoice();
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    }

    alive.add(u);
    const done = () => {
      alive.delete(u);
      resolve();
    };
    u.onstart = () => console.log("[voice] start:", text.slice(0, 30), "| voice:", u.voice?.name, "| rate:", u.rate, "pitch:", u.pitch);
    u.onend = done;
    u.onerror = (e) => {
      if (e.error !== "interrupted" && e.error !== "canceled") console.warn("[voice] error:", e.error);
      done();
    };

    synth.resume();
    setTimeout(() => synth.speak(u), 60);
  });
}


//  used by the voice dropdown in App.jsx 
export function getVoiceName() {
  return chosenName;
}

export function setVoiceName(name) {
  chosenName = name; // "" means Automatic
  try { localStorage.setItem("voiceName", name); } catch {}
}

// Only on-device English voices, so the list never offers one that needs internet
export function listVoices() {
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.localService && /^en/i.test(v.lang))
    .map((v) => ({ name: v.name, lang: v.lang }));
}

// Says one short sentence so she can hear the voice right after picking it
export function previewVoice() {
  stopSpeaking();
  return speak("Hello everyone. Today I will walk you through our site visit.", {
    rate: 0.95, pitch: 1, volume: 1,
  });
}

// One timeline line = one or more sentences. I speak them one by one with a tiny breath
// between (220ms). Short chunks also dodge a Chrome bug where long text cuts off.
// Questions go UP in pitch, the last sentence of a statement comes slightly DOWN.
async function speakLine(item, mine) {
  const tone = TONE[item.tone] || TONE.calm;
  const sentences = (item.text.match(/[^.!?]+[.!?]*/g) || [item.text])
    .map((s) => s.trim())
    .filter(Boolean);

  for (let k = 0; k < sentences.length; k++) {
    if (mine !== token) return;
    const s = sentences[k];
    const isLast = k === sentences.length - 1;
    let pitch = tone.pitch;
    if (item.kind === "question" || s.endsWith("?")) pitch += 0.12;
    else if (isLast) pitch -= 0.04;

    await speak(s, { rate: tone.rate * item.speed, pitch, volume: tone.volume });
    if (!isLast) await wait(220);
  }
}

export function stopSpeaking() {
  token++; // makes any running playTimeline loop quit at its next check
  window.speechSynthesis.cancel();
}

// Plays a whole timeline: speak line -> silence for its pause -> next line.
// onLine(i) tells the UI which line is active (for the dark highlight).
// Returns true if it finished, false if someone pressed stop.
export async function playTimeline(timeline, onLine) {
  stopSpeaking(); // never let two playbacks overlap
  const mine = token; // remember MY token, if it changes someone stopped me
  for (let i = 0; i < timeline.length; i++) {
    if (mine !== token) return false;
    onLine(i);
    await speakLine(timeline[i], mine);
    if (mine !== token) return false;
    await wait(timeline[i].pauseMs);
  }
  if (mine !== token) return false;
  onLine(-1); // -1 = nothing highlighted
  return true;
}