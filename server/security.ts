import type { Request, Response, NextFunction } from 'express'

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  const env = (process.env.NODE_ENV || '').toLowerCase()
  if (env === 'development') {
    res.setHeader('Content-Security-Policy', "default-src 'self' blob: data: https: http:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https: http:; style-src 'self' 'unsafe-inline' https: http: data:; img-src 'self' data: https: http:; connect-src 'self' http: https: ws: wss:; font-src 'self' https://fonts.gstatic.com data:; worker-src 'self' blob:; frame-src https: http:")
  } else {
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; connect-src 'self' https: wss:; font-src 'self' https://fonts.gstatic.com; worker-src 'self'; frame-src https:")
  }
  next()
}
