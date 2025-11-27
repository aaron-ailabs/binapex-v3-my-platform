import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth'

export default function AdminCompliance() {
  const { token } = useAuth()
  const apiBase = (import.meta.env.VITE_API_BASE as string) || '/api'
  const [audits, setAudits] = useState<{ id: string; status: string; startedAt: string }[]>([])

  useEffect(() => {
    ;(async () => {
      try {
        await fetch(`${apiBase}/audit/run`, { method: 'POST', headers: { Authorization: token ? `Bearer ${token}` : '' } }).catch(()=>{})
      } catch {}
    })()
  }, [apiBase, token])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Compliance & Auditing</h1>
      <Card>
        <CardHeader><CardTitle>Audit Runs</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audits.length===0 ? (
                <TableRow><TableCell colSpan={3}>Run queued</TableCell></TableRow>
              ) : audits.map(a => (
                <TableRow key={a.id}><TableCell className="font-mono text-xs">{a.id}</TableCell><TableCell><Badge>{a.status}</Badge></TableCell><TableCell>{new Date(a.startedAt).toLocaleString()}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
