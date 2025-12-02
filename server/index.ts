import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes, getPresence, registerPresenceRoutes } from "./routes";
import { ensureSchema, db } from "./db";
import { chatMessages } from "@shared/schema";
import { eq, asc } from 'drizzle-orm'
import { WebSocketServer } from "ws";
import { Counter, Gauge } from "prom-client";
import crypto from 'crypto';
import { nanoid } from "nanoid";
import type { WebSocket } from "ws";
import type { IncomingMessage } from "http";
import { securityHeaders } from './security'
import fs from 'fs'
import path from 'path'
import { httpRequests, httpDuration, registry } from './metrics'

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
  app.use((req, res, next) => {
    const p = req.path || ''
    if (p.startsWith('/api') || p.startsWith('/ws') || p === '/metrics') return next()
    return express.static(distPath, { maxAge: '7d', etag: true })(req, res, next)
  })
  app.use((req, res, next) => {
    const p = req.path || ''
    if (p.startsWith('/api') || p.startsWith('/ws') || p === '/metrics') return next()
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
  const trace = (req.headers['x-trace-id'] as string) || nanoid(12)
  res.setHeader('x-trace-id', trace)
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
      if ((path.startsWith('/api/notifications')) && res.statusCode === 401) return;
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

const isVercel = !!process.env.VERCEL;
(async () => {
  try { await ensureSchema(); } catch {}
  const server = await registerRoutes(app);

  if (app.get('env') !== 'development') {
    const required = ['JWT_SECRET', 'ENCRYPTION_KEY', 'ENCRYPTION_SALT'];
    const missing = required.filter((k) => !process.env[k] || String(process.env[k]).trim() === '');
    if (missing.length) {
      console.error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  let httpErrors: Counter
  try {
    httpErrors = (registry.getSingleMetric('http_errors_total') as any)
    if (!httpErrors) httpErrors = new Counter({ name: 'http_errors_total', help: 'HTTP errors', labelNames: ['route','severity','status'], registers: [registry] })
  } catch {
    try { httpErrors = new Counter({ name: 'http_errors_total', help: 'HTTP errors', labelNames: ['route','severity','status'], registers: [registry] }) } catch {}
  }
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    // Don't throw here, just log if needed
    if (process.env.NODE_ENV !== 'test') {
      console.error(err);
    }
    try {
      const sev = status >= 500 ? 'critical' : status >= 400 ? 'warning' : 'info'
      httpErrors.inc({ route: req.path || 'unknown', severity: sev, status: String(status) })
    } catch {}
  });

  // Prevent server crash on unhandled rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // Ideally restart, but in dev keep alive to avoid loop
  });

  // Only enable Vite dev server when explicitly requested
  const enableViteDev = app.get("env") === "development" && process.env.ENABLE_VITE_DEV === "1";
  if (!isVercel && enableViteDev) {
    const { setupVite } = await import('./vite')
    await setupVite(app, server);
  } else {
    if (!isVercel) serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  if (!isVercel) {
    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      log(`serving on port ${port}`);
    });
  }

  // WebSocket Chat Server
  const wss = !isVercel ? new WebSocketServer({ server, path: "/ws", perMessageDeflate: { zlibDeflateOptions: { level: 6, memLevel: 3 }, zlibInflateOptions: { chunkSize: 16 * 1024 } } }) : undefined as any;

  type Sender = "trader" | "agent" | "ai";
  type ChatMessage = {
    id: string;
    sessionId: string;
    sender: Sender;
    text?: string;
    attachmentId?: string;
    filename?: string;
    mimeType?: string;
    timestamp: number;
    readBy?: string[];
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

  const chatMessagesTotal = new Counter({ name: 'chat_messages_total', help: 'Total chat messages', labelNames: ['session'] });
  const chatTypingTotal = new Counter({ name: 'chat_typing_total', help: 'Typing events', labelNames: ['session'] });
  const chatReadTotal = new Counter({ name: 'chat_read_total', help: 'Read receipts', labelNames: ['session'] });
  const chatSessionsActive = new Gauge({ name: 'chat_sessions_active', help: 'Active chat sessions' });

  function updateActiveSessionsGauge() {
    try { chatSessionsActive.set(sessions.size); } catch {}
  }

  function broadcast(sessionId: string, payload: ChatMessage) {
    const clients = sessions.get(sessionId);
    if (!clients) return;
    const list = transcripts.get(sessionId) || [];
    list.push(payload);
    transcripts.set(sessionId, list);
    if (db) {
      try { (db as any).insert(chatMessages).values({ id: payload.id, sessionId, sender: payload.sender, text: payload.text || null, timestamp: new Date(payload.timestamp), readBy: (payload.readBy || []).join(',') }); } catch {}
    }
    clients.forEach((ws) => {
      try {
        ws.send(JSON.stringify({ type: "message", data: payload }));
      } catch {}
    });
    try { chatMessagesTotal.inc({ session: sessionId }); } catch {}
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
      id: nanoid(12),
      sessionId,
      sender: "ai",
      text: reply,
      timestamp: Date.now(),
    };
    broadcast(sessionId, msg);
  }

  // Lightweight JWT verification for WS auth
  const verifyJWT = (token: string): Record<string, any> | null => {
    try {
      const [h,p,s] = token.split('.');
      if (!h || !p || !s) return null;
      const secret = process.env.JWT_SECRET || '';
      const sig = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
      if (s !== sig) return null;
      const payload = JSON.parse(Buffer.from(p.replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString('utf8'));
      if (typeof payload.exp === 'number' && Math.floor(Date.now()/1000) > payload.exp) return null;
      return payload;
    } catch { return null; }
  };

  if (!isVercel)
  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const sessionId = url.searchParams.get("sessionId") || "default";
    const role = (url.searchParams.get("role") || "trader") as Sender;
    const token = String(url.searchParams.get('token') || '');
    let userId = 'anonymous';
    const payload = token ? verifyJWT(token) : null;
    if (payload) {
      userId = String(payload.sub || 'unknown');
      const r = String(payload.role || '').toLowerCase();
      const want = String(role).toLowerCase();
      const ok = (want === 'agent' && (r === 'customer service' || r === 'admin')) || (want === 'trader' && (r === 'trader' || r === 'admin'));
      if (!ok) {
        try { ws.close(1008, 'Unauthorized'); } catch {}
        return;
      }
    }

    if (!sessions.has(sessionId)) sessions.set(sessionId, new Set());
    sessions.get(sessionId)!.add(ws);
    updateActiveSessionsGauge();

    ws.on("message", (raw) => {
      let parsed: any = {};
      try { parsed = JSON.parse(raw.toString()); } catch {}
      if (parsed?.type === "message") {
        const payload: ChatMessage = {
          id: nanoid(12),
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
      } else if (parsed?.type === 'typing') {
        const evt = { type: 'typing', data: { sender: role, sessionId } };
        const clients = sessions.get(sessionId);
        if (clients) clients.forEach((c) => { try { c.send(JSON.stringify(evt)); } catch {} });
        try { chatTypingTotal.inc({ session: sessionId }); } catch {}
      } else if (parsed?.type === 'read') {
        const msgId = String(parsed.messageId || '');
        const list = transcripts.get(sessionId) || [];
        const m = list.find((x) => x.id === msgId);
        if (m) {
          m.readBy = Array.isArray(m.readBy) ? m.readBy : [];
          if (!m.readBy.includes(userId)) m.readBy.push(userId);
          transcripts.set(sessionId, list);
        }
        const clients = sessions.get(sessionId);
        if (clients) clients.forEach((c) => { try { c.send(JSON.stringify({ type: 'read', data: { messageId: msgId, userId } })); } catch {} });
        try { chatReadTotal.inc({ session: sessionId }); } catch {}
      }
    });

    ws.on("close", () => {
      const set = sessions.get(sessionId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) sessions.delete(sessionId);
      }
      updateActiveSessionsGauge();
    });

    // greet & presence info
    ws.send(JSON.stringify({ type: "welcome", data: { sessionId, role } }));
    ws.send(JSON.stringify({ type: "presence", data: getPresence() }));
  });

  // Metrics endpoint for Prometheus
  app.get('/metrics', async (_req: Request, res: Response) => {
    try {
      res.setHeader('Content-Type', registry.contentType);
      res.end(await registry.metrics());
    } catch {
      res.status(500).end();
    }
  });

  // Chat history endpoint for moderation and session persistence
  app.get('/api/chat/history/:sessionId', async (req: Request, res: Response) => {
    const id = req.params.sessionId;
    if (db) {
      try {
        const rows = await (db as any).select().from(chatMessages).where(eq((chatMessages as any).sessionId, id)).orderBy(asc((chatMessages as any).timestamp));
        const messages = rows.map((r: any) => ({ id: r.id, sessionId: r.sessionId, sender: r.sender, text: r.text || undefined, timestamp: new Date(r.timestamp).getTime(), readBy: String(r.readBy || '').split(',').filter(Boolean) }));
        return res.json({ messages });
      } catch {}
    }
    res.json({ messages: transcripts.get(id) || [] });
  });

  // List active chat sessions for agent dashboard
  app.get('/api/chat/sessions', (_req: Request, res: Response) => {
    const items = Array.from(sessions.keys()).map((id) => ({ id, participants: (sessions.get(id)?.size || 0) }));
    res.json({ items });
  });
})();

export default app;
