export function downloadMarkdown(slides, scripts)
 {
  const lines = ["# Presentation script", ""];
  for (const s of slides) {
    const sc = scripts[s.n];
    if (!sc) continue; // skip slides that didn't get written (stopped early or failed)
    lines.push(`## Slide ${s.n} (about ${sc.estSeconds} seconds)`, "");
    for (const t of sc.timeline)
     {
      const ask = t.kind === "question" ? "ASK: " : "";
      lines.push(`${ask}${t.text} *(${t.tone})* [pause ${(t.pauseMs / 1000).toFixed(1)}s]`, "");
    }
    if (sc.deliveryTip) lines.push(`> Tip: ${sc.deliveryTip}`, "");
    if (sc.missingInfo) lines.push(`> Add yourself: ${sc.missingInfo}`, "");
  }
  // Classic trick: make a temporary download link in memory and click it from code
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/markdown" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "presentation-script.md";
  a.click();
  URL.revokeObjectURL(url); // free the memory
}
// "Download PDF" = open the browser's print dialog, where she picks "Save as PDF".
// styles.css hides the form and buttons when printing (@media print), so only the script is left.
// The page title becomes the default file name, so I rename it for a moment.
export function printAsPdf() {
  const oldTitle = document.title;
  document.title = "SlideCoach-script";
  const restore = () => {
    document.title = oldTitle;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
}
