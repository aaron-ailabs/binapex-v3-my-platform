import assert from 'node:assert'

const base = process.env.BASE_URL || 'http://127.0.0.1:5000'

async function json(url: string, init?: RequestInit) {
  const r = await fetch(url, { ...(init || {}), headers: { ...(init?.headers || {}), Accept: 'application/json' } })
  const t = await r.text()
  let body: any = t
  try { body = JSON.parse(t) } catch {}
  return { ok: r.ok, status: r.status, body }
}

async function run() {
  const key = process.env.BOOTSTRAP_KEY || 'local-bootstrap-key'
  const adminPayload = { username: 'admin@test.local', password: 'Str0ngP@ss!Admin' }

  await json(`${base}/api/admin/bootstrap`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Bootstrap-Key': key }, body: JSON.stringify(adminPayload) })

  const reg = await json(`${base}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'cs@test.local', password: 'Password123!' }) })
  assert.equal(reg.ok, true, `register failed: ${reg.status}`)
  const userId = String(reg.body.userId || '')
  assert.ok(userId.length > 0)

  const login = await json(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: adminPayload.username, password: adminPayload.password }) })
  assert.equal(login.ok, true, `admin login failed: ${login.status}`)
  const token = String(login.body.token || '')
  assert.ok(token.length > 0)

  const role = await json(`${base}/api/admin/users/role`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ userId, role: 'Customer Service' }) })
  assert.equal(role.ok, true, `role update failed: ${role.status}`)
  assert.equal(role.body.role, 'Customer Service')

  const list = await json(`${base}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
  assert.equal(list.ok, true)
  const found = (list.body as any[]).find(u => String(u.id) === userId)
  assert.ok(found)
  assert.equal(found.role, 'Customer Service')
  process.stdout.write('Role update test passed\n')
}

run().catch(e => { console.error('Test Failed:', e); process.exit(1) })

