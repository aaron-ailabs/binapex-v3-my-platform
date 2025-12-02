import { randomBytes } from 'crypto'

if (!process.env.JWT_SECRET) process.env.JWT_SECRET = randomBytes(48).toString('hex')
if (!process.env.ENCRYPTION_KEY) process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex')
if (!process.env.ENCRYPTION_SALT) process.env.ENCRYPTION_SALT = randomBytes(16).toString('hex')

let appPromise: Promise<any> | null = null
function getApp() {
  if (!appPromise) {
    appPromise = import('../server/index.js')
      .then((m) => (m as any).default || (m as any))
      .catch(async () => {
        const m = await import('../server/index')
        return (m as any).default || (m as any)
      })
  }
  return appPromise
}

export default async function handler(req: any, res: any) {
  const url = String(req?.url || '')
  if (url.includes('/health')) {
    res.status(200).json({ status: 'ok' })
    return
  }
  try {
    const app = await getApp()
    ;(app as any)(req, res)
  } catch (err) {
    try { console.error('api/index error', err); } catch {}
    res.status(500).json({ message: 'Internal server error' })
  }
}
