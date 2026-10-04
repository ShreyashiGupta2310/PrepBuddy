import { useRef, useState } from "react";
import { readPdf } from "./lib/pdf.js";
import { requestScript } from "./api.js";
import { playTimeline, stopSpeaking } from "./lib/voice.js";
import { downloadMarkdown } from "./lib/exportScript.js";
import SlideCard from "./components/SlideCard.jsx";

// All the state lives here and the cards just display it. If something looks wrong
// on screen, check these state variables first.
export default function App() {
  const fileRef = useRef(null);
  // A ref (not state) because the writing loop must see the latest value instantly,
  // and changing it shouldn't re-render the page.
  const cancelRef = useRef(false);
  const [audience, setAudience] = useState("classmates and faculty");
  const [minutes, setMinutes] = useState(10);
  const [slides, setSlides] = useState([]);   // [{ n, text }] straight from the PDF
  const [scripts, setScripts] = useState({}); // { slideNumber: script } fills in one by one
  const [errors, setErrors] = useState({});   // { slideNumber: "message" }
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(null); // { n, i } = which slide and which line is being spoken

  // Asks the server for ONE slide. Returns the error message, or null if it worked.
  // Used by the main loop AND by Retry / Rewrite buttons.
  async function writeSlide(slide, list) {
    setErrors((e) => ({ ...e, [slide.n]: null }));
    try {
      const script = await requestScript({
        n: slide.n,
        total: list.length,
        text: slide.text,
        // the previous slide's text lets gemma write a smooth bridge between slides
        prevText: slide.n > 1 ? list[slide.n - 2].text : "",
        audience,
        minutes: Number(minutes),
      });
      setScripts((s) => ({ ...s, [slide.n]: script }));
      return null;
    } catch (err) {
      setErrors((e) => ({ ...e, [slide.n]: err.message }));
      return err.message;
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return setStatus("Choose a PDF first.");

    stop();
    cancelRef.current = false;
    setBusy(true);
    setScripts({});
    setErrors({});
    try {
      setStatus("Reading your slides...");
      const list = await readPdf(file);
      setSlides(list); // cards show up instantly as "Waiting..."



      
      let finished = true;
      for (const slide of list) {
        if (cancelRef.current) { finished = false; break; } 
        setStatus(`Writing slide ${slide.n} of ${list.length}...`);
        const problem = await writeSlide(slide, list);
        
        if (problem?.startsWith("Ollama is not running")) {
          setStatus(problem);
          return;
        }
      }
      setStatus(finished ? "Done. Press play on any slide." : "Stopped. The slides written so far are ready.");
    } catch (err) {
      setStatus(`Could not read this file: ${err.message}`);
    } finally {
      setBusy(false); 
    }
  }

  async function play(n) {
    const script = scripts[n];
    if (!script) return false;
    setPlaying({ n, i: 0 });
   
    return playTimeline(script.timeline, (i) => setPlaying(i < 0 ? null : { n, i }));
  }

 
  async function playAll() {
    for (const s of slides) {
      if (!scripts[s.n]) continue; // skip slides that failed or weren't written
      if (!(await play(s.n))) return;
    }
  }

  function stop() {
    stopSpeaking();
    setPlaying(null);
  }

  const written = Object.keys(scripts).length;

  return (
    <main className="wrap">
      <h1>PrepBuddy</h1>
      <p className="lede">
        Upload your slides and get a script you can say out loud: where to pause,
        what to ask the audience, and a voice that reads it back.
      </p>

      <form className="panel" onSubmit={handleSubmit}>
        <input ref={fileRef} type="file" accept=".pdf,application/pdf" />
        <div className="fields">
          <label>
            Who is listening
            <input type="text" value={audience} onChange={(e) => setAudience(e.target.value)} />
          </label>
          <label>
            Talk length (minutes)
            <input type="number" min="1" max="60" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </label>
        </div>
        <div className="toolbar">
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Working..." : "Write my script"}
          </button>
          {busy && (
            <button className="btn ghost" type="button" onClick={() => (cancelRef.current = true)}>
              Stop writing
            </button>
          )}
        </div>
        <p className="status" role="status">{status}</p>
      </form>

      {/* only show the legend and Play all once at least one slide is written */}
      {written > 0 && (
        <div className="toolbar">
          <p className="legend">
            Highlighted = stress it. Bold = more energy. Italic = slow down. A blue line = pause.
          </p>
          <button className="btn ghost" onClick={playing ? stop : playAll}>
            {playing ? "■ Stop" : "▶ Play all"}
          </button>
          <button className="btn ghost" onClick={() => downloadMarkdown(slides, scripts)}>
            Download script
          </button>
        </div>
      )}

      {slides.map((slide) => (
        <SlideCard
          key={slide.n}
          slide={slide}
          script={scripts[slide.n]}
          error={errors[slide.n]}
          activeIndex={playing?.n === slide.n ? playing.i : -1}
          isPlaying={playing?.n === slide.n}
          onPlay={() => play(slide.n)}
          onStop={stop}
          onRewrite={() => writeSlide(slide, slides)}
        />
      ))}
    </main>
  );
}