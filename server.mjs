import http from "http";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
import next from "next";
import { safetyStore, hashIp } from "./src/server/safetyStore.ts";
import { registerSocketHandlers } from "./src/server/socketHandler.ts";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

const app = next({ dev });
const handle = app.getRequestHandler();

await app.prepare();

const expressApp = express();
const server = http.createServer(expressApp);

// Body parser scoped only to custom Express routes (avoids locking body stream for Next.js App Router)
const jsonParser = express.json({ limit: "10mb" });

// 1. Safety report API
expressApp.post("/api/reports", jsonParser, (req, res) => {
  const { reporterGuestId, reportedGuestId, roomId, reason, snapshotBase64 } = req.body;

  if (!reporterGuestId || !reportedGuestId || !reason) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const clientIp =
    (req.headers["x-forwarded-for"]?.split(",")[0]?.trim()) ||
    req.socket.remoteAddress ||
    "127.0.0.1";

  const { report, autoBanned } = safetyStore.addReport({
    reporterGuestId,
    reportedGuestId,
    roomId: roomId || "unknown",
    reason,
    snapshotBase64,
    ip: clientIp,
  });

  return res.json({
    success: true,
    reportId: report.id,
    autoBanned,
    message: autoBanned
      ? "Report submitted. Target has been suspended due to multiple community reports."
      : "Report submitted. Our moderation system will review the snapshot.",
  });
});

// 2. Admin reports review API
expressApp.get("/api/admin/reports", (req, res) => {
  const password = req.headers["x-admin-password"] || req.query.password;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized: Invalid admin password" });
  }

  const reports = safetyStore.getReports();
  const stats = safetyStore.getStats();
  return res.json({ reports, stats });
});

// 3. Admin action API
expressApp.post("/api/admin/reports/action", jsonParser, (req, res) => {
  const password = req.headers["x-admin-password"] || req.query.password;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized: Invalid admin password" });
  }

  const { reportId, action } = req.body;
  if (!reportId || !action) {
    return res.status(400).json({ error: "Missing reportId or action" });
  }

  const result = safetyStore.actionReport(reportId, action);
  return res.json(result);
});

// 4. User safety status check (ban check)
expressApp.get("/api/user/status", (req, res) => {
  const guestId = req.query.guestId || "";
  const clientIp =
    (req.headers["x-forwarded-for"]?.split(",")[0]?.trim()) ||
    req.socket.remoteAddress ||
    "127.0.0.1";

  const status = safetyStore.isBanned(guestId, clientIp);
  return res.json(status);
});

// Attach Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

registerSocketHandlers(io);

// Forward all other routes to Next.js App Router
expressApp.all("*", (req, res) => {
  return handle(req, res);
});

server.listen(port, () => {
  console.log(`> Hand Cricket Arena server ready on http://localhost:${port}`);
});
