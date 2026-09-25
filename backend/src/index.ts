<<<<<<< HEAD
import { createServer } from "node:http";
=======
>>>>>>> d70a53786ab6670840b679bb743e3f4a9c88c523
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { config } from "./config.js";
import { initDatabase } from "./db.js";
<<<<<<< HEAD
import { initSocket } from "./realtime/socket.js";
import { authRouter } from "./routes/auth.js";
import { channelsRouter } from "./routes/channels.js";
import { friendsRouter } from "./routes/friends.js";
import { serversRouter } from "./routes/servers.js";
import { HttpError } from "./utils/http.js";
=======
import { authRouter } from "./routes/auth.js";
>>>>>>> d70a53786ab6670840b679bb743e3f4a9c88c523

const app = express();

app.use(cors({ origin: config.clientUrl }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
<<<<<<< HEAD
app.use("/api/friends", friendsRouter);
app.use("/api/servers", serversRouter);
app.use("/api/channels", channelsRouter);
=======
>>>>>>> d70a53786ab6670840b679bb743e3f4a9c88c523

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err: Error & { type?: string }, _req: Request, res: Response, _next: NextFunction) => {
<<<<<<< HEAD
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
=======
>>>>>>> d70a53786ab6670840b679bb743e3f4a9c88c523
  if (err.type === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

<<<<<<< HEAD
const httpServer = createServer(app);
initSocket(httpServer);

try {
  await initDatabase();
  httpServer.listen(config.port, () => {
=======
try {
  await initDatabase();
  app.listen(config.port, () => {
>>>>>>> d70a53786ab6670840b679bb743e3f4a9c88c523
    console.log(`SquadZone API running on http://localhost:${config.port}`);
  });
} catch (err) {
  console.error("Failed to connect to the database:", err);
  process.exit(1);
}
