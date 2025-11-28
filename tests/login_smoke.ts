import assert from 'node:assert'
import { initCsrf, withCsrf, json as httpJson } from './utils/csrf'

const base = process.env.BASE_URL || 'http://127.0.0.1:5000'
const minimal = String(process.env.SMOKE_MINIMAL || '') === '1'

async function json(url: string, init?: RequestInit) { return httpJson(url, init) }

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function run() {
  const issues: { title: string; env: string; steps: string[]; expected: string; actual: string }[] = []

  const env = base.startsWith('http') ? base : 'unknown'
  await json(`${base}/api/demo/seed`, { method: 'POST' })
  await delay(200)
  const csrf = await initCsrf(base)

  const validAdmin = await json(`${base}/api/auth/login`, { method: 'POST', headers: withCsrf(csrf, { 'Content-Type': 'application/json' }), body: JSON.stringify({ username: 'admin', password: 'password' }) })
  if (!validAdmin.ok) issues.push({ title: 'Admin login failed', env, steps: ['GET /api/csrf', 'POST /api/auth/login {admin/password}'], expected: '200 with token', actual: `${validAdmin.status}:${JSON.stringify(validAdmin.body)}` })
  assert.equal(validAdmin.ok, true)
  const adminToken = String(validAdmin.body.token || '')

  const invalidPwd = await json(`${base}/api/auth/login`, { method: 'POST', headers: withCsrf(csrf, { 'Content-Type': 'application/json' }), body: JSON.stringify({ username: 'admin', password: 'wrong' }) })
  assert.equal(invalidPwd.ok, false)

  const invalidFormat = await json(`${base}/api/auth/login`, { method: 'POST', headers: withCsrf(csrf, { 'Content-Type': 'application/json' }), body: JSON.stringify({ username: 'a', password: 'short' }) })
  assert.equal(invalidFormat.ok, false)

  const missingBody = await json(`${base}/api/auth/login`, { method: 'POST', headers: withCsrf(csrf, { 'Content-Type': 'application/json' }), body: JSON.stringify({}) })
  assert.equal(missingBody.ok, false)

  const traderLogin = await json(`${base}/api/auth/login`, { method: 'POST', headers: withCsrf(csrf, { 'Content-Type': 'application/json' }), body: JSON.stringify({ username: 'trader', password: 'password' }) })
  if (!traderLogin.ok) issues.push({ title: 'Trader login failed', env, steps: ['GET /api/csrf', 'POST /api/auth/login {trader/password}'], expected: '200 with token', actual: `${traderLogin.status}:${JSON.stringify(traderLogin.body)}` })
  assert.equal(traderLogin.ok, true)
  const traderToken = String(traderLogin.body.token || '')
  const traderAuth = { Authorization: `Bearer ${traderToken}` }

  if (minimal) {
    process.stdout.write(JSON.stringify({ ok: true, env, issues }, null, 2) + '\n')
    return
  }

  const profileAdmin = await json(`${base}/api/profile`, { headers: { Authorization: `Bearer ${adminToken}` } })
  assert.equal(profileAdmin.ok, true)

  const profileTrader = await json(`${base}/api/profile`, { headers: traderAuth })
  assert.equal(profileTrader.ok, true)
  const traderId = String(profileTrader.body.id || '')

  const deposit = await json(`${base}/api/deposits`, { method: 'POST', headers: { ...traderAuth, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: 900 }) })
  assert.equal(deposit.ok, true)

  const wallets1 = await json(`${base}/api/wallets`, { headers: traderAuth })
  assert.equal(wallets1.ok, true)

  const tradeOpen = await json(`${base}/api/trades`, { method: 'POST', headers: { ...traderAuth, 'Content-Type': 'application/json' }, body: JSON.stringify({ symbol: 'BTC/USD', asset: 'Crypto', amount: 900, direction: 'High', duration: '1M' }) })
  if (!tradeOpen.ok) issues.push({ title: 'Trade open failed', env, steps: ['POST /api/trades'], expected: '200 open trade', actual: `${tradeOpen.status}:${JSON.stringify(tradeOpen.body)}` })
  assert.equal(tradeOpen.ok, true)
  const tradeId = String(tradeOpen.body.id || '')

  await delay(300)

  const override = await json(`${base}/api/admin/trades/override`, { method: 'POST', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ tradeId, result: 'Win' }) })
  if (!override.ok) issues.push({ title: 'Admin override failed', env, steps: ['POST /api/admin/trades/override'], expected: '200 with updated trade', actual: `${override.status}:${JSON.stringify(override.body)}` })
  assert.equal(override.ok, true)

  const payoutUpdate = await json(`${base}/api/admin/users/payout`, { method: 'POST', headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: traderId, payoutPct: 90, reason: 'test' }) })
  assert.equal(payoutUpdate.ok, true)

  const supportStatus = await json(`${base}/api/support/status`)
  assert.equal(supportStatus.ok, true)
  const supportSession = await json(`${base}/api/support/session`, { method: 'POST' })
  assert.equal(supportSession.ok, true)
  const sessionId = String(supportSession.body.sessionId || '')
  const supportMessage = await json(`${base}/api/support/message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, text: 'help' }) })
  assert.equal(supportMessage.ok, true)

  process.stdout.write(JSON.stringify({ ok: true, env, issues }, null, 2) + '\n')
}

run().catch(async e => { process.stderr.write(String(e) + '\n'); process.exit(1) })
