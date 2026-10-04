export default function ScriptView({ timeline, activeIndex }) {
  return (
    <p className="script">
      {timeline.map((t, i) => (
        <span key={i}>
          <span
            className={`seg tone-${t.tone} kind-${t.kind}${i === activeIndex ? " active" : ""}`}
            title={t.kind === "question" ? "Ask the audience" : t.tone}
          >
            {t.text}
          </span>
          <span className="pause" style={{ "--ms": t.pauseMs }}>
            {(t.pauseMs / 1000).toFixed(1)}s
          </span>{" "}
        </span>
      ))}
    </p>
  );
}