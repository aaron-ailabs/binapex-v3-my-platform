import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { createHmac } from "crypto";
import { validatePasswordStrength } from "./crypto";

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

  // Rate limiting middleware for security endpoints
  const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
  const requireRateLimit = (key: string, maxAttempts: number, windowMs: number) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const now = Date.now();
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const rateKey = `${key}:${ip}`;
      
      let record = rateLimitStore.get(rateKey);
      if (!record || now > record.resetTime) {
        record = { count: 0, resetTime: now + windowMs };
        rateLimitStore.set(rateKey, record);
      }
      
      record.count++;
      
      if (record.count > maxAttempts) {
        return res.status(429).json({ 
          message: 'Too many attempts. Please try again later.',
          retryAfter: Math.ceil((record.resetTime - now) / 1000)
        });
      }
      
      next();
    };
  };

  const enforceTLS = (req: Request, res: Response, next: NextFunction) => {
    const env = (process.env.NODE_ENV || '').toLowerCase();
    const forwarded = (req.headers['x-forwarded-proto'] as string) || '';
    const secure = req.secure || forwarded === 'https';
    const host = (req.headers.host || '').split(':')[0];
    const local = host === 'localhost' || host === '127.0.0.1';
    if (env !== 'development' && !secure && !local) return res.status(403).json({ message: 'HTTPS required' });
    next();
  };

  const verificationCodes = new Map<string, { code: string; expiresAt: number }>();

  app.post('/api/security/request-verification', requireAuth, requireRateLimit('verification-send', 5, 3600000), enforceTLS, async (req, res) => {
    const userId = String(((req as any).user).sub || '');
    const { channel } = req.body || {};
    const ch = String(channel || 'email');
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    verificationCodes.set(`${userId}:${ch}`, { code, expiresAt });
    const dev = (process.env.NODE_ENV || '').toLowerCase() === 'development';
    res.json(dev ? { sent: true, devCode: code } : { sent: true });
  });

  app.post('/api/security/withdrawal-password', requireAuth, requireRateLimit('withdrawal-password-set', 3, 3600000), enforceTLS, async (req, res) => {
    try {
      const userId = String(((req as any).user).sub || '');
      const { password, confirmPassword, code, channel } = req.body || {};
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      if (!password || !confirmPassword) {
        await storage.addSecurityEvent(userId, { type: 'password_change', timestamp: new Date(), ipAddress: ip, status: 'failed', details: 'Missing password or confirmation' });
        return res.status(400).json({ message: 'Password and confirmation are required' });
      }
      if (password !== confirmPassword) {
        await storage.addSecurityEvent(userId, { type: 'password_change', timestamp: new Date(), ipAddress: ip, status: 'failed', details: 'Passwords do not match' });
        return res.status(400).json({ message: 'Passwords do not match' });
      }
      const strength = validatePasswordStrength(password);
      if (!strength.isValid) {
        await storage.addSecurityEvent(userId, { type: 'password_change', timestamp: new Date(), ipAddress: ip, status: 'failed', details: 'Weak password' });
        return res.status(400).json({ message: 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special characters' });
      }
      const ch = String(channel || 'email');
      const key = `${userId}:${ch}`;
      const v = verificationCodes.get(key);
      if (!v || v.code !== String(code || '')) {
        await storage.addSecurityEvent(userId, { type: 'verification', timestamp: new Date(), ipAddress: ip, status: 'failed', details: 'Invalid verification code' });
        return res.status(401).json({ message: 'Invalid verification code' });
      }
      if (Date.now() > v.expiresAt) {
        verificationCodes.delete(key);
        await storage.addSecurityEvent(userId, { type: 'verification', timestamp: new Date(), ipAddress: ip, status: 'failed', details: 'Verification code expired' });
        return res.status(401).json({ message: 'Verification code expired' });
      }
      const success = await storage.setWithdrawalPassword(userId, password);
      if (!success) {
        return res.status(500).json({ message: 'Failed to set withdrawal password' });
      }
      verificationCodes.delete(key);
      await storage.addSecurityEvent(userId, { type: 'password_change', timestamp: new Date(), ipAddress: ip, status: 'success', details: 'Withdrawal password set' });
      res.json({ success: true, message: 'Withdrawal password set successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/security/verify-withdrawal-password', requireAuth, requireRateLimit('withdrawal-password-verify', 5, 3600000), enforceTLS, async (req, res) => {
    try {
      const userId = String(((req as any).user).sub || '');
      const { password } = req.body || {};
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      if (!password) {
        await storage.addSecurityEvent(userId, { type: 'verification', timestamp: new Date(), ipAddress: ip, status: 'failed', details: 'Missing password' });
        return res.status(400).json({ message: 'Password is required' });
      }
      const isValid = await storage.verifyWithdrawalPassword(userId, password);
      if (!isValid) {
        await storage.addSecurityEvent(userId, { type: 'verification', timestamp: new Date(), ipAddress: ip, status: 'failed', details: 'Invalid withdrawal password' });
        return res.status(401).json({ message: 'Invalid withdrawal password' });
      }
      await storage.addSecurityEvent(userId, { type: 'verification', timestamp: new Date(), ipAddress: ip, status: 'success', details: 'Withdrawal password verified' });
      res.json({ success: true, message: 'Withdrawal password verified' });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/security/events', requireAuth, async (req, res) => {
    try {
      const userId = String(((req as any).user).sub || '');
      const events = await storage.getSecurityEvents(userId);
      res.json(events || []);
    } catch (error) {
      console.error('Error fetching security events:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
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

  const engine = { spreadBps: 25, payoutPct: 85 };
  app.get('/api/engine', requireAuth, (_req, res) => {
    res.json(engine);
  });
  app.post('/api/engine', requireAuth, requireRole(['Admin']), (req, res) => {
    const { spreadBps, payoutPct } = req.body || {};
    if (typeof spreadBps !== 'undefined') {
      engine.spreadBps = Number(spreadBps || engine.spreadBps);
    }
    if (typeof payoutPct !== 'undefined') {
      const pct = Math.max(0, Math.min(100, Number(payoutPct)));
      engine.payoutPct = Number.isFinite(pct) ? pct : engine.payoutPct;
    }
    res.json(engine);
  });

  const ALPHA_KEY = process.env.ALPHAVANTAGE_API_KEY || '';
  app.get('/api/prices/alpha', async (req, res, next) => {
    try {
      const s = String((req.query as any).symbol || '').trim();
      if (!s) return res.status(400).json({ message: 'Missing symbol' });
      if (!ALPHA_KEY) return res.status(500).json({ message: 'AlphaVantage key not configured' });
      let from = '', to = '';
      const m = s.match(/^(?:BINANCE|COINBASE|FX):([A-Z]+)([A-Z]+)$/);
      if (m) {
        from = m[1];
        to = m[2];
      } else {
        const guess = s.replace(/[^A-Z]/g, '');
        if (guess.length >= 6) { from = guess.slice(0,3); to = guess.slice(3,6); }
      }
      if (!from || !to) return res.status(400).json({ message: 'Unsupported symbol' });
      const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${encodeURIComponent(from)}&to_currency=${encodeURIComponent(to)}&apikey=${ALPHA_KEY}`;
      const r = await fetch(url);
      if (!r.ok) return res.status(502).json({ message: `Upstream ${r.status}` });
      const j = await r.json();
      const rateRaw = j?.['Realtime Currency Exchange Rate']?.['5. Exchange Rate'] || j?.['Realtime Currency Exchange Rate']?.['5. Exchange Rate'];
      const rate = Number(rateRaw);
      if (!Number.isFinite(rate)) return res.status(502).json({ message: 'Invalid upstream data' });
      res.json({ symbol: s, price: rate, source: 'alphavantage' });
    } catch (e) {
      next(e);
    }
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
  const trades = new Map<string, { id: string; userId: string; asset: string; symbol: string; amount: number; direction: 'High'|'Low'; duration: string; entryPrice: number; exitPrice?: number; result: 'Win'|'Loss'|'Pending'; status: 'Open'|'Closed'; createdAt: string; settledUsd?: number; payoutPct?: number }>();
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
    let reg = assets.get(String(symbol));
    if (!reg) {
      reg = { name: String(asset || 'Unknown'), market: 'Unknown', enabled: true };
      assets.set(String(symbol), reg);
    }
    if (!reg.enabled) return res.status(403).json({ message: 'Asset disabled' });
    const amt = Number(amount || 0);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ message: 'Invalid amount' });
    const base = cache.has(String(symbol)) ? cache.get(String(symbol))! : computeBase(String(symbol));
    const id = Math.random().toString(36).slice(2,9);
    const t = { id, userId, asset: String(asset), symbol: String(symbol), amount: amt, direction: (direction === 'Low' ? 'Low' : 'High') as 'High'|'Low', duration: String(duration || '1M'), entryPrice: base, result: 'Pending' as 'Pending', status: 'Open' as 'Open', createdAt: new Date().toISOString(), payoutPct: engine.payoutPct };
    trades.set(id, t);
    const parseMs = (d: string) => {
      const s = String(d).trim().toUpperCase();
      if (s.endsWith('M')) return Number(s.slice(0, -1)) * 60_000;
      if (s.endsWith('H')) return Number(s.slice(0, -1)) * 3_600_000;
      return 60_000;
    };
    const scale = Number(process.env.TRADING_DURATION_SCALE || '1');
    const ms = Math.max(1000, Math.floor(parseMs(t.duration) * (Number.isFinite(scale) && scale > 0 ? scale : 1)));
    setTimeout(() => {
      const move = (Math.random() * 2 - 1) * (engine.spreadBps / 10000) * 10;
      const exit = Number((t.entryPrice * (1 + move)).toFixed(2));
      const wentUp = exit >= t.entryPrice;
      const win = (t.direction === 'High' && wentUp) || (t.direction === 'Low' && !wentUp);
      const updated = { ...t, exitPrice: exit, status: 'Closed' as 'Closed', result: (win ? 'Win' : 'Loss') as 'Win'|'Loss' };
      trades.set(id, updated);
      const w = ensureUsdWallet(userId);
      const payout = Number(((t.amount * (t.payoutPct ?? engine.payoutPct)) / 100).toFixed(2));
      const settled = win ? payout : -t.amount;
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
    const payout = Number(((t.amount * (t.payoutPct ?? engine.payoutPct)) / 100).toFixed(2));
    const settled = win ? payout : -t.amount;
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

  app.post('/api/withdrawals', requireAuth, requireRateLimit('withdrawal', 5, 3600000), enforceTLS, async (req, res) => {
    const userId = String(((req as any).user).sub || '');
    const { amount, note, withdrawalPassword } = req.body || {};
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (typeof withdrawalPassword !== 'string' || withdrawalPassword.trim() === '') {
      await storage.addSecurityEvent(userId, { type: 'withdrawal', timestamp: new Date(), ipAddress: ip, status: 'failed', details: 'Missing withdrawal password' });
      return res.status(400).json({ message: 'Withdrawal password required' });
    }
    const isValid = await storage.verifyWithdrawalPassword(userId, withdrawalPassword);
    if (!isValid) {
      await storage.addSecurityEvent(userId, { type: 'withdrawal', timestamp: new Date(), ipAddress: ip, status: 'failed', details: 'Invalid withdrawal password' });
      return res.status(401).json({ message: 'Invalid withdrawal password' });
    }
    const amt = Number(amount || 0);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ message: 'Invalid amount' });
    const w = ensureUsdWallet(userId);
    if (w.balanceUsd < amt) return res.status(400).json({ message: 'Insufficient balance' });
    w.balanceUsd = Number((w.balanceUsd - amt).toFixed(2));
    wallets.set(`${userId}:USD`, w);
    await storage.addSecurityEvent(userId, {
      type: 'withdrawal',
      timestamp: new Date(),
      ipAddress: ip,
      status: 'success',
      details: `Withdrawal of $${amt}${note ? ` - ${note}` : ''}`
    });
    adminAudits.push({ 
      id: Math.random().toString(36).slice(2,9), 
      adminId: 'system', 
      userId, 
      action: 'withdraw', 
      details: JSON.stringify({ amount: amt, note }), 
      timestamp: new Date().toISOString() 
    });
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
