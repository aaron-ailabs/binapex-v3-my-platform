import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { db, Role } from '@/lib/mock-data'

export default function AdminStaff() {
  const [users, setUsers] = useState(db.getUsers())
  const staff = useMemo(() => users.filter(u => u.role !== 'Trader'), [users])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
      <Card>
        <CardHeader><CardTitle>Staff Accounts</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.length===0 ? (
                <TableRow><TableCell colSpan={4}>No staff accounts</TableCell></TableRow>
              ) : staff.map(u => (
                <TableRow key={u.id}>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell className="w-48">
                    <Select value={u.role} onValueChange={(v) => {
                      const next = users.map(x => x.id===u.id ? { ...x, role: v as Role } : x)
                      setUsers(next)
                      db.updateUser({ ...u, role: v as Role })
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Customer Service">Customer Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline">Disable</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
