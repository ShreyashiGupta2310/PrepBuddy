// THE IDEA of the whole project: the browser voice can't be told "pause here".
// So I speak one line, then make my own silence with setTimeout, then speak the next.
// That way the pauses are exactly what the script says, not what the voice feels like.

let token = 0; // bump this number to cancel whatever is playing. Old loops notice and quit

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Prefer an Indian English voice, then British, then any English.
// Gotcha: getVoices() can be empty on first load, so I call it at play time, not on page load.
function pickVoice() {
  const v = window.speechSynthesis.getVoices();
  return (
    v.find((x) => /en-IN/i.test(x.lang)) ||
    v.find((x) => /en-GB/i.test(x.lang)) ||
    v.find((x) => /^en/i.test(x.lang)) ||
    null
  );
}

// Speaks one piece of text and resolves when it ends. onerror also resolves,
// otherwise cancel() would leave the loop hanging forever.
function speak(text, rate) {
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = Math.min(1.2, Math.max(0.6, rate)); // keep rate in a sane range
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.onend = u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

export function stopSpeaking() {
  token++; // makes any running playTimeline loop quit at its next check
  window.speechSynthesis.cancel();
}

// Plays a whole timeline: speak line--->silence for its pause -> next line.
// onLine(i) tells the UI which line is active (for the dark highlight).
// Returns true if it finished, false if someone pressed stop.
export async function playTimeline(timeline, onLine) {
  stopSpeaking(); // never let two playbacks overlap
  const mine = token; // remember MY token, if it changes someone stopped me
  for (let i = 0; i < timeline.length; i++) {
    if (mine !== token) return false;
    onLine(i);
    await speak(timeline[i].text, timeline[i].speed);
    if (mine !== token) return false; // checking again because stop can happen mid-speech
    await wait(timeline[i].pauseMs);
  }
  if (mine !== token) return false;
  onLine(-1); // -1 = nothing highlighted
  return true;
}