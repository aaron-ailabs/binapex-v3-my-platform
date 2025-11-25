import { Readable } from 'stream';
import { type Express, type Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storageDb as storage } from "./storage";
import { createHmac, randomBytes } from "crypto";
import { validatePasswordStrength, verifyPassword, generateSecureToken, hashPassword } from "./crypto";
import { z } from 'zod';
import { registry, tradeExecutionDuration } from './metrics';
import { db } from './db';
import { wallets as tblWallets, trades as tblTrades, transactions as tblTransactions } from '@shared/schema';
import * as speakeasy from "speakeasy";
import { eq, and, gte, sql as dsql } from 'drizzle-orm';
import Redis from 'ioredis';

import { notificationService } from "./services/notification";
import { complianceService } from "./services/compliance";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/metrics', async (_req: Request, res: Response) => {
    res.setHeader('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  });

  const SECRET = process.env.JWT_SECRET || randomBytes(32).toString('hex');
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

  const { requireRateLimit } = await import('./rate-limit');

  const enforceTLS = (req: Request, res: Response, next: NextFunction) => {
    const env = (process.env.NODE_ENV || '').toLowerCase();
    const forwarded = (req.headers['x-forwarded-proto'] as string) || '';
    const secure = req.secure || forwarded === 'https';
    const host = (req.headers.host || '').split(':')[0];
    const local = host === 'localhost' || host === '127.0.0.1';
    if (env !== 'development' && !secure && !local) return res.status(403).json({ message: 'HTTPS required' });
    next();
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

  const loginSchema = z.object({ username: z.string().min(3).max(64), password: z.string().min(8).max(256) });
  
  const forgotPasswordSchema = z.object({ email: z.string().email() });
  const resetPasswordSchema = z.object({ token: z.string(), password: z.string().min(8).max(256), confirmPassword: z.string().min(8).max(256) });

  app.post('/api/auth/forgot-password', requireRateLimit('forgot-password', 3, 3600000), enforceTLS, async (req: Request, res: Response) => {
    const parsed = forgotPasswordSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ message: 'Invalid email format' });
    
    const { email } = parsed.data;
    // Assuming username is email. If separate email field exists, use it.
    // Based on previous checks, username is the identifier. 
    // If the system strictly uses email as username, this is fine.
    // If username is not email, we should look up by email field if it existed, but it doesn't.
    // So we assume username === email.
    
    const user = await storage.getUserByUsername(email);
    
    // Always return success to prevent user enumeration
    if (!user) {
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 500));
      return res.json({ message: 'If that email is registered, we have sent a password reset link.' });
    }

    const token = generateSecureToken(32);
    const expires = Date.now() + 3600000; // 1 hour

    await storage.updateUser(user.id, {
      resetPasswordToken: token,
      resetPasswordExpires: expires as any
    });

    const resetLink = `${req.protocol}://${req.get('host')}/auth/reset-password?token=${token}`;
    
    // In dev, we might want to return the token for testing, but let's stick to "sent" message.
    // The NotificationService will log it to console.
    await notificationService.send({
        userId: user.id,
        type: 'EMAIL',
        recipient: email,
        subject: 'Reset Your Password - Binapex',
        message: `You requested a password reset. Click here to reset your password: ${resetLink}\n\nThis link expires in 1 hour.`
    });

    res.json({ message: 'If that email is registered, we have sent a password reset link.' });
  });

  app.post('/api/auth/reset-password', requireRateLimit('reset-password', 5, 3600000), enforceTLS, async (req: Request, res: Response) => {
    const parsed = resetPasswordSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ message: 'Invalid request format' });
    
    const { token, password, confirmPassword } = parsed.data;
    
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const strength = validatePasswordStrength(password);
    if (!strength.isValid) {
      return res.status(400).json({ message: 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special characters' });
    }

    const user = await storage.getUserByResetToken(token);
    if (!user || !user.resetPasswordExpires) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const now = Date.now();
    // Compare BigInt with Number (convert BigInt to Number or Number to BigInt)
    // resetPasswordExpires is bigint in DB.
    if (Number(user.resetPasswordExpires) < now) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const hashedPassword = hashPassword(password);
    
    await storage.updateUser(user.id, {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        securitySettings: {
            ...user.securitySettings!,
            lastPasswordChange: new Date()
        }
    });
    
    await notificationService.send({
        userId: user.id,
        type: 'EMAIL',
        recipient: user.username,
        subject: 'Password Changed - Binapex',
        message: 'Your password has been successfully changed. If you did not make this change, please contact support immediately.'
    });

    res.json({ message: 'Password reset successfully' });
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ message: 'Invalid credentials format' });
    const { username: u, password: p } = parsed.data;
    const user = await storage.getUserByUsername(u);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await verifyPassword(p, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const token = signJWT({ sub: user.id, role: user.role, username: user.username });
    res.json({ token, role: user.role, userId: user.id });
  });

  app.get('/api/auth/verify', requireAuth, (req: Request, res: Response) => {
    res.json((req as any).user);
  });


  const verificationCodes = new Map<string, { code: string; expiresAt: number }>();

  app.post('/api/security/request-verification', requireAuth, requireRateLimit('verification-send', 5, 3600000), enforceTLS, async (req: Request, res: Response) => {
    const userId = String(((req as any).user).sub || '');
    const { channel } = req.body || {};
    const ch = String(channel || 'email');
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    verificationCodes.set(`${userId}:${ch}`, { code, expiresAt });
    const dev = (process.env.NODE_ENV || '').toLowerCase() === 'development';
    res.json(dev ? { sent: true, devCode: code } : { sent: true });
  });

  app.get('/api/notifications', requireAuth, async (req: Request, res: Response) => {
    const userId = String(((req as any).user).sub || '');
    const unreadOnly = String((req.query as any).unread || '') === '1';
    const list = await storage.getNotifications(userId, unreadOnly);
    res.json(list);
  });

  app.patch('/api/notifications/:id/read', requireAuth, async (req: Request, res: Response) => {
    const id = String(req.params.id || '');
    if (!id) return res.status(400).json({ message: 'Invalid id' });
    await storage.markNotificationRead(id);
    res.json({ ok: true });
  });

  const notificationClients = new Map<string, Set<any>>();
  app.get('/api/notifications/stream', requireAuth, async (req: Request, res: Response) => {
    const userId = String(((req as any).user).sub || '');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    try { (res as any).flushHeaders?.(); } catch {}
    try { res.write(':ok\n\n'); } catch {}
    if (!notificationClients.has(userId)) notificationClients.set(userId, new Set());
    notificationClients.get(userId)!.add(res);
    const send = async () => {
      const unread = await storage.getNotifications(userId, true);
      const payload = { unreadCount: unread.length, notifications: unread.slice(0, 10) };
      try { res.write(`data: ${JSON.stringify(payload)}\n\n`); } catch {}
    };
    await send();
    const interval = setInterval(send, 5000);
    req.on('close', () => {
      clearInterval(interval);
      const set = notificationClients.get(userId);
      if (set) {
        set.delete(res);
        if (set.size === 0) notificationClients.delete(userId);
      }
      try { res.end(); } catch {}
    });
  });

  app.post('/api/security/withdrawal-password', requireAuth, requireRateLimit('withdrawal-password-set', 3, 3600000), enforceTLS, async (req: Request, res: Response) => {
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

  app.post('/api/security/verify-withdrawal-password', requireAuth, requireRateLimit('withdrawal-password-verify', 5, 3600000), enforceTLS, async (req: Request, res: Response) => {
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

  app.get('/api/security/events', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = String(((req as any).user).sub || '');
      const events = await storage.getSecurityEvents(userId);
      res.json(events || []);
    } catch (error) {
      console.error('Error fetching security events:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  app.get('/api/support/status', (_req: Request, res: Response) => {
    res.json(getPresence());
  });

  app.post('/api/support/session', (_req: Request, res: Response) => {
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

  app.get('/api/assets', requireAuth, (_req: Request, res: Response) => {
    res.json(Array.from(assets.entries()).map(([symbol, v]) => ({ symbol, ...v })));
  });
  const toggleSchema = z.object({ symbol: z.string().min(3).max(64), enabled: z.boolean() });
  app.post('/api/assets/toggle', requireAuth, requireRole(['Admin']), (req: Request, res: Response) => {
    const parsed = toggleSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ message: 'Invalid toggle request' });
    const { symbol, enabled } = parsed.data;
    const a = assets.get(symbol);
    if (!a) return res.status(404).json({ message: 'Not found' });
    a.enabled = enabled;
    assets.set(symbol, a);
    res.json({ symbol, enabled });
  });

  const redisUrl = process.env.REDIS_URL || '';
  const redis = redisUrl ? new Redis(redisUrl) : null;
  const engine = { spreadBps: 25, payoutPct: 85 };
  if (redis) {
    try { redis.get('engine').then((v) => { if (v) { try { const e = JSON.parse(v); if (typeof e.spreadBps === 'number') engine.spreadBps = e.spreadBps; if (typeof e.payoutPct === 'number') engine.payoutPct = e.payoutPct; } catch {} } }); } catch {}
  }
  app.get('/api/engine', requireAuth, async (_req: Request, res: Response) => {
    if (redis) {
      try { const v = await redis.get('engine'); if (v) { try { return res.json(JSON.parse(v)); } catch {} } } catch {}
    }
    res.json(engine);
  });
  const engineSchema = z.object({
    spreadBps: z.number().int().min(0).max(10000).optional(),
    payoutPct: z.number().min(0).max(100).optional()
  });
  app.post('/api/engine', requireAuth, requireRole(['Admin']), async (req: Request, res: Response) => {
    const parsed = engineSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ message: 'Invalid engine configuration' });
    const { spreadBps, payoutPct } = parsed.data;
    if (typeof spreadBps !== 'undefined') {
      engine.spreadBps = Number(spreadBps || engine.spreadBps);
    }
    if (typeof payoutPct !== 'undefined') {
      const pct = Math.max(0, Math.min(100, Number(payoutPct)));
      engine.payoutPct = Number.isFinite(pct) ? pct : engine.payoutPct;
    }
    if (redis) { try { await redis.set('engine', JSON.stringify(engine)); } catch {} }
    res.json(engine);
  });

  const ALPHA_KEY = process.env.ALPHAVANTAGE_API_KEY || '';
  app.get('/api/prices/alpha', async (req: Request, res: Response, next: NextFunction) => {
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
  app.get('/api/assets/proxy', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const raw = (req.query.url as string) || '';
      if (!raw) return res.status(400).json({ message: 'Missing url' });
      const parsed = new URL(raw);
      if (parsed.protocol !== 'https:') return res.status(400).json({ message: 'Only https allowed' });
      const allowedHosts = new Set(['images.unsplash.com', 'source.unsplash.com']);
      if (!allowedHosts.has(parsed.hostname)) {
        return res.status(400).json({ message: 'Unsupported host' });
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
      const onAbort = () => { try { controller.abort(); } catch {} };
      req.on('close', onAbort);
      
      let r;
      try {
        r = await fetch(parsed.toString(), { 
          headers: { 
            'Accept': 'image/*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }, 
          signal: controller.signal 
        });
        clearTimeout(timeout);
      } catch (err) {
        clearTimeout(timeout);
        // Log the error but don't crash, return fallback if it's a network error
        if (process.env.NODE_ENV !== 'test') console.error('Proxy fetch failed:', err);
        const fallback = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWP4//8/AwAI/AL+f3q1JwAAAABJRU5ErkJggg==',
          'base64'
        );
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-cache');
        return res.end(fallback);
      }

      if (!r.ok || !r.body) {
        const fallback = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWP4//8/AwAI/AL+f3q1JwAAAABJRU5ErkJggg==',
          'base64'
        );
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-cache');
        return res.end(fallback);
      }
      const ct = r.headers.get('content-type') || '';
      if (!ct.startsWith('image/')) {
        // If upstream returns non-image (e.g. HTML error), return fallback to avoid ORB blocks
        const fallback = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWP4//8/AwAI/AL+f3q1JwAAAABJRU5ErkJggg==',
          'base64'
        );
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'no-cache');
        return res.end(fallback);
      }
      res.setHeader('Content-Type', ct);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Access-Control-Allow-Origin', '*');
      const nodeStream = ((r.body as any).pipe ? r.body : Readable.fromWeb(r.body as any)) as Readable;
      nodeStream.on('error', () => {
        try { res.destroy(); } catch {}
      });
      nodeStream.pipe(res);
    } catch (e) {
      next(e);
    }
  });

  // Simple in-memory attachment handling
  const files = new Map<string, { mime: string; buf: Buffer; filename: string }>();
  app.post('/api/chat/upload', async (req: Request, res: Response, next: NextFunction) => {
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

  app.get('/api/chat/file/:id', (req: Request, res: Response) => {
    const id = req.params.id;
    const f = files.get(id);
    if (!f) return res.status(404).end();
    res.setHeader('Content-Type', f.mime);
    res.setHeader('Content-Disposition', `inline; filename="${f.filename}"`);
    res.end(f.buf);
  });

  app.post('/api/demo/seed', async (_req: Request, res: Response) => {
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

  const ensureUsdWallet = async (userId: string) => {
    const key = `${userId}:USD`;
    let w = wallets.get(key);
    if (!w) {
      w = { id: Math.random().toString(36).slice(2,9), userId, assetName: 'USD', balanceUsd: 0 };
      wallets.set(key, w);
    }
    if (db) {
      const existing = await db.select().from(tblWallets).where(eq(tblWallets.userId, userId)).limit(1);
      if (existing[0]) return existing[0] as any;
      const [created] = await db.insert(tblWallets).values({ userId, assetName: 'USD', balanceUsdCents: 0 }).returning();
      return created as any;
    }
    return w as any;
  };

  app.get('/api/wallets', requireAuth, async (req: Request, res: Response) => {
    const userId = String(((req as any).user).sub || '');
    if (db) {
      const list = await db.select().from(tblWallets).where(eq(tblWallets.userId, userId));
      const out = list.map(w => ({ id: w.id, userId: w.userId, assetName: w.assetName, balanceUsd: Number((w.balanceUsdCents/100).toFixed(2)) }));
      return res.json(out);
    }
    const list = Array.from(wallets.values()).filter(w => w.userId === userId);
    res.json(list);
  });

  app.get('/api/trades', requireAuth, async (req: Request, res: Response) => {
    const userId = String(((req as any).user).sub || '');
    if (db) {
      const list = await db.select().from(tblTrades).where(eq(tblTrades.userId, userId));
      const out = list.map(t => ({
        id: t.id, userId: t.userId, asset: t.asset, symbol: t.symbol,
        amount: Number((t.amountUsdCents/100).toFixed(2)), direction: t.direction as any,
        duration: t.duration, entryPrice: Number((t.entryPrice/100).toFixed(2)), exitPrice: t.exitPrice ? Number((t.exitPrice/100).toFixed(2)) : undefined,
        result: t.result as any, status: t.status as any, createdAt: (t.createdAt as any as Date).toISOString(), settledUsd: t.settledUsdCents ? Number((t.settledUsdCents/100).toFixed(2)) : undefined, payoutPct: t.payoutPct
      }));
      return res.json(out);
    }
    const list = Array.from(trades.values()).filter(t => t.userId === userId);
    res.json(list);
  });

  const tradeSchema = z.object({
    symbol: z.string().min(3).max(64),
    asset: z.string().min(2).max(64),
    amount: z.number().positive(),
    direction: z.enum(['High','Low']),
    duration: z.string().regex(/^[1-9][0-9]*[MH]$/).optional()
  });
  app.post('/api/trades', requireAuth, (req: Request, res: Response) => {
    const userId = String(((req as any).user).sub || '');
    const parsed = tradeSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ message: 'Invalid trade request' });
    const { symbol, asset, amount, direction, duration } = parsed.data;
    let reg = assets.get(String(symbol));
    if (!reg) {
      reg = { name: String(asset || 'Unknown'), market: 'Unknown', enabled: true };
      assets.set(String(symbol), reg);
    }
    if (!reg.enabled) return res.status(403).json({ message: 'Asset disabled' });
    const amt = Number(amount);
    const tierLimits: Record<string, number> = { Silver: 1000, Gold: 5000, Platinum: 10000 };
    const exposureLimits: Record<string, number> = { Crypto: 100000, Forex: 200000, Commodities: 150000, Unknown: 50000 };
    const maxOpenTrades = 10;
    const dailyVolumeLimit = 50000;
    const dailyLossLimit = 5000;
    const uPromise = storage.getUser(userId);
    const openForUser = Array.from(trades.values()).filter(t => t.userId === userId && t.status === 'Open');
    if (openForUser.length >= maxOpenTrades) return res.status(403).json({ message: 'Max open trades reached' });
    const marketType = reg.market || 'Unknown';
    const exposureOpen = Array.from(trades.values()).filter(t => t.asset === String(asset) && t.status === 'Open').reduce((a, t) => a + Number(t.amount || 0), 0);
    if (exposureOpen + amt > (exposureLimits[marketType] || exposureLimits.Unknown)) return res.status(403).json({ message: 'Platform exposure limit reached' });
    const baseBefore = cache.has(String(symbol)) ? cache.get(String(symbol))! : computeBase(String(symbol));
    const prev = baseBefore;
    const nextP = Number((baseBefore * (1 + (Math.random() * 0.01 - 0.005))).toFixed(2));
    const movePct = Math.abs((nextP - prev) / prev) * 100;
    const volThreshold = 2;
    if (movePct > volThreshold) return res.status(403).json({ message: 'Volatility protection active' });
    const nowIso = new Date(Date.now() - 24*60*60*1000).toISOString();
    const dailyTrades = Array.from(trades.values()).filter(t => t.userId === userId && new Date(t.createdAt).toISOString() >= nowIso);
    const dailyVol = dailyTrades.reduce((a, t) => a + Number(t.amount || 0), 0) + amt;
    if (dailyVol > dailyVolumeLimit) return res.status(403).json({ message: 'Daily trade limit exceeded' });
    const dailyLoss = dailyTrades.filter(t => t.status === 'Closed' && t.result === 'Loss').reduce((a, t) => a + Math.abs(Number(t.settledUsd || 0)), 0);
    if (dailyLoss >= dailyLossLimit) return res.status(403).json({ message: 'Daily loss limit reached' });
    return uPromise.then((u) => {
      const tier = (u?.membershipTier || 'Silver') as string;
      const maxAmt = tierLimits[tier] || tierLimits.Silver;
      if (amt > maxAmt) return res.status(403).json({ message: 'Maximum trade size exceeded' });
      const base = cache.has(String(symbol)) ? cache.get(String(symbol))! : computeBase(String(symbol));
      const id = Math.random().toString(36).slice(2,9);
      const t = { id, userId, asset: String(asset), symbol: String(symbol), amount: amt, direction: (direction === 'Low' ? 'Low' : 'High') as 'High'|'Low', duration: String(duration || '1M'), entryPrice: base, result: 'Pending' as 'Pending', status: 'Open' as 'Open', createdAt: new Date().toISOString(), payoutPct: engine.payoutPct };
      trades.set(id, t);
      if (db) {
        db.insert(tblTrades).values({
          id,
          userId,
          asset: t.asset,
          symbol: t.symbol,
          amountUsdCents: Math.round(amt * 100),
          direction: t.direction,
          duration: t.duration,
          entryPrice: Math.round(base * 100),
          result: t.result,
          status: t.status,
          payoutPct: t.payoutPct ?? engine.payoutPct,
        }).catch(() => {});
      }
      try { notificationService.send({ userId, type: 'IN_APP', recipient: userId, subject: 'Trade Opened', message: `${t.symbol} ${t.direction} $${t.amount}` }); } catch {}
      if (adminTradeClients.size) {
        const payload = { type: 'trade_open', trade: t };
        adminTradeClients.forEach((res: any) => { try { res.write(`data: ${JSON.stringify(payload)}\n\n`); } catch {} });
      }
      const largeThreshold = 5000;
      if (t.amount >= largeThreshold && adminTradeClients.size) {
        const payload = { type: 'large_trade', trade: t };
        adminTradeClients.forEach((res: any) => { try { res.write(`data: ${JSON.stringify(payload)}\n\n`); } catch {} });
      }
      const recentMs = 60_000;
      const recentCount = Array.from(trades.values()).filter(x => x.userId === userId && Date.now() - new Date(x.createdAt).getTime() < recentMs).length;
      if (recentCount >= 3 && adminTradeClients.size) {
        const payload = { type: 'suspicious_pattern', userId, pattern: 'burst_trading', count: recentCount };
        adminTradeClients.forEach((res: any) => { try { res.write(`data: ${JSON.stringify(payload)}\n\n`); } catch {} });
        try { storage.addSecurityEvent(userId, { type: 'verification', timestamp: new Date(), ipAddress: 'system', status: 'pending', details: 'Suspicious trading pattern: burst_trading' }); } catch {}
      }
      const parseMs = (d: string) => {
        const s = String(d).trim().toUpperCase();
        if (s.endsWith('M')) return Number(s.slice(0, -1)) * 60_000;
        if (s.endsWith('H')) return Number(s.slice(0, -1)) * 3_600_000;
        return 60_000;
      };
      const scale = Number(process.env.TRADING_DURATION_SCALE || '1');
      const ms = Math.max(1000, Math.floor(parseMs(t.duration) * (Number.isFinite(scale) && scale > 0 ? scale : 1)));
      setTimeout(async () => {
        const move = (Math.random() * 2 - 1) * (engine.spreadBps / 10000) * 10;
        const exit = Number((t.entryPrice * (1 + move)).toFixed(2));
        const wentUp = exit >= t.entryPrice;
        const win = (t.direction === 'High' && wentUp) || (t.direction === 'Low' && !wentUp);
        const updated = { ...t, exitPrice: exit, status: 'Closed' as 'Closed', result: (win ? 'Win' : 'Loss') as 'Win'|'Loss' };
        trades.set(id, updated);
        const w = await ensureUsdWallet(userId);
        const payout = Number(((t.amount * (t.payoutPct ?? engine.payoutPct)) / 100).toFixed(2));
        const settled = win ? payout : -t.amount;
        if (db && 'balanceUsdCents' in w) {
          try {
            await db.update(tblWallets)
              .set({ balanceUsdCents: dsql`${tblWallets.balanceUsdCents} + ${Math.round(settled * 100)}` })
              .where(eq(tblWallets.id, (w as any).id));
            await db.update(tblTrades).set({ exitPrice: Math.round(exit * 100), status: 'Closed', result: updated.result, settledUsdCents: Math.round(settled * 100) }).where(eq(tblTrades.id, id));
          } catch {}
        } else {
          (w as any).balanceUsd = Number(((w as any).balanceUsd + settled).toFixed(2));
          wallets.set(`${userId}:USD`, w as any);
        trades.set(id, { ...updated, settledUsd: settled });
      }
      try { tradeExecutionDuration.observe(Date.now() - new Date(t.createdAt).getTime()); } catch {}
      try { notificationService.send({ userId, type: 'IN_APP', recipient: userId, subject: 'Trade Settled', message: `${t.symbol} ${updated.result} ${settled >= 0 ? '+' : ''}$${settled}` }); } catch {}
      adminAudits.push({ id: Math.random().toString(36).slice(2,9), adminId: 'system', userId, action: 'trade_close', details: JSON.stringify({ tradeId: id, result: updated.result, exitPrice: exit, settledUsd: settled }), timestamp: new Date().toISOString() });
      if (adminTradeClients.size) {
        const payload = { type: 'trade_close', trade: { ...updated, settledUsd: settled } };
        adminTradeClients.forEach((res: any) => { try { res.write(`data: ${JSON.stringify(payload)}\n\n`); } catch {} });
      }
      }, ms);
      res.json(t);
    });
    return;
  });

  const overrideSchema = z.object({
    tradeId: z.string().min(3).max(32),
    result: z.enum(['Win','Loss']).optional(),
    exitPrice: z.number().positive().optional()
  });
  app.post('/api/admin/trades/override', requireAuth, requireRole(['Admin']), async (req: Request, res: Response) => {
    const parsed = overrideSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ message: 'Invalid override request' });
    const { tradeId, result, exitPrice } = parsed.data;
    const t = trades.get(String(tradeId));
    if (!t) return res.status(404).json({ message: 'Not found' });
    const prev = t.settledUsd || 0;
    const exit = typeof exitPrice === 'number' ? Number(exitPrice) : Number((t.entryPrice * (1 + 0.01)).toFixed(2));
    const wentUp = exit >= t.entryPrice;
    const win = typeof result !== 'undefined' ? (result === 'Win') : ((t.direction === 'High' && wentUp) || (t.direction === 'Low' && !wentUp));
    const payout = Number(((t.amount * (t.payoutPct ?? engine.payoutPct)) / 100).toFixed(2));
    const settled = win ? payout : -t.amount;
    const delta = Number((settled - prev).toFixed(2));
    const w = await ensureUsdWallet(t.userId);
    if (db && 'balanceUsdCents' in w) {
      try {
        await db.update(tblWallets)
          .set({ balanceUsdCents: dsql`${tblWallets.balanceUsdCents} + ${Math.round(delta * 100)}` })
          .where(eq(tblWallets.id, (w as any).id));
        await db.update(tblTrades)
          .set({ exitPrice: Math.round(exit * 100), status: 'Closed', result: win ? 'Win' : 'Loss', settledUsdCents: Math.round(settled * 100) })
          .where(eq(tblTrades.id, String(tradeId)));
      } catch {}
    } else {
      (w as any).balanceUsd = Number(((w as any).balanceUsd + delta).toFixed(2));
      wallets.set(`${t.userId}:USD`, w as any);
    }
      const updated = { ...t, exitPrice: exit, status: 'Closed' as 'Closed', result: (win ? 'Win' : 'Loss') as 'Win'|'Loss', settledUsd: settled };
    trades.set(String(tradeId), updated);
    const adminId = String(((req as any).user).sub || '');
    adminAudits.push({ id: Math.random().toString(36).slice(2,9), adminId, userId: t.userId, action: 'trade_override', details: JSON.stringify({ tradeId, result: updated.result, exitPrice: exit, deltaUsd: delta }), timestamp: new Date().toISOString() });
    res.json(updated);
  });

  app.get('/api/admin/audit', requireAuth, requireRole(['Admin']), (_req: Request, res: Response) => {
    res.json(adminAudits.slice(-200));
  });

  const depositSchema = z.object({ amount: z.number().positive(), note: z.string().max(200).optional() });
  app.post('/api/deposits', requireAuth, async (req: Request, res: Response) => {
    const userId = String(((req as any).user).sub || '');
    const parsed = depositSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ message: 'Invalid request' });
    const { amount: amt, note } = parsed.data;
    const w = await ensureUsdWallet(userId);
    if (db && 'balanceUsdCents' in w) {
      try {
        await db.update(tblWallets)
          .set({ balanceUsdCents: dsql`${tblWallets.balanceUsdCents} + ${Math.round(amt * 100)}` })
          .where(eq(tblWallets.id, (w as any).id));
      } catch {}
    } else {
      (w as any).balanceUsd = Number(((w as any).balanceUsd + amt).toFixed(2));
      wallets.set(`${userId}:USD`, w as any);
    }
    adminAudits.push({ id: Math.random().toString(36).slice(2,9), adminId: 'system', userId, action: 'deposit', details: JSON.stringify({ amount: amt, note }), timestamp: new Date().toISOString() });
    const responseWallet = db && 'balanceUsdCents' in w ? { id: (w as any).id, userId: (w as any).userId, assetName: (w as any).assetName, balanceUsd: Number((((w as any).balanceUsdCents)/100).toFixed(2)) } : w;
    res.json({ ok: true, wallet: responseWallet });
  });

  const withdrawalSchema = z.object({ 
    amount: z.number().positive(), 
    note: z.string().max(200).optional(), 
    withdrawalPassword: z.string().min(8).max(256), 
    twoFactorCode: z.string().optional(),
    destination: z.string().optional()
  });

  app.post('/api/withdrawals', requireAuth, requireRateLimit('withdrawal', 5, 3600000), enforceTLS, async (req: Request, res: Response) => {
    const userId = String(((req as any).user).sub || '');
    const parsed = withdrawalSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ message: 'Invalid request' });
    
    const { amount, note, withdrawalPassword, twoFactorCode, destination } = parsed.data;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    if (typeof withdrawalPassword !== 'string' || withdrawalPassword.trim() === '') {
      await storage.addSecurityEvent(userId, { type: 'withdrawal', timestamp: new Date(), ipAddress: ip, status: 'failed', details: 'Missing withdrawal password' });
      return res.status(400).json({ message: 'Withdrawal password required' });
    }
    const isPasswordValid = await storage.verifyWithdrawalPassword(userId, withdrawalPassword);
    if (!isPasswordValid) {
      await storage.addSecurityEvent(userId, { type: 'withdrawal', timestamp: new Date(), ipAddress: ip, status: 'failed', details: 'Invalid withdrawal password' });
      return res.status(401).json({ message: 'Invalid withdrawal password' });
    }

    // Verify 2FA
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if ((user.twoFactorEnabled && user.twoFactorEnabled > 0) || twoFactorCode) {
      if (user.twoFactorEnabled && user.twoFactorEnabled > 0 && !twoFactorCode) {
         return res.status(400).json({ message: '2FA code required' });
      }
      
      if (user.twoFactorSecret && twoFactorCode) {
        const verified = speakeasy.totp.verify({
          secret: user.twoFactorSecret,
          encoding: 'base32',
          token: twoFactorCode
        });
        if (!verified) {
           await storage.addSecurityEvent(userId, { type: 'withdrawal', timestamp: new Date(), ipAddress: ip, status: 'failed', details: 'Invalid 2FA code' });
           return res.status(401).json({ message: 'Invalid 2FA code' });
        }
      } else if (user.twoFactorEnabled && user.twoFactorEnabled > 0 && !user.twoFactorSecret) {
         return res.status(500).json({ message: '2FA configuration error' });
      }
    }

    const amt = Number(amount || 0);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ message: 'Invalid amount' });
    
    // Determine Status & 24h Hold
    let status = 'Pending';
    let detailsStr = note || '';

    // Compliance & Risk Checks
    if (user.kycStatus !== 'Verified') {
       status = 'Compliance Hold';
       detailsStr += ' (KYC Not Verified)';
    }

    const comp = await complianceService.checkTransaction(userId, amt, destination);
    if (!comp.passed) {
       status = 'Rejected';
       detailsStr += comp.reason ? ` (${comp.reason})` : ' (Compliance Rejected)';
       await notificationService.sendSecurityAlert(userId, user.username, comp.reason || 'Compliance rejection');
    } else if (comp.requiresManualReview) {
       status = 'Manual Review';
       detailsStr += ' (Compliance Review)';
    }
    
    if (destination && db) {
       // Check if destination is new
       const prevTx = await db.select().from(tblTransactions).where(
          and(
            eq(tblTransactions.userId, userId),
            eq(tblTransactions.walletAddress, destination)
          )
       ).limit(1);

       if (prevTx.length === 0) {
         status = 'On Hold'; 
         detailsStr += ' (New Address - 24h Hold)';
       }
       
       
       const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
       const recentWithdrawals = await db.select().from(tblTransactions).where(
         and(
            eq(tblTransactions.userId, userId),
            eq(tblTransactions.type, 'withdrawal'),
            gte(tblTransactions.createdAt, oneHourAgo)
         )
       );
       if (recentWithdrawals.length >= 3 && status === 'Pending') {
          status = 'Security Hold';
          detailsStr += ' (High Frequency)';
          await notificationService.sendSecurityAlert(userId, user.username, 'High frequency withdrawals detected');
       }
    }

    const w = await ensureUsdWallet(userId);
    if (status !== 'Rejected') {
      if (db && 'balanceUsdCents' in w) {
        const dec = Math.round(amt * 100);
        try {
          const updated = await db
            .update(tblWallets)
            .set({ balanceUsdCents: dsql`${tblWallets.balanceUsdCents} - ${dec}` })
            .where(and(eq(tblWallets.id, (w as any).id), gte(tblWallets.balanceUsdCents, dec)))
            .returning({ id: tblWallets.id });
          if (!updated[0]) return res.status(400).json({ message: 'Insufficient balance' });
        } catch {
          return res.status(500).json({ message: 'Withdrawal failed' });
        }
      } else {
        if ((w as any).balanceUsd < amt) return res.status(400).json({ message: 'Insufficient balance' });
        (w as any).balanceUsd = Number(((w as any).balanceUsd - amt).toFixed(2));
        wallets.set(`${userId}:USD`, w as any);
      }
    }

    // Record Transaction
    if (db) {
       await db.insert(tblTransactions).values({
         userId,
         type: 'withdrawal',
         asset: 'USD',
         amountUsdCents: Math.round(amt * 100),
         walletAddress: destination,
         status: status,
         createdAt: new Date().toISOString()
       });
    }

    if (status === 'Pending' || status === 'Withdrawal submitted successfully.') {
       await notificationService.sendWithdrawalConfirmation(userId, user.username, amt, 'USD');
    }

    await storage.addSecurityEvent(userId, {
      type: 'withdrawal',
      timestamp: new Date(),
      ipAddress: ip,
      status: 'success',
      details: `Withdrawal of $${amt} - ${status}${detailsStr ? ` - ${detailsStr}` : ''}`
    });
    
    adminAudits.push({
      id: Math.random().toString(36).slice(2,9),
      adminId: 'system',
      userId,
      action: 'withdraw',
      details: JSON.stringify({ amount: amt, note: detailsStr, status, destination }),
      timestamp: new Date().toISOString()
    });
    
    const responseWallet = db && 'balanceUsdCents' in w ? { id: (w as any).id, userId: (w as any).userId, assetName: (w as any).assetName, balanceUsd: Number((((w as any).balanceUsdCents)/100).toFixed(2)) } : w;
    const msg = status === 'On Hold'
      ? 'Withdrawal placed on 24h security hold (new address).'
      : status === 'Manual Review'
        ? 'Withdrawal submitted and is under compliance review.'
        : status === 'Compliance Hold'
          ? 'Withdrawal placed on compliance hold pending KYC.'
          : status === 'Rejected'
            ? 'Withdrawal rejected due to compliance checks.'
            : 'Withdrawal submitted successfully.';
    res.json({ ok: status !== 'Rejected', wallet: responseWallet, status, message: msg });
  });

  const clients = new Set<any>();
  const adminTradeClients = new Set<any>();
  const priceAlerts = new Map<string, { userId: string; target: number; direction: 'above'|'below' }[]>();
  const tracked = new Set<string>();
  const cache = new Map<string, number>();
  const computeBase = (s: string) => Math.abs(s.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 1000 + 100;
  app.get('/api/prices/stream', (req: Request, res: Response) => {
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
      const alerts = priceAlerts.get(s) || [];
      if (alerts.length) {
        const remaining: { userId: string; target: number; direction: 'above'|'below' }[] = [];
        for (const a of alerts) {
          const hit = a.direction === 'above' ? np >= a.target : np <= a.target;
          if (hit) {
            try { notificationService.send({ userId: a.userId, type: 'IN_APP', recipient: a.userId, subject: 'Price Alert', message: `${s} ${a.direction} ${a.target} (${np})` }); } catch {}
          } else {
            remaining.push(a);
          }
        }
        priceAlerts.set(s, remaining);
      }
      clients.forEach((res: any) => {
        try { res.write(`data: ${JSON.stringify({ symbol: s, price: np })}\n\n`); } catch {}
      });
    }
  };
  setInterval(tick, 3000);

  app.get('/api/admin/trades/stream', requireAuth, requireRole(['Admin']), (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    try { (res as any).flushHeaders?.(); } catch {}
    try { res.write(':ok\n\n'); } catch {}
    adminTradeClients.add(res);
    const initial = Array.from(trades.values()).slice(-50).map(t => ({ type: 'snapshot', trade: t }));
    try { res.write(`data: ${JSON.stringify(initial)}\n\n`); } catch {}
    req.on('close', () => {
      adminTradeClients.delete(res);
      try { res.end(); } catch {}
    });
  });

  const adminAllocationSchema = z.object({
    target: z.string().min(3).max(128),
    amount: z.number().positive(),
    note: z.string().min(10).max(500),
    channel: z.enum(['email','sms']).optional(),
    code: z.string().optional(),
  });
  app.post('/api/admin/funds/allocate', requireAuth, requireRole(['Admin']), requireRateLimit('admin-funds-allocate', 10, 3600000), enforceTLS, async (req: Request, res: Response) => {
    const adminUserId = String(((req as any).user).sub || '');
    const parsed = adminAllocationSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ message: 'Invalid allocation request' });
    const { target, amount, note, channel, code } = parsed.data;

    const targetUser = (await storage.getUserByUsername(target)) || (await storage.getUser(target));
    if (!targetUser) return res.status(404).json({ message: 'Target user not found' });

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ message: 'Invalid amount' });

    const HIGH_VALUE_THRESHOLD = 100000; // $100k
    if (amt >= HIGH_VALUE_THRESHOLD) {
      const ch = String(channel || 'email');
      const key = `${adminUserId}:${ch}`;
      const v = verificationCodes.get(key);
      if (!v || v.code !== String(code || '')) {
        await storage.addSecurityEvent(adminUserId, { type: 'verification', timestamp: new Date(), ipAddress: req.ip || 'unknown', status: 'failed', details: 'Invalid verification code for high-value allocation' });
        return res.status(401).json({ message: 'Invalid verification code' });
      }
      if (Date.now() > v.expiresAt) {
        verificationCodes.delete(key);
        await storage.addSecurityEvent(adminUserId, { type: 'verification', timestamp: new Date(), ipAddress: req.ip || 'unknown', status: 'failed', details: 'Verification code expired for high-value allocation' });
        return res.status(401).json({ message: 'Verification code expired' });
      }
    }

    const w = await ensureUsdWallet(targetUser.id);
    const dec = Math.round(amt * 100);
    let appliedCents = dec;
    let status = 'Approved';
    const MAX_SAFE_CENTS = 2_000_000_000; // safeguard for DB integer
    if (db && 'balanceUsdCents' in w) {
      try {
        const current = Number((w as any).balanceUsdCents || 0);
        if (current + dec > MAX_SAFE_CENTS) {
          appliedCents = Math.max(0, MAX_SAFE_CENTS - current);
          status = 'Partial';
        }
        await db.update(tblWallets)
          .set({ balanceUsdCents: dsql`${tblWallets.balanceUsdCents} + ${appliedCents}` })
          .where(eq(tblWallets.id, (w as any).id));
      } catch {
        return res.status(500).json({ message: 'Allocation failed' });
      }
    } else {
      (w as any).balanceUsd = Number(((w as any).balanceUsd + (appliedCents/100)).toFixed(2));
      wallets.set(`${targetUser.id}:USD`, w as any);
    }

    if (db) {
      try {
        await db.insert(tblTransactions).values({
          userId: targetUser.id,
          type: 'admin_allocation',
          asset: 'USD',
          amountUsdCents: appliedCents,
          walletAddress: null as any,
          status,
          createdAt: new Date().toISOString(),
        });
      } catch {}
    }

    adminAudits.push({
      id: Math.random().toString(36).slice(2,9),
      adminId: adminUserId,
      userId: targetUser.id,
      action: 'admin_allocation',
      details: JSON.stringify({ target: target, amount: amt, applied: appliedCents/100, status, note }),
      timestamp: new Date().toISOString()
    });

    try { await notificationService.send({ userId: targetUser.id, type: 'EMAIL', recipient: targetUser.username, subject: 'Admin Allocation', message: `An administrative allocation of $${(appliedCents/100).toFixed(2)} has been made to your USD wallet. Note: ${note}` }); } catch {}
    try { await storage.addSecurityEvent(adminUserId, { type: 'verification', timestamp: new Date(), ipAddress: req.ip || 'unknown', status: 'success', details: `Admin allocation: $${amt} to ${targetUser.username} (${status})` }); } catch {}

    const responseWallet = db && 'balanceUsdCents' in w ? { id: (w as any).id, userId: (w as any).userId, assetName: (w as any).assetName, balanceUsd: Number((((w as any).balanceUsdCents)/100).toFixed(2)) } : w;
    res.json({ ok: true, wallet: responseWallet, status });
  });

  const priceAlertSchema = z.object({ symbol: z.string().min(3).max(64), target: z.number().positive(), direction: z.enum(['above','below']) });
  app.post('/api/alerts/price', requireAuth, (req: Request, res: Response) => {
    const userId = String(((req as any).user).sub || '');
    const parsed = priceAlertSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ message: 'Invalid price alert' });
    const { symbol, target, direction } = parsed.data;
    const list = priceAlerts.get(symbol) || [];
    list.push({ userId, target: Number(target), direction });
    priceAlerts.set(symbol, list);
    res.json({ ok: true });
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
  app.post('/api/support/presence', (req: Request, res: Response) => {
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
