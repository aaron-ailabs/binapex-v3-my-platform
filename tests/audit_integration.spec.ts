
import assert from 'node:assert'
import { initCsrf, withCsrf, json as httpJson } from './utils/csrf'

const base = process.env.BASE_URL || 'http://127.0.0.1:5000'

async function json(url: string, init?: RequestInit) { return httpJson(url, init) }

async function run() {
  console.log('Starting Audit Integration Tests...')

  const csrf = await initCsrf(base)

  // 1. Setup & Auth
  await json(`${base}/api/demo/seed`, { method: 'POST', headers: withCsrf(csrf, { 'Content-Type': 'application/json' }), body: '{}' })
  
  const loginTrader = await json(`${base}/api/auth/login`, { method: 'POST', headers: withCsrf(csrf, { 'Content-Type': 'application/json' }), body: JSON.stringify({ username: 'trader', password: 'password' }) })
  assert.equal(loginTrader.ok, true, 'Trader login failed')
  const tToken = String(loginTrader.body.token || '')
  const tAuth = { Authorization: `Bearer ${tToken}` }
  
  const loginAdmin = await json(`${base}/api/auth/login`, { method: 'POST', headers: withCsrf(csrf, { 'Content-Type': 'application/json' }), body: JSON.stringify({ username: 'admin', password: 'password' }) })
  assert.equal(loginAdmin.ok, true, 'Admin login failed')
  const aToken = String(loginAdmin.body.token || '')
  const aAuth = { Authorization: `Bearer ${aToken}` }

  // 2. Wallet Check (Initial)
  // Deposit funds first to ensure balance
  const deposit = await json(`${base}/api/deposits`, { method: 'POST', headers: { ...tAuth, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: 1000 }) })
  assert.equal(deposit.ok, true, 'Deposit failed')
  const initialBalance = Number(deposit.body.wallet?.balanceUsd || 0)
  console.log(`Initial Wallet Balance: $${initialBalance}`)

  // 3. Price Fetch & Synthetic Fallback Verification
  console.log('Testing Price Fallback...')
  // We assume no API key is present or we force the fallback path by checking the response
  // If API key IS present, this test might get a real price, so we check for basic validity
  const priceRes = await json(`${base}/api/prices/alpha?symbol=BINANCE:BTCUSDT`, { method: 'GET', headers: { ...tAuth } })
  assert.equal(priceRes.ok, true, 'Price fetch failed')
  assert.ok(typeof priceRes.body.price === 'number', 'Price is not a number')
  // If source is synthetic, verify the calculation
  if (priceRes.body.source === 'synthetic') {
    const s = 'BINANCE:BTCUSDT'
    const expected = Math.abs(s.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 1000 + 100
    assert.equal(priceRes.body.price, expected, 'Synthetic price calculation mismatch')
    console.log('Verified Synthetic Price Logic')
  } else {
    console.log(`Price fetched from ${priceRes.body.source} (External API active)`)
  }

  // 4. Trade Execution Flow
  console.log('Testing Trade Execution...')
  const tradeAmount = 100
  const tradeReq = {
    symbol: 'BINANCE:BTCUSDT',
    asset: 'Bitcoin',
    amount: tradeAmount,
    direction: 'High',
    duration: '1M',
    entryPrice: priceRes.body.price // Use the fetched price
  }
  
  const tradeRes = await json(`${base}/api/trades`, { method: 'POST', headers: { ...tAuth, 'Content-Type': 'application/json' }, body: JSON.stringify(tradeReq) })
  assert.equal(tradeRes.ok, true, 'Trade placement failed')
  const tradeId = tradeRes.body.id
  assert.equal(tradeRes.body.status, 'Open', 'Trade status should be Open')
  
  // Verify immediate persistence
  const tradesList = await json(`${base}/api/trades`, { method: 'GET', headers: { ...tAuth } })
  const foundTrade = tradesList.body.find((t: any) => t.id === tradeId)
  assert.ok(foundTrade, 'Trade not found in list')
  
  // 5. Admin Override (Force Win)
  console.log('Testing Admin Override...')
  const overrideRes = await json(`${base}/api/admin/trades/override`, { 
    method: 'POST', 
    headers: { ...aAuth, 'Content-Type': 'application/json' }, 
    body: JSON.stringify({ tradeId, result: 'Win' }) 
  })
  assert.equal(overrideRes.ok, true, 'Override failed')
  assert.equal(overrideRes.body.status, 'Closed', 'Trade should be closed after override')
  assert.equal(overrideRes.body.result, 'Win', 'Trade result should be Win')
  
  // 6. Wallet Settlement Verification
  // Win = Amount + (Amount * PayoutPct)
  // PayoutPct defaults to 85% usually, or whatever user has
  const payoutPct = overrideRes.body.payoutPct || 85
  const expectedProfit = Number((tradeAmount * payoutPct / 100).toFixed(2))
  const expectedSettled = Number((tradeAmount + expectedProfit).toFixed(2))
  
  // Check wallet using GET /api/wallets
  const walletGet = await json(`${base}/api/wallets`, { method: 'GET', headers: { ...tAuth } })
  assert.equal(walletGet.ok, true, 'Wallet fetch failed')
  const usdWallet = walletGet.body.find((w: any) => w.assetName === 'USD')
  const finalBalance = Number(usdWallet?.balanceUsd || 0)
  
  console.log(`Final Wallet Balance: $${finalBalance}`)
  const balanceDiff = Number((finalBalance - initialBalance).toFixed(2))
  console.log(`Balance Diff: ${balanceDiff}, Expected Settled: ${expectedSettled}`)
  
  // In this logic, if balance wasn't deducted at open:
  // Win: +185. 
  // Loss: -100.
  
  assert.ok(Math.abs(balanceDiff - expectedSettled) < 0.1, `Wallet balance update mismatch. Expected +${expectedSettled}, got ${balanceDiff}`)

  // 7. Balance Check Verification (Negative Test)
  console.log('Testing Balance Check (Insufficient Funds)...')
  // Use admin user who hasn't deposited (expect 0 balance)
  const walletRes = await json(`${base}/api/wallets`, { method: 'GET', headers: { ...aAuth } })
  const adminUsd = walletRes.body.find((w: any) => w.assetName === 'USD')
  const adminBalance = Number(adminUsd?.balanceUsd || 0)
  
  // Attempt trade > balance
  const badTradeRes = await json(`${base}/api/trades`, { 
    method: 'POST', 
    headers: { ...aAuth, 'Content-Type': 'application/json' }, 
    body: JSON.stringify({ ...tradeReq, amount: adminBalance + 100 }) 
  })
  assert.equal(badTradeRes.status, 403, 'Trade with insufficient balance should be forbidden')
  assert.equal(badTradeRes.body.message, 'Insufficient balance', 'Error message mismatch')
  console.log('Verified: Insufficient balance blocks trade')
  
  console.log('Audit Integration Tests Completed Successfully')
}

run().catch(e => {
  console.error('Test Failed:', e)
  process.exit(1)
})
