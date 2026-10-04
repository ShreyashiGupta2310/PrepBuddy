import { Router } from "express";
import { generateScript } from "../services/script.js";

const router = Router();

router.post("/", async (req, res) => {
  const {
    n,
    total,
    text = "",
    prevText = "",
    audience = "classmates and faculty",
    minutes = 10,
    imageBase64 = null,
  } = req.body;

  if (!Number.isInteger(n) || !Number.isInteger(total) || n < 1 || n > total) {
    return res.status(400).json({ error: "n and total must be valid slide numbers." });
  }

  const seconds = (Math.min(60, Math.max(1, Number(minutes) || 10)) * 60) / total;

  try {
    const script = await generateScript({
      n,
      total,
      text: String(text).slice(0, 3000),
      prevText: String(prevText).slice(0, 400),
      audience: String(audience).slice(0, 120),
      seconds,
      imageBase64,
    });
    res.json(script);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

export default router;