import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { db } from '@/lib/mock-data'
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts'

export default function AdminAnalytics() {
  const users = db.getUsers()
  const trades = db.getTrades()
  const growth = useMemo(() => users.map((u,i)=>({ idx: i+1, count: i+1 })), [users])
  const volume = useMemo(() => trades.map((t,i)=>({ idx: i+1, amount: t.amount })), [trades])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Analytics & Reports</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>User Growth</CardTitle></CardHeader>
          <CardContent>
            <LineChart width={360} height={160} data={growth}>
              <CartesianGrid stroke="#333" strokeDasharray="3 3" />
              <XAxis dataKey="idx" hide />
              <YAxis hide />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#60a5fa" strokeWidth={2} dot={false} />
            </LineChart>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Trading Volume</CardTitle></CardHeader>
          <CardContent>
            <BarChart width={360} height={160} data={volume}>
              <CartesianGrid stroke="#333" strokeDasharray="3 3" />
              <XAxis dataKey="idx" hide />
              <YAxis hide />
              <Tooltip />
              <Bar dataKey="amount" fill="#22c55e" />
            </BarChart>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button onClick={() => {
          const rows = trades.map(t => `${t.id},${t.user_id},${t.asset},${t.amount},${t.status}`)
          const csv = ['id,user_id,asset,amount,status', ...rows].join('\n')
          const blob = new Blob([csv], { type: 'text/csv' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'trades.csv'
          a.click()
          URL.revokeObjectURL(url)
        }}>Export Trades CSV</Button>
      </div>
    </div>
  )
}
