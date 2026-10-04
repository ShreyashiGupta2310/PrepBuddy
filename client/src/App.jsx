import { useRef, useState } from "react";
import { readPdf } from "./lib/pdf.js";
import { requestScript } from "./api.js";

export default function App() {
  const fileRef = useRef(null);
  const [audience, setAudience] = useState("classmates and faculty");
  const [minutes, setMinutes] = useState(10);
  const [slides, setSlides] = useState([]);
  const [scripts, setScripts] = useState({});
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  
  async function writeSlide(slide, list) {
    setErrors((e) => ({ ...e, [slide.n]: null }));
    try {
      const script = await requestScript({
        n: slide.n,
        total: list.length,
        text: slide.text,
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

    setBusy(true);
    setScripts({});
    setErrors({});
    try {
      setStatus("Reading your slides...");
      const list = await readPdf(file);
      setSlides(list);

      for (const slide of list) {
        setStatus(`Writing slide ${slide.n} of ${list.length}...`);
        const problem = await writeSlide(slide, list);
        if (problem && problem.startsWith("Ollama is not running")) {
          setStatus(problem);
          return;
        }
      }
      setStatus("Done.");
    } catch (err) {
      setStatus(`Could not read this file: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>PrepBuddy</h1>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, marginBottom: 24 }}>
        <input ref={fileRef} type="file" accept=".pdf,application/pdf" />
        <label>
          Who is listening{" "}
          <input value={audience} onChange={(e) => setAudience(e.target.value)} />
        </label>
        <label>
          Talk length (minutes){" "}
          <input
            type="number"
            min="1"
            max="60"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? "Working..." : "Write my script"}
        </button>
        <p>{status}</p>
      </form>

      {slides.map((slide) => {
        const script = scripts[slide.n];
        const error = errors[slide.n];
        return (
          <section key={slide.n} style={{ borderTop: "1px solid #ccc", padding: "16px 0" }}>
            <h2>Slide {slide.n}</h2>
            {!slide.text && <p><em>No text found on this slide.</em></p>}
            {!script && !error && <p>Waiting...</p>}
            {error && (
              <p>
                {error} <button onClick={() => writeSlide(slide, slides)}>Retry</button>
              </p>
            )}
            {script &&
              script.timeline.map((t, i) => (
                <p key={i}>
                  {t.text} <small>[pause {(t.pauseMs / 1000).toFixed(1)}s]</small>
                </p>
              ))}
            {script?.deliveryTip && <p><strong>Tip:</strong> {script.deliveryTip}</p>}
          </section>
        );
      })}
    </main>
  );
}