import assert from 'node:assert'

const base = 'http://127.0.0.1:5000'

async function json(url: string, init?: RequestInit) {
  const r = await fetch(url, { ...(init || {}), headers: { ...(init?.headers || {}), Accept: 'application/json' } })
  const t = await r.text()
  let body: any = t
  try { body = JSON.parse(t) } catch {}
  return { ok: r.ok, status: r.status, body }
}

async function run() {
  await json(`${base}/api/demo/seed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  const loginAdmin = await json(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'password' }) })
  assert.equal(loginAdmin.ok, true)
  const aToken = String(loginAdmin.body.token || '')
  assert.ok(aToken.length > 0)
  const authHeaders = { Authorization: `Bearer ${aToken}` }

  const loginTrader = await json(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'trader', password: 'password' }) })
  assert.equal(loginTrader.ok, true)
  const tToken = String(loginTrader.body.token || '')
  const tUserId = String(loginTrader.body.userId || '')
  assert.ok(tToken.length > 0)
  assert.ok(tUserId.length > 0)

  const setPayout = await json(`${base}/api/admin/users/payout`, { method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: tUserId, payoutPct: 72, reason: 'test' }) })
  assert.equal(setPayout.ok, true)
  assert.equal(setPayout.body.payoutPct, 72)

  const place = await json(`${base}/api/trades`, { method: 'POST', headers: { Authorization: `Bearer ${tToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ symbol: 'BINANCE:BTCUSDT', asset: 'Crypto', amount: 100, direction: 'High', duration: '1M', entryPrice: 50000 }) })
  assert.equal(place.ok, true)
  const tradeId = String(place.body.id || '')
  assert.ok(tradeId.length > 0)
  assert.equal(place.body.payoutPct, 72)

  const override = await json(`${base}/api/admin/trades/override`, { method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ tradeId: tradeId, result: 'Win' }) })
  assert.equal(override.ok, true)
  assert.equal(override.body.payoutPct, 72)
  assert.equal(Number(override.body.settledUsd || 0), 172)

  const bulk = await json(`${base}/api/admin/users/payout/bulk`, { method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [{ userId: tUserId, payoutPct: 55, reason: 'bulk test' }] }) })
  assert.equal(bulk.ok, true)

  const place2 = await json(`${base}/api/trades`, { method: 'POST', headers: { Authorization: `Bearer ${tToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ symbol: 'BINANCE:BTCUSDT', asset: 'Crypto', amount: 100, direction: 'High', duration: '1M', entryPrice: 50000 }) })
  assert.equal(place2.ok, true)
  const tradeId2 = String(place2.body.id || '')
  assert.ok(tradeId2.length > 0)
  assert.equal(place2.body.payoutPct, 55)

  const override2 = await json(`${base}/api/admin/trades/override`, { method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ tradeId: tradeId2, result: 'Win' }) })
  assert.equal(override2.ok, true)
  assert.equal(override2.body.payoutPct, 55)
  assert.equal(Number(override2.body.settledUsd || 0), 155)

  process.stdout.write('Payout tests completed successfully\n')
}

run()
