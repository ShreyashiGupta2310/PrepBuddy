import ScriptView from "./ScriptView.jsx";

export default function SlideCard({
  slide, script, error, activeIndex, isPlaying, onPlay, onStop, onRewrite,
}) {
  return (
    <article className="slide">
      <div className="slide-no">Slide {slide.n}</div>
      <div>
        {!script && !error && <p className="writing">Waiting...</p>}
        {error && (
          <p className="error">
            {error}{" "}
            <button className="btn ghost" onClick={onRewrite}>Retry</button>
          </p>
        )}
        {script && (
          <>
            <div className="meta">
              <span>About {script.estSeconds}s</span>
              <span className="spacer" />
              <button className="btn ghost" onClick={onRewrite}>Rewrite</button>
              <button className="btn" onClick={isPlaying ? onStop : onPlay}>
                {isPlaying ? "■ Stop" : "▶ Play"}
              </button>
            </div>
            <ScriptView timeline={script.timeline} activeIndex={activeIndex} />
            {script.deliveryTip && (
              <div className="cue"><strong>Delivery</strong>{script.deliveryTip}</div>
            )}
           
            {script.missingInfo && (
              <div className="cue add"><strong>Add this yourself</strong>{script.missingInfo}</div>
            )}
          </>
        )}
        {!slide.text && <p className="muted">No text found on this slide.</p>}
      </div>
    </article>
  );
}