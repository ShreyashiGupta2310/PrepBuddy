import { Router } from "express";
import { config } from "../config.js";

const router = Router();

router.get("/", async (_req, res) =>
{
  try {
    const r = await fetch(`${config.ollamaUrl}/api/tags`);
    const data = await r.json();
    const names = (data.models || []).map((m) => m.name);
    const ready =
      names.includes(config.model) || names.includes(`${config.model}:latest`);
    res.json({ ollama: true, model: config.model, modelReady: ready });
  } catch {
    res.json({ ollama: false, model: config.model, modelReady: false });
  }
});

export default router;