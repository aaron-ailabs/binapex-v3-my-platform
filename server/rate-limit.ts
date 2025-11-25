import type { Request, Response, NextFunction } from 'express'
import Redis from 'ioredis'
import { rateLimitHits } from './metrics'

const url = process.env.REDIS_URL || ''
const redis = url ? new Redis(url) : null

const memory = new Map<string, { count: number; reset: number }>()

export function requireRateLimit(key: string, max: number, windowMs: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const env = (process.env.NODE_ENV || '').toLowerCase()
    if (env === 'development') return next()
    const now = Date.now()
    const ip = req.ip || req.socket.remoteAddress || 'unknown'
    const rateKey = `${key}:${ip}`
    if (redis) {
      try {
        const ttl = await redis.pttl(rateKey)
        const c = await redis.incr(rateKey)
        if (ttl < 0) await redis.pexpire(rateKey, windowMs)
        if (c > max) {
          const retry = Math.ceil((await redis.pttl(rateKey)) / 1000)
          rateLimitHits.labels(key).inc()
          return res.status(429).json({ message: 'Too many attempts. Please try again later.', retryAfter: retry })
        }
        return next()
      } catch {
        // fall through to memory
      }
    }
    const rec = memory.get(rateKey)
    if (!rec || now > rec.reset) memory.set(rateKey, { count: 0, reset: now + windowMs })
    const r = memory.get(rateKey)!
    r.count++
    if (r.count > max) {
      rateLimitHits.labels(key).inc()
      return res.status(429).json({ message: 'Too many attempts. Please try again later.', retryAfter: Math.ceil((r.reset - now)/1000) })
    }
    next()
  }
}
