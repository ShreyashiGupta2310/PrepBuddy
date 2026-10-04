import "dotenv/config";
import express from "express";
import { config } from "./config.js";
import health from "./routes/health.js";

const app = express();
app.use(express.json({ limit: "15mb" }));
app.use("/api/health", health);

app.listen(config.port, () =>
  console.log(`Server running on http://localhost:${config.port}`)
);