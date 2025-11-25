import assert from 'node:assert'

const base = 'http://127.0.0.1:5000'

async function json(url: string, init?: RequestInit) {
  const r = await fetch(url, init)
  const t = await r.text()
  let body: any = t
  try { body = JSON.parse(t) } catch {}
  return { ok: r.ok, status: r.status, body }
}

async function run() {
  const health = await json(`${base}/api/health`)
  assert.equal(health.ok, true)
  assert.equal(health.body.status, 'ok')

  const seeded = await json(`${base}/api/demo/seed`, { method: 'POST' })
  assert.equal(seeded.ok, true)

  const login = await json(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'password' })
  })
  assert.equal(login.ok, true)
  const token = String(login.body.token || '')
  assert.ok(token.length > 0)

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const engine = await json(`${base}/api/engine`, { headers: authHeaders })
  assert.equal(engine.ok, true)
  assert.equal(typeof engine.body.spreadBps, 'number')
  assert.equal(typeof engine.body.payoutPct, 'number')

  const assets = await json(`${base}/api/assets`, { headers: authHeaders })
  assert.equal(assets.ok, true)
  assert.ok(Array.isArray(assets.body))

  const tradeReq = await json(`${base}/api/trades`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ symbol: 'BINANCE:BTCUSDT', asset: 'Bitcoin', amount: 10, direction: 'High', duration: '1M' })
  })
  assert.equal(tradeReq.ok, true)
  const tradeId = String(tradeReq.body.id || '')
  assert.ok(tradeId.length > 0)

  const override = await json(`${base}/api/admin/trades/override`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ tradeId, result: 'Win' })
  })
  assert.equal(override.ok, true)
  assert.equal(override.body.status, 'Closed')
  assert.equal(override.body.result, 'Win')

  const deposit = await json(`${base}/api/deposits`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ amount: 25, note: 'test' })
  })
  assert.equal(deposit.ok, true)
  assert.ok(typeof deposit.body.wallet.balanceUsd === 'number')

  const reqCode = await json(`${base}/api/security/request-verification`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ channel: 'email' })
  })
  assert.equal(reqCode.ok, true)
  const devCode = String(reqCode.body.devCode || '')
  assert.ok(devCode.length > 0)

  const setPwd = await json(`${base}/api/security/withdrawal-password`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ password: 'Abcdef1!', confirmPassword: 'Abcdef1!', code: devCode, channel: 'email' })
  })
  assert.equal(setPwd.ok, true)

  const withdraw = await json(`${base}/api/withdrawals`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ amount: 5, note: 'test', withdrawalPassword: 'Abcdef1!' })
  })
  assert.equal(withdraw.ok, true)
  assert.ok(typeof withdraw.body.wallet.balanceUsd === 'number')

  const events = await json(`${base}/api/security/events`, { headers: authHeaders })
  assert.equal(events.ok, true)
  assert.ok(Array.isArray(events.body))

  const proxyResp = await fetch(`${base}/api/assets/proxy?url=${encodeURIComponent('https://images.unsplash.com/this-does-not-exist')}`)
  const ct = proxyResp.headers.get('content-type') || ''
  assert.ok(ct.includes('image/png'))

  const cfg = await json(`${base}/api/admin/credit-score/config`, {
    method: 'POST', headers: authHeaders, body: JSON.stringify({ decimals: 0, rounding: 'nearest' })
  })
  assert.equal(cfg.ok, true)

  const setScore = await json(`${base}/api/admin/credit-score/set`, {
    method: 'POST', headers: authHeaders, body: JSON.stringify({ userId: '1', score: 735, reason: 'test' })
  })
  assert.equal(setScore.ok, true)
  assert.equal(setScore.body.score, 735)

  const loginTrader = await json(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'trader', password: 'password' })
  })
  assert.equal(loginTrader.ok, true)
  const tToken = String(loginTrader.body.token || '')
  assert.ok(tToken.length > 0)
  const traderHeaders = { Authorization: `Bearer ${tToken}` }

  const scoreResp = await json(`${base}/api/credit-score`, { headers: traderHeaders })
  assert.equal(scoreResp.ok, true)
  assert.equal(Number(scoreResp.body.score), 735)

  process.stdout.write('API tests completed successfully\n')
}

run().catch((e) => { console.error(e); process.exit(1) })
