import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth'
import { Skeleton } from '@/components/ui/skeleton'

type SecEvent = { id: string; type: string; timestamp: string; ipAddress: string; status: string; details?: string }

export default function AdminSecurity() {
  const { token } = useAuth()
  const apiBase = (import.meta.env.VITE_API_BASE as string) || '/api'
  const [events, setEvents] = useState<SecEvent[]>([])
  const [twofa] = useState<'enforced'|'optional'|'off'>('optional')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch(`${apiBase}/security/events`, { headers: { Authorization: token ? `Bearer ${token}` : '' } })
        if (r.ok) {
          const list = await r.json()
          setEvents(Array.isArray(list) ? list.map((e:any)=>({ id: e.id, type: e.type, timestamp: new Date(e.timestamp).toISOString(), ipAddress: e.ipAddress, status: e.status, details: e.details })) : [])
        }
      } catch {}
    })()
    const t = setTimeout(() => setLoading(false), 200)
    return () => clearTimeout(t)
  }, [apiBase, token])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid md:grid-cols-3 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Security Center</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>2FA Enforcement</CardTitle></CardHeader>
          <CardContent><Badge variant="secondary">{twofa}</Badge></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Failed Logins (Recent)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{events.filter(e=>e.status==='failed').length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>API Keys</CardTitle></CardHeader>
          <CardContent><div className="text-sm text-muted-foreground">Managed via backend</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Security Events</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length===0 ? (
                <TableRow><TableCell colSpan={4}>None</TableCell></TableRow>
              ) : events.slice(0,20).map(e => (
                <TableRow key={e.id}><TableCell>{e.type}</TableCell><TableCell><Badge variant={e.status==='failed'?'destructive':e.status==='pending'?'secondary':'default'}>{e.status}</Badge></TableCell><TableCell className="font-mono text-xs">{e.ipAddress}</TableCell><TableCell>{new Date(e.timestamp).toLocaleString()}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
