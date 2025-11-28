import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { db } from '@/lib/mock-data'
import { fmtUSD, toUSD } from '@/lib/utils'
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminFinance() {
  const [liquidity, setLiquidity] = useState<number>(0)
  const [deposits, setDeposits] = useState<any[]>([])
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [pnl, setPnl] = useState<any[]>([])

  useEffect(() => {
    const wallets = db.getWallets()
    setLiquidity(wallets.filter(w => w.asset_name === 'USD').reduce((s,w)=>s + toUSD('USD', w.balance),0))
    const txs = db.getTransactions()
    const ds = txs.filter(t => t.type === 'Deposit')
    const ws = txs.filter(t => t.type === 'Withdrawal')
    setDeposits(ds.slice(0,10))
    setWithdrawals(ws.slice(0,10))
    const days: Record<string, number> = {}
    ds.forEach(t => { const d = (t.created_at||'').slice(0,10); days[d] = (days[d]||0) + toUSD(t.asset, t.amount) })
    ws.forEach(t => { const d = (t.created_at||'').slice(0,10); days[d] = (days[d]||0) - toUSD(t.asset, t.amount) })
    const arr = Object.entries(days).sort((a,b)=>a[0].localeCompare(b[0])).map(([date,val])=>({ date, value: Number(val.toFixed(2)) }))
    setPnl(arr)
  }, [])

  const [loading, setLoading] = useState(true)
  useEffect(() => { const t = setTimeout(() => setLoading(false), 200); return () => clearTimeout(t) }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-60" />
        <div className="grid md:grid-cols-3 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Financial Monitoring</h1>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>Total Liquidity</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-mono">{fmtUSD(liquidity)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Daily Flow</CardTitle></CardHeader>
          <CardContent>
            <LineChart width={320} height={140} data={pnl}>
              <CartesianGrid stroke="#333" strokeDasharray="3 3" />
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Revenue (Mock)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-mono text-primary">{fmtUSD(Math.max(0, pnl.reduce((s,p)=>s + (p.value>0?p.value*0.01:0),0)))}</div></CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Recent Deposits</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deposits.map(t => (
                  <TableRow key={t.id}><TableCell className="font-mono text-xs">{t.id}</TableCell><TableCell>{fmtUSD(toUSD(t.asset, t.amount))}</TableCell><TableCell><Badge variant={t.status==='Approved'?'default':t.status==='Pending'?'secondary':'destructive'}>{t.status}</Badge></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent Withdrawals</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map(t => (
                  <TableRow key={t.id}><TableCell className="font-mono text-xs">{t.id}</TableCell><TableCell>{fmtUSD(toUSD(t.asset, t.amount))}</TableCell><TableCell><Badge variant={t.status==='Approved'?'default':t.status==='Pending'?'secondary':'destructive'}>{t.status}</Badge></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
