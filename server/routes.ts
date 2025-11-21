import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/support/status', (_req, res) => {
    res.json(getPresence());
  });

  app.post('/api/support/session', (_req, res) => {
    const id = Math.random().toString(36).slice(2, 10);
    res.json({ sessionId: id });
  });

  // Safe image proxy to avoid cross-origin blocks in preview envs
  app.get('/api/assets/proxy', async (req, res, next) => {
    try {
      const raw = (req.query.url as string) || '';
      const parsed = new URL(raw);
      if (parsed.hostname !== 'images.unsplash.com') {
        return res.status(400).json({ message: 'Unsupported host' });
      }
      const r = await fetch(parsed.toString());
      if (!r.ok) {
        return res.status(502).json({ message: `Upstream ${r.status}` });
      }
      const ct = r.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', ct);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      const buf = Buffer.from(await r.arrayBuffer());
      res.end(buf);
    } catch (e) {
      next(e);
    }
  });

  // Simple in-memory attachment handling
  const files = new Map<string, { mime: string; buf: Buffer; filename: string }>();
  app.post('/api/chat/upload', async (req, res, next) => {
    try {
      const { filename, mimeType, contentBase64 } = req.body || {};
      const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
      if (!allowed.includes(mimeType)) {
        return res.status(400).json({ message: 'Unsupported file type' });
      }
      const buf = Buffer.from(String(contentBase64 || ''), 'base64');
      const max = 5 * 1024 * 1024;
      if (buf.length === 0 || buf.length > max) {
        return res.status(400).json({ message: 'Invalid or too large file' });
      }
      const id = Math.random().toString(36).slice(2, 10);
      files.set(id, { mime: mimeType, buf, filename });
      res.json({ id, url: `/api/chat/file/${id}` });
    } catch (e) {
      next(e);
    }
  });

  app.get('/api/chat/file/:id', (req, res) => {
    const id = req.params.id;
    const f = files.get(id);
    if (!f) return res.status(404).end();
    res.setHeader('Content-Type', f.mime);
    res.setHeader('Content-Disposition', `inline; filename="${f.filename}"`);
    res.end(f.buf);
  });

  const httpServer = createServer(app);

  return httpServer;
}

type Presence = { status: 'online'|'away'|'offline', waitTimeMins: number };
const presence: Presence = { status: 'offline', waitTimeMins: 5 };
export function getPresence(): Presence { return presence; }
export function setPresence(p: Partial<Presence>) {
  if (typeof p.status !== 'undefined') presence.status = p.status;
  if (typeof p.waitTimeMins === 'number') presence.waitTimeMins = p.waitTimeMins;
}

export function registerPresenceRoutes(app: Express, onUpdate?: (p: Presence) => void) {
  app.post('/api/support/presence', (req, res) => {
    const { status, waitTimeMins } = req.body || {};
    if (status && !['online','away','offline'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    setPresence({ status, waitTimeMins });
    const p = getPresence();
    if (onUpdate) try { onUpdate(p); } catch {}
    res.json(p);
  });
}
