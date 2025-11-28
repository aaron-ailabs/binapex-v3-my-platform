async function main() {
  const base = process.env.BASE_URL || 'http://127.0.0.1:5000'
  const r = await fetch(base + '/api/csrf', { headers: { Accept: 'application/json' } })
  const sc = r.headers.get('set-cookie') || ''
  const m = /XSRF-TOKEN=([^;]+)/i.exec(sc)
  const token = m ? m[1] : ''
  const cookie = m ? `XSRF-TOKEN=${m[1]}` : ''
  const headers = { 'X-CSRF-Token': token, 'Cookie': cookie, 'Content-Type': 'application/json' }
  const seeded = await fetch(base + '/api/demo/seed', { method: 'POST', headers, body: '{}' })
  console.log('seed', seeded.status)
  const login = await fetch(base + '/api/auth/login', { method: 'POST', headers, body: JSON.stringify({ username: 'admin', password: 'password' }) })
  console.log('login', login.status)
  const lb = await login.json()
  const auth = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${lb.token}` }
  const start = await fetch(base + '/api/audit/run', { method: 'POST', headers: auth, body: JSON.stringify({ env: 'staging' }) })
  console.log('audit start', start.status)
  let id = ''
  try { const sj = await start.json(); id = sj.id || '' } catch {}
  if (!id) { console.log('audit not started'); return }
  let status = ''
  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 1000))
    const st = await fetch(base + `/api/audit/status/${id}`, { headers: { Authorization: `Bearer ${lb.token}` } })
    console.log('status poll', st.status)
    if (!st.ok) break
    const bj = await st.json()
    status = bj.status || ''
    if (status === 'passed' || status === 'failed') break
  }
  const pdf = await fetch(base + `/api/audit/report/${id}.pdf`, { headers: { Authorization: `Bearer ${lb.token}` } })
  const buf = await pdf.arrayBuffer()
  console.log('pdf', pdf.status, buf.byteLength)
  console.log('RUN_AUDIT_DONE')
}

main().catch(e => { console.error('RUN_AUDIT_ERR', e); process.exit(1) })
