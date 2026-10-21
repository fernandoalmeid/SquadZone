import { createServer } from "node:http";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { config } from "./config.js";
import { initDatabase } from "./db.js";
import { initSocket } from "./realtime/socket.js";
import { authRouter } from "./routes/auth.js";
import { channelsRouter } from "./routes/channels.js";
import { friendsRouter } from "./routes/friends.js";
import { dmsRouter } from "./routes/dms.js";
import { serversRouter } from "./routes/servers.js";
import { HttpError } from "./utils/http.js";

const app = express();

app.use(cors({ origin: config.clientUrl }));
app.use(express.json({ limit: "12mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/friends", friendsRouter);
app.use("/api/dms", dmsRouter);
app.use("/api/servers", serversRouter);
app.use("/api/channels", channelsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err: Error & { type?: string }, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err.type === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }
  if (err.type === "entity.too.large") {
    res.status(413).json({ error: "Image is too large. Use a smaller file or a GIF URL." });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const httpServer = createServer(app);
initSocket(httpServer);

try {
  await initDatabase();
  httpServer.listen(config.port, () => {
    console.log(`SquadZone API running on http://localhost:${config.port}`);
    console.log(`SQLite database: ${config.databasePath}`);
  });
} catch (err) {
  console.error("Failed to connect to the database:", err);
  process.exit(1);
}
