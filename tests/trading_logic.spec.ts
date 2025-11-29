import assert from 'node:assert'
import { initCsrf, withCsrf, json as httpJson } from './utils/csrf'

const base = process.env.BASE_URL || 'http://127.0.0.1:5000'

async function json(url: string, init?: RequestInit) { return httpJson(url, init) }

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function run() {
  const csrf = await initCsrf(base)

  const seeded = await json(`${base}/api/demo/seed`, { method: 'POST' })
  assert.equal(seeded.ok, true)

  const admin = await json(`${base}/api/auth/login`, { method: 'POST', headers: withCsrf(csrf, { 'Content-Type': 'application/json' }), body: JSON.stringify({ username: 'admin', password: 'password' }) })
  assert.equal(admin.ok, true)
  const adminToken = String(admin.body.token || '')

  const trader = await json(`${base}/api/auth/login`, { method: 'POST', headers: withCsrf(csrf, { 'Content-Type': 'application/json' }), body: JSON.stringify({ username: 'trader', password: 'password' }) })
  assert.equal(trader.ok, true)
  const traderToken = String(trader.body.token || '')
  const traderAuth = { Authorization: `Bearer ${traderToken}` }

  const walletsBefore = await json(`${base}/api/wallets`, { headers: traderAuth })
  assert.equal(walletsBefore.ok, true)
  const usd = (walletsBefore.body || []).find((w: any) => w.assetName === 'USD')
  assert.ok(usd)
  const bal = Number(usd.balanceUsd || (usd.balanceUsdCents ? usd.balanceUsdCents / 100 : 0))

  const stakeA = Math.max(1, Math.min(Math.floor(bal) - 50, 950))
  const openA = await json(`${base}/api/trades`, { method: 'POST', headers: { ...traderAuth, 'Content-Type': 'application/json' }, body: JSON.stringify({ symbol: 'BTC/USD', asset: 'Crypto', amount: stakeA, direction: 'High', duration: '1M' }) })
  assert.equal(openA.ok, true)
  const walletsAfterA = await json(`${base}/api/wallets`, { headers: traderAuth })
  assert.equal(walletsAfterA.ok, true)
  const usdA = (walletsAfterA.body || []).find((w: any) => w.assetName === 'USD')
  const balA = Number(usdA.balanceUsd || (usdA.balanceUsdCents ? usdA.balanceUsdCents / 100 : 0))
  assert.ok(Math.abs(balA - (bal - stakeA)) <= 0.01)

  const deposit = await json(`${base}/api/deposits`, { method: 'POST', headers: { ...traderAuth, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: 900 }) })
  assert.equal(deposit.ok, true)
  const openInitial = await json(`${base}/api/trades`, { method: 'POST', headers: { ...traderAuth, 'Content-Type': 'application/json' }, body: JSON.stringify({ symbol: 'BTC/USD', asset: 'Crypto', amount: 200, direction: 'High', duration: '1M' }) })
  assert.equal(openInitial.ok, true)
  const tradeId = String(openInitial.body.id || '')
  await delay(400)
  const overrideWin = await json(`${base}/api/admin/trades/override`, { method: 'POST', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ tradeId, result: 'Win' }) })
  assert.equal(overrideWin.ok, true)

  const tooBig = await json(`${base}/api/trades`, { method: 'POST', headers: { ...traderAuth, 'Content-Type': 'application/json' }, body: JSON.stringify({ symbol: 'BTC/USD', asset: 'Crypto', amount: 2000, direction: 'High', duration: '1M' }) })
  assert.equal(tooBig.ok, false)

  const openA2 = await json(`${base}/api/trades`, { method: 'POST', headers: { ...traderAuth, 'Content-Type': 'application/json' }, body: JSON.stringify({ symbol: 'BTC/USD', asset: 'Crypto', amount: 950, direction: 'High', duration: '1M' }) })
  assert.equal(openA2.ok, true)

  const tooBig2 = await json(`${base}/api/trades`, { method: 'POST', headers: { ...traderAuth, 'Content-Type': 'application/json' }, body: JSON.stringify({ symbol: 'BTC/USD', asset: 'Crypto', amount: 2000, direction: 'High', duration: '1M' }) })
  assert.equal(tooBig2.ok, false)

  process.stdout.write(JSON.stringify({ ok: true }, null, 2) + '\n')
}

run().catch(async e => { process.stderr.write(String(e) + '\n'); process.exit(1) })
