export const config = {
  port: process.env.PORT || 5000,
  ollamaUrl: process.env.OLLAMA_URL || "http://localhost:11434",
  model: process.env.MODEL || "gemma3:4b",
};