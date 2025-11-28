import React, { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/hooks/use-toast'
import { apiRequest } from '@/lib/queryClient'
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminAllocations() {
  useAuth()
  const { toast } = useToast()
  const [target, setTarget] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [note, setNote] = useState('')
  const [channel, setChannel] = useState<'email'|'sms'>('email')
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { const t = setTimeout(() => setLoading(false), 200); return () => clearTimeout(t) }, [])

  const requestCode = async () => {
    try {
      await apiRequest('POST', '/api/security/request-verification', { channel })
      toast({ title: 'Verification code sent', description: 'Check your admin channel' })
    } catch (e: any) {
      toast({ title: 'Failed to send code', description: String(e?.message || e), variant: 'destructive' })
    }
  }

  const allocate = async () => {
    setSubmitting(true)
    setResult(null)
    try {
      const res = await apiRequest('POST', '/api/admin/funds/allocate', { target, amount: Number(amount), note, channel, code })
      const json = await res.json()
      setResult(json)
      toast({ title: 'Allocation applied', description: `Status: ${json.status}` })
    } catch (e: any) {
      toast({ title: 'Allocation failed', description: String(e?.message || e), variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const highValue = Number(amount) >= 100000

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin Fund Allocation</h1>
      <Card className="border-red-500/30">
        <CardHeader>
          <CardTitle>Allocate Funds</CardTitle>
          <CardDescription className="flex items-center gap-2">
            <Badge variant="secondary">ADMIN</Badge>
            <span className="text-xs text-muted-foreground">Authorized personnel only</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Target (username or userId)</Label>
              <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="trader" />
            </div>
            <div>
              <Label>Amount (USD)</Label>
              <Input type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </div>
            <div className="md:col-span-2">
              <Label>Reason / Note (10–500 chars)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Compliance-approved adjustment for ..." />
            </div>
          </div>

          <div className="p-3 rounded-lg border bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant={highValue ? 'destructive' : 'outline'}>{highValue ? 'HIGH VALUE' : 'STANDARD'}</Badge>
                <span className="text-xs text-muted-foreground">Multi-factor required for ≥ $100,000</span>
              </div>
              <div className="flex items-center gap-2">
                <select className="border rounded px-2 py-1 bg-background text-sm" value={channel} onChange={(e) => setChannel(e.target.value as any)}>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </select>
                <Button variant="outline" size="sm" onClick={requestCode}>Request Code</Button>
              </div>
            </div>
            <div className="mt-3 grid md:grid-cols-[1fr_auto] gap-2">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter verification code" />
              <Button onClick={allocate} disabled={submitting || !target || Number(amount) <= 0 || note.length < 10}>{submitting ? 'Allocating…' : 'Allocate Funds'}</Button>
            </div>
          </div>

          {result && (
            <div className="mt-4 text-sm">
              <div>Result: <Badge variant="secondary">{String(result.status || 'OK')}</Badge></div>
              {result.wallet && (
                <div className="mt-2">Wallet Balance: ${Number(result.wallet.balanceUsd).toFixed(2)}</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
