import assert from 'node:assert'
import { initCsrf, withCsrf } from './utils/csrf'

const base = 'http://127.0.0.1:5000'

async function json(url: string, init?: RequestInit) {
  const r = await fetch(url, init)
  const t = await r.text()
  let body: any = t
  try { body = JSON.parse(t) } catch {}
  return { ok: r.ok, status: r.status, body }
}

async function run() {
  const seeded = await json(`${base}/api/demo/seed`, { method: 'POST' })
  assert.equal(seeded.ok, true)

  const login = await json(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'password' })
  })
  assert.equal(login.ok, true)
  const token = String(login.body.token || '')
  assert.ok(token.length > 0)
  const headers = { Authorization: `Bearer ${token}` }

  const csrf = await initCsrf(base)

  const assets = await json(`${base}/api/assets`, { headers })
  assert.equal(assets.ok, true)
  const symbols = (assets.body as any[]).map((a: any) => a.symbol)
  ;[
    'NASDAQ:NVDA','NASDAQ:TSLA','NASDAQ:AAPL','NASDAQ:META','NASDAQ:AMZN',
    'NASDAQ:PLTR','NASDAQ:MSFT','NASDAQ:NFLX','NYSE:BABA'
  ].forEach(s => assert.ok(symbols.includes(s)))

  const expectedForex = [
    'BLACKBULL:EURUSD','BLACKBULL:GBPUSD','BLACKBULL:USDJPY','BLACKBULL:GBPJPY',
    'BLACKBULL:AUDUSD','BLACKBULL:USDCHF','BLACKBULL:NZDUSD','BLACKBULL:USDSGD',
    'FX_IDC:MYRUSD','FX_IDC:MYRTHB'
  ]
  const missing = expectedForex.filter(s => !symbols.includes(s))
  assert.equal(missing.length, 0)

  const expectedCommodities = [
    'COMEX:GC1!','NYMEX:CL1!','COMEX:SI1!','ICEUS:KC1!','NYMEX:NG1!','NYMEX:HO1!'
  ]
  const missingC = expectedCommodities.filter(s => !symbols.includes(s))
  assert.equal(missingC.length, 0)

  const esSymbol = 'BLACKBULL:EURUSD'
  const stream = await fetch(`${base}/api/prices/stream?symbols=${encodeURIComponent(esSymbol)}`)
  assert.equal(stream.ok, true)

  const alertRes = await json(`${base}/api/alerts/price`, {
    method: 'POST',
    headers: withCsrf(csrf, { 'Content-Type': 'application/json', ...headers }),
    body: JSON.stringify({ symbol: 'COMEX:GC1!', target: 120, direction: 'above' })
  })
  assert.equal(alertRes.ok, true)
}

run().catch((e) => { console.error(e); process.exit(1) })
