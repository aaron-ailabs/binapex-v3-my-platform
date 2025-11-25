import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { createHmac } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const SECRET = process.env.JWT_SECRET || 'binapex-dev-secret';
  const b64url = (buf: Buffer | string) => Buffer.from(buf as any).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  const signJWT = (payload: Record<string, any>) => {
    const header = { alg: 'HS256', typ: 'JWT' };
    const h = b64url(JSON.stringify(header));
    const withExp = { ...payload, exp: Math.floor(Date.now()/1000) + 24*60*60 };
    const p = b64url(JSON.stringify(withExp));
    const sig = createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
    return `${h}.${p}.${sig}`;
  };
  const verifyJWT = (token: string): Record<string, any> | null => {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [h,p,s] = parts;
    const expSig = createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
    if (s !== expSig) return null;
    try {
      const payload = JSON.parse(Buffer.from(p.replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString('utf8'));
      if (typeof payload.exp === 'number' && Math.floor(Date.now()/1000) > payload.exp) return null;
      return payload;
    } catch { return null; }
  };
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const payload = token ? verifyJWT(token) : null;
    if (!payload) return res.status(401).json({ message: 'Unauthorized' });
    (req as any).user = payload;
    next();
  };
  const requireRole = (roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
    const u = (req as any).user;
    if (!u || !roles.includes(u.role)) return res.status(403).json({ message: 'Forbidden' });
    next();
  };

  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ message: 'Missing credentials' });
    const user = await storage.getUserByUsername(String(username));
    if (!user || user.password !== password) return res.status(401).json({ message: 'Invalid credentials' });
    const token = signJWT({ sub: user.id, role: user.role, username: user.username });
    res.json({ token, role: user.role, userId: user.id });
  });

  app.get('/api/auth/verify', requireAuth, (req, res) => {
    res.json((req as any).user);
  });

  app.get('/api/support/status', (_req, res) => {
    res.json(getPresence());
  });

  app.post('/api/support/session', (_req, res) => {
    const id = Math.random().toString(36).slice(2, 10);
    res.json({ sessionId: id });
  });

  const assets = new Map<string, { name: string; market: string; enabled: boolean }>();
  const seedAssets = () => {
    [
      ['BINANCE:BTCUSDT','Bitcoin','Crypto'],['BINANCE:ETHUSDT','Ethereum','Crypto'],['BINANCE:SOLUSDT','Solana','Crypto'],
      ['FX:EURUSD','EUR/USD','Forex'],['FX:USDSGD','USD/SGD','Forex'],['FX:USDJPY','USD/JPY','Forex'],
      ['COMEX:GC1!','Gold','Commodities'],['NYMEX:CL1!','Crude Oil','Commodities']
    ].forEach(([symbol,name,market]) => assets.set(symbol, { name, market, enabled: true }));
  };
  seedAssets();

  app.get('/api/assets', requireAuth, (_req, res) => {
    res.json(Array.from(assets.entries()).map(([symbol, v]) => ({ symbol, ...v })));
  });
  app.post('/api/assets/toggle', requireAuth, requireRole(['Admin']), (req, res) => {
    const { symbol, enabled } = req.body || {};
    const a = assets.get(String(symbol));
    if (!a) return res.status(404).json({ message: 'Not found' });
    a.enabled = !!enabled;
    assets.set(String(symbol), a);
    res.json({ symbol, enabled: a.enabled });
  });

  const engine = { spreadBps: 25 };
  app.get('/api/engine', requireAuth, (_req, res) => {
    res.json(engine);
  });
  app.post('/api/engine', requireAuth, requireRole(['Admin']), (req, res) => {
    const { spreadBps } = req.body || {};
    engine.spreadBps = Number(spreadBps || engine.spreadBps);
    res.json(engine);
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

  app.post('/api/demo/seed', async (_req, res) => {
    const users = [
      { username: 'trader', password: 'password', role: 'Trader' },
      { username: 'admin', password: 'password', role: 'Admin' },
      { username: 'support', password: 'password', role: 'Customer Service' },
    ];
    const created: any[] = [];
    for (const u of users) {
      const existing = await storage.getUserByUsername(u.username);
      if (existing) {
        await storage.updateUser(existing.id, { role: u.role as any });
        created.push(existing);
      } else {
        const nu = await storage.createUser({ username: u.username, password: u.password });
        const upd = await storage.updateUser(nu.id, { role: u.role as any });
        created.push(upd);
      }
    }
    seedAssets();
    res.json({ users: created, assets: Array.from(assets.keys()) });
  });

  const wallets = new Map<string, { id: string; userId: string; assetName: string; balanceUsd: number }>();
  const trades = new Map<string, { id: string; userId: string; asset: string; symbol: string; amount: number; direction: 'High'|'Low'; duration: string; entryPrice: number; exitPrice?: number; result: 'Win'|'Loss'|'Pending'; status: 'Open'|'Closed'; createdAt: string; settledUsd?: number }>();
  const adminAudits: { id: string; adminId: string; userId: string; action: string; details: string; timestamp: string }[] = [];

  const ensureUsdWallet = (userId: string) => {
    const key = `${userId}:USD`;
    let w = wallets.get(key);
    if (!w) {
      w = { id: Math.random().toString(36).slice(2,9), userId, assetName: 'USD', balanceUsd: 0 };
      wallets.set(key, w);
    }
    return w;
  };

  app.get('/api/wallets', requireAuth, (req, res) => {
    const userId = String(((req as any).user).sub || '');
    const list = Array.from(wallets.values()).filter(w => w.userId === userId);
    res.json(list);
  });

  app.get('/api/trades', requireAuth, (req, res) => {
    const userId = String(((req as any).user).sub || '');
    const list = Array.from(trades.values()).filter(t => t.userId === userId);
    res.json(list);
  });

  app.post('/api/trades', requireAuth, (req, res) => {
    const userId = String(((req as any).user).sub || '');
    const { symbol, asset, amount, direction, duration } = req.body || {};
    const reg = assets.get(String(symbol));
    if (!reg || !reg.enabled) return res.status(403).json({ message: 'Asset disabled' });
    const amt = Number(amount || 0);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ message: 'Invalid amount' });
    const base = cache.has(String(symbol)) ? cache.get(String(symbol))! : computeBase(String(symbol));
    const id = Math.random().toString(36).slice(2,9);
    const t = { id, userId, asset: String(asset), symbol: String(symbol), amount: amt, direction: (direction === 'Low' ? 'Low' : 'High') as 'High'|'Low', duration: String(duration || '1M'), entryPrice: base, result: 'Pending' as 'Pending', status: 'Open' as 'Open', createdAt: new Date().toISOString() };
    trades.set(id, t);
    const ms = t.duration === '1M' ? 5000 : t.duration === '5M' ? 10000 : t.duration === '15M' ? 15000 : 20000;
    setTimeout(() => {
      const move = (Math.random() * 2 - 1) * (engine.spreadBps / 10000) * 10;
      const exit = Number((t.entryPrice * (1 + move)).toFixed(2));
      const wentUp = exit >= t.entryPrice;
      const win = (t.direction === 'High' && wentUp) || (t.direction === 'Low' && !wentUp);
      const updated = { ...t, exitPrice: exit, status: 'Closed' as 'Closed', result: (win ? 'Win' : 'Loss') as 'Win'|'Loss' };
      trades.set(id, updated);
      const profit = Number(((exit - t.entryPrice) * t.amount).toFixed(2));
      const w = ensureUsdWallet(userId);
      const settled = win ? Math.abs(profit) : -Math.abs(profit);
      w.balanceUsd = Number((w.balanceUsd + settled).toFixed(2));
      wallets.set(`${userId}:USD`, w);
      trades.set(id, { ...updated, settledUsd: settled });
      adminAudits.push({ id: Math.random().toString(36).slice(2,9), adminId: 'system', userId, action: 'trade_close', details: JSON.stringify({ tradeId: id, result: updated.result, exitPrice: exit, settledUsd: settled }), timestamp: new Date().toISOString() });
    }, ms);
    res.json(t);
  });

  app.post('/api/admin/trades/override', requireAuth, requireRole(['Admin']), (req, res) => {
    const { tradeId, result, exitPrice } = req.body || {};
    const t = trades.get(String(tradeId));
    if (!t) return res.status(404).json({ message: 'Not found' });
    const prev = t.settledUsd || 0;
    const exit = typeof exitPrice === 'number' ? Number(exitPrice) : Number((t.entryPrice * (1 + 0.01)).toFixed(2));
    const wentUp = exit >= t.entryPrice;
    const win = result === 'Win' ? true : result === 'Loss' ? false : (t.direction === 'High' && wentUp) || (t.direction === 'Low' && !wentUp);
    const profit = Number(((exit - t.entryPrice) * t.amount).toFixed(2));
    const settled = win ? Math.abs(profit) : -Math.abs(profit);
    const delta = Number((settled - prev).toFixed(2));
    const w = ensureUsdWallet(t.userId);
    w.balanceUsd = Number((w.balanceUsd + delta).toFixed(2));
    wallets.set(`${t.userId}:USD`, w);
      const updated = { ...t, exitPrice: exit, status: 'Closed' as 'Closed', result: (win ? 'Win' : 'Loss') as 'Win'|'Loss', settledUsd: settled };
    trades.set(String(tradeId), updated);
    const adminId = String(((req as any).user).sub || '');
    adminAudits.push({ id: Math.random().toString(36).slice(2,9), adminId, userId: t.userId, action: 'trade_override', details: JSON.stringify({ tradeId, result: updated.result, exitPrice: exit, deltaUsd: delta }), timestamp: new Date().toISOString() });
    res.json(updated);
  });

  app.get('/api/admin/audit', requireAuth, requireRole(['Admin']), (_req, res) => {
    res.json(adminAudits.slice(-200));
  });

  app.post('/api/deposits', requireAuth, (req, res) => {
    const userId = String(((req as any).user).sub || '');
    const { amount, note } = req.body || {};
    const amt = Number(amount || 0);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ message: 'Invalid amount' });
    const w = ensureUsdWallet(userId);
    w.balanceUsd = Number((w.balanceUsd + amt).toFixed(2));
    wallets.set(`${userId}:USD`, w);
    adminAudits.push({ id: Math.random().toString(36).slice(2,9), adminId: 'system', userId, action: 'deposit', details: JSON.stringify({ amount: amt, note }), timestamp: new Date().toISOString() });
    res.json({ ok: true, wallet: w });
  });

  app.post('/api/withdrawals', requireAuth, (req, res) => {
    const userId = String(((req as any).user).sub || '');
    const { amount, note } = req.body || {};
    const amt = Number(amount || 0);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ message: 'Invalid amount' });
    const w = ensureUsdWallet(userId);
    if (w.balanceUsd < amt) return res.status(400).json({ message: 'Insufficient balance' });
    w.balanceUsd = Number((w.balanceUsd - amt).toFixed(2));
    wallets.set(`${userId}:USD`, w);
    adminAudits.push({ id: Math.random().toString(36).slice(2,9), adminId: 'system', userId, action: 'withdraw', details: JSON.stringify({ amount: amt, note }), timestamp: new Date().toISOString() });
    res.json({ ok: true, wallet: w });
  });

  const clients = new Set<any>();
  const tracked = new Set<string>();
  const cache = new Map<string, number>();
  const computeBase = (s: string) => Math.abs(s.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 1000 + 100;
  app.get('/api/prices/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // ensure headers are flushed so the stream starts immediately
    try { (res as any).flushHeaders?.(); } catch {}
    try { res.write(':ok\n\n'); } catch {}
    const raw = String((req.query as any).symbols || '');
    const symbols = raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];
    if (symbols.length === 0) {
      cache.forEach((p, s) => {
        res.write(`data: ${JSON.stringify({ symbol: s, price: p })}\n\n`);
      });
    } else {
      for (const s of symbols) {
        if (!cache.has(s)) cache.set(s, computeBase(s));
        tracked.add(s);
        res.write(`data: ${JSON.stringify({ symbol: s, price: cache.get(s) })}\n\n`);
      }
    }
    clients.add(res);
    req.on('close', () => {
      clients.delete(res);
      try { res.end(); } catch {}
    });
  });

  const tick = () => {
    const list = tracked.size ? Array.from(tracked) : Array.from(cache.keys());
    for (const s of list) {
      const reg = assets.get(s);
      if (reg && !reg.enabled) continue;
      const p = cache.has(s) ? cache.get(s)! : computeBase(s);
      const np = Number((p * (1 + (Math.random() * 0.01 - 0.005))).toFixed(2));
      cache.set(s, np);
      clients.forEach((res: any) => {
        try { res.write(`data: ${JSON.stringify({ symbol: s, price: np })}\n\n`); } catch {}
      });
    }
  };
  setInterval(tick, 3000);

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
