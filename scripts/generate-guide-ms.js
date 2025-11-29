import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'

const outDir = path.resolve(process.cwd(), 'docs')
fs.mkdirSync(outDir, { recursive: true })
const outPath = path.join(outDir, 'binapex-user-guide-ms.pdf')

const doc = new PDFDocument({ size: 'A4', margin: 50 })
const stream = fs.createWriteStream(outPath)
doc.pipe(stream)

const writeTitle = (text) => {
  doc.fontSize(20).text(text, { align: 'left' })
  doc.moveDown(0.5)
}

const writeSubtitle = (text) => {
  doc.fontSize(14).text(text, { align: 'left' })
  doc.moveDown(0.25)
}

const writeBullets = (items) => {
  doc.fontSize(11)
  for (const item of items) {
    doc.text(`• ${item}`, { align: 'left' })
  }
  doc.moveDown(0.75)
}

writeTitle('Panduan Pengguna Binapex (Bahasa Malaysia)')
writeSubtitle('Gambaran Umum')
writeBullets([
  'Platform berbilang peranan: Trader, Customer Support (CS), dan Admin',
  'Laman utama: https://www.binapex.my',
  'Navigasi peranan tersedia melalui sidebar dan routing aplikasi',
])

writeSubtitle('Akses & Peranan')
writeBullets([
  'Trader: dagangan, deposit/pengeluaran, sejarah, keselamatan akaun, sokongan chat',
  'CS: pantau tiket/sesi, carian pengguna baca‑sahaja (read‑only)',
  'Admin: pemantauan global, KYC, transaksi/pengeluaran, audit, tetapan sistem',
])

writeSubtitle('Portal Trader')
writeBullets([
  'Dashboard: https://www.binapex.my/dashboard – ringkasan baki, dompet, dagangan',
  'Live Trading: https://www.binapex.my/trade – dagang Crypto/Forex/Komoditi',
  'Deposit: https://www.binapex.my/deposits – tambah dana dan pantau status',
  'Pengeluaran: https://www.binapex.my/withdrawals – mohon pengeluaran dan jejak kemajuan',
  'Sejarah Dagangan: https://www.binapex.my/history – senarai lengkap dengan penapisan',
  'Keselamatan: https://www.binapex.my/security – tukar kata laluan, set kata laluan pengeluaran, urus 2FA',
  'Sokongan Chat: https://www.binapex.my/support – chat masa nyata dengan lampiran fail',
])

writeSubtitle('Cara Guna (Trader)')
writeBullets([
  'Log masuk di halaman Auth dan sahkan token',
  'Tambah dana di Deposits dan mulakan dagangan di Trade',
  'Mohon pengeluaran di Withdrawals dan pantau status',
  'Di Security: mohon kod verifikasi, set kata laluan pengeluaran, aktifkan 2FA',
  'Untuk bantuan segera: buka Support dan mulakan chat',
])

writeSubtitle('Portal Customer Support (CS)')
writeBullets([
  'Ticket Queue: https://www.binapex.my/cs – pantau sesi sokongan masuk',
  'User Lookup: https://www.binapex.my/cs/lookup – cari emel, paparan dompet/dagangan/transaksi baca‑sahaja',
  'Aliran kerja: ambil perbualan, sahkan identiti, beri panduan; eskalasi kepada Admin jika perlu',
])

writeSubtitle('Portal Admin')
writeBullets([
  'Admin Dashboard: https://www.binapex.my/admin – analitik global dan kesihatan sistem',
  'Pengurusan Pengguna: https://www.binapex.my/admin/users – cari, cipta, edit, nyahaktif; ubah peranan/keahlian',
  'KYC Queue: https://www.binapex.my/admin/kyc – lulus/tolak serahan KYC',
  'Transaksi & Pengeluaran: https://www.binapex.my/admin/transactions – lulus/tolak, kredit/debit manual',
  'Banks: https://www.binapex.my/admin/banks – urus akaun bank dan rails pembayaran',
  'Trading Monitor: https://www.binapex.my/admin/trading – aliran dagangan masa nyata',
  'Audit Log: https://www.binapex.my/admin/audit – jejak tindakan pentadbiran',
  'Settings: https://www.binapex.my/admin/settings – konfigurasi platform & keselamatan',
  'Kawalan payout dipusatkan di Users/Transactions untuk konsistensi dan penyelenggaraan'
])

writeSubtitle('Keselamatan Akaun')
writeBullets([
  'Login: kirim username/password, terima token JWT',
  'Verify: semak token aktif dengan endpoint /api/auth/verify',
  'Lupa Kata Laluan: hantar emel untuk reset tanpa pendedahan',
  'Reset Kata Laluan: sahkan token, semak kekuatan kata laluan, terima notifikasi',
  'CSRF: di produksi perlu X‑CSRF‑TOKEN daripada /api/csrf',
])

writeSubtitle('Notifikasi')
writeBullets([
  'Senarai: GET /api/notifications – paparan notifikasi mengikut masa',
  'Tanda dibaca: PATCH /api/notifications/:id/read – kemaskini status',
  'Aliran SSE: GET /api/notifications/stream?token=… – kemaskini masa nyata',
])

writeSubtitle('Akaun Demo (Pilihan)')
writeBullets([
  'Admin: admin / password',
  'Trader: trader / password',
  'Customer Service: support / password',
  'Jika tidak aktif di produksi: set ENABLE_DEMO_SEED=1 dan POST /api/demo/seed',
])

writeSubtitle('URL Produksi')
writeBullets([
  'Trader: /dashboard, /trade, /deposits, /withdrawals, /history, /security, /support',
  'CS: /cs, /cs/lookup',
  'Admin: /admin, /admin/users, /admin/kyc, /admin/transactions, /admin/banks, /admin/trading, /admin/audit, /admin/settings',
])

writeSubtitle('Sokongan & Eskalasi')
writeBullets([
  'Trader: guna chat untuk bantuan segera dan lampiran bukti',
  'CS: semak rekod pengguna baca‑sahaja, sahkan identiti, beri langkah',
  'Admin: selesaikan isu KYC/pengeluaran/keselamatan dan audit tindakan',
])

doc.end()

stream.on('finish', () => {
  process.stdout.write(outPath)
})
