import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes, getPresence, registerPresenceRoutes } from "./routes";
import { WebSocketServer } from "ws";
import type { WebSocket } from "ws";
import type { IncomingMessage } from "http";
import { securityHeaders } from './security'
import fs from 'fs'
import path from 'path'
import { httpRequests, httpDuration } from './metrics'

const app = express();

function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

function serveStatic(app: express.Express) {
  const distPath = path.resolve(import.meta.dirname, '..', 'client', 'dist')
  if (!fs.existsSync(distPath)) {
    throw new Error(`Could not find the build directory: ${distPath}, make sure to build the client first`)
  }
  app.use(express.static(distPath))
  app.use((_req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'))
  })
}
app.set('trust proxy', 1);

const apiLogWindows = new Map<string, { start: number; count: number; suppressedNoted: boolean }>();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  limit: '6mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));
app.use(securityHeaders);
app.use((req, res, next) => {
  const isDev = app.get('env') === 'development';
  const origin = isDev ? '*' : (process.env.CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith('/api')) {
      try { httpRequests.inc({ method: req.method, route: path, status: String(res.statusCode) }); } catch {}
      try { httpDuration.observe({ method: req.method, route: path, status: String(res.statusCode) }, duration); } catch {}
    }
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      const isDevEnv = app.get('env') === 'development';
      const windowMs = parseInt(process.env.LOG_WINDOW_MS || (isDevEnv ? '30000' : '60000'), 10);
      const maxLogs = parseInt(process.env.LOG_MAX || (isDevEnv ? '2' : '5'), 10);
      const nowTs = Date.now();
      const key = path;
      const existing = apiLogWindows.get(key);
      if (!existing || nowTs - existing.start > windowMs) {
        apiLogWindows.set(key, { start: nowTs, count: 0, suppressedNoted: false });
      }
      const entry = apiLogWindows.get(key)!;
      if (entry.count < maxLogs) {
        log(logLine);
        entry.count += 1;
      } else if (!entry.suppressedNoted) {
        log(`${req.method} ${path} logs suppressed after ${maxLogs} entries`);
        entry.suppressedNoted = true;
      }
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  if (app.get('env') !== 'development') {
    const required = ['JWT_SECRET', 'ENCRYPTION_KEY', 'ENCRYPTION_SALT'];
    const missing = required.filter((k) => !process.env[k] || String(process.env[k]).trim() === '');
    if (missing.length) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    // Don't throw here, just log if needed
    if (process.env.NODE_ENV !== 'test') {
      console.error(err);
    }
  });

  // Prevent server crash on unhandled rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // Ideally restart, but in dev keep alive to avoid loop
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    const { setupVite } = await import('./vite')
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });

  // WebSocket Chat Server
  const wss = new WebSocketServer({ server, path: "/ws" });

  type Sender = "trader" | "agent" | "ai";
  type ChatMessage = {
    sessionId: string;
    sender: Sender;
    text?: string;
    attachmentId?: string;
    filename?: string;
    mimeType?: string;
    timestamp: number;
  };

  const sessions = new Map<string, Set<WebSocket>>();
  const transcripts = new Map<string, ChatMessage[]>();
  function broadcastPresenceUpdate() {
    const p = getPresence();
    // send to all clients in all sessions
    sessions.forEach((clients) => {
      clients.forEach((ws) => {
        try { ws.send(JSON.stringify({ type: "presence", data: p })); } catch {}
      });
    });
  }

  registerPresenceRoutes(app, () => broadcastPresenceUpdate());

  function broadcast(sessionId: string, payload: ChatMessage) {
    const clients = sessions.get(sessionId);
    if (!clients) return;
    const list = transcripts.get(sessionId) || [];
    list.push(payload);
    transcripts.set(sessionId, list);
    clients.forEach((ws) => {
      try {
        ws.send(JSON.stringify({ type: "message", data: payload }));
      } catch {}
    });
  }

  function aiRespond(sessionId: string, userText?: string) {
    const lower = (userText || "").toLowerCase();
    // typing indicator
    const typing = { type: "typing", data: { sender: "ai", sessionId } };
    const clients = sessions.get(sessionId);
    if (clients) clients.forEach((ws) => { try { ws.send(JSON.stringify(typing)); } catch {} });

    let reply = "I’m your Binapex AI Assistant. How can I help today?";
    if (lower.includes("kyc")) reply = "You can check your KYC status under Security. Need steps?";
    else if (lower.includes("deposit") || lower.includes("fund")) reply = "For deposits, use Deposits page and follow funding instructions.";
    else if (lower.includes("withdraw")) reply = "Withdrawals require verified KYC and 24h review for large amounts.";
    else if (lower.includes("human")) reply = "I’ll escalate to a human agent. Please wait; we’ll notify you.";

    const msg: ChatMessage = {
      sessionId,
      sender: "ai",
      text: reply,
      timestamp: Date.now(),
    };
    broadcast(sessionId, msg);
  }

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const sessionId = url.searchParams.get("sessionId") || "default";
    const role = (url.searchParams.get("role") || "trader") as Sender;

    if (!sessions.has(sessionId)) sessions.set(sessionId, new Set());
    sessions.get(sessionId)!.add(ws);

    ws.on("message", (raw) => {
      let parsed: any = {};
      try { parsed = JSON.parse(raw.toString()); } catch {}
      if (parsed?.type === "message") {
        const payload: ChatMessage = {
          sessionId,
          sender: role,
          text: parsed.text,
          timestamp: Date.now(),
        };
        broadcast(sessionId, payload);

        // AI fallback if no agent online
        if (getPresence().status === "offline") {
          setTimeout(() => aiRespond(sessionId, parsed.text), 600);
        }
      }
    });

    ws.on("close", () => {
      const set = sessions.get(sessionId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) sessions.delete(sessionId);
      }
    });

    // greet & presence info
    ws.send(JSON.stringify({ type: "welcome", data: { sessionId, role } }));
    ws.send(JSON.stringify({ type: "presence", data: getPresence() }));
  });

  // Chat history endpoint for moderation and session persistence
  app.get('/api/chat/history/:sessionId', (req: Request, res: Response) => {
    const id = req.params.sessionId;
    res.json({ messages: transcripts.get(id) || [] });
  });
})();
