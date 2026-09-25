import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { config } from "./config.js";
import { initDatabase } from "./db.js";
import { authRouter } from "./routes/auth.js";

const app = express();

app.use(cors({ origin: config.clientUrl }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err: Error & { type?: string }, _req: Request, res: Response, _next: NextFunction) => {
  if (err.type === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

try {
  await initDatabase();
  app.listen(config.port, () => {
    console.log(`SquadZone API running on http://localhost:${config.port}`);
  });
} catch (err) {
  console.error("Failed to connect to the database:", err);
  process.exit(1);
}
