import { config } from "../config.js";

export async function chat(messages) {
  let res;
  try {
    res = await fetch(`${config.ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        messages,
        stream: false,
        format: "json",
        options: { temperature: 0.6, num_ctx: 4096 },
      }),
    });
  } catch {
    throw new Error("Ollama is not running. Open the Ollama app and try again.");
  }
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200);
    throw new Error(`Ollama error: ${detail}`);
  }
  const data = await res.json();
  return data.message.content;
}