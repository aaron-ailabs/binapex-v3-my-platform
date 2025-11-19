import { db, SupportTicket } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CSDashboard() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  useEffect(() => {
    setTickets(db.getTickets().filter(t => t.status === 'Open'));
  }, []);

  const handleClose = (id: string) => {
     const ticket = tickets.find(t => t.id === id);
     if (!ticket) return;
     
     db.updateTicket({ ...ticket, status: 'Closed' });
     setTickets(prev => prev.filter(t => t.id !== id));
     toast({ title: 'Ticket Closed', description: 'Ticket marked as resolved.' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">CS Dashboard</h1>
        <p className="text-muted-foreground">Support ticket queue.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No open tickets.</TableCell>
                 </TableRow>
              )}
              {tickets.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.id}</TableCell>
                  <TableCell>{t.user_id}</TableCell>
                  <TableCell className="font-medium">{t.subject}</TableCell>
                  <TableCell className="max-w-[300px] truncate text-muted-foreground">{t.message}</TableCell>
                  <TableCell>{new Date(t.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                     <Button size="sm" onClick={() => handleClose(t.id)}>
                        Resolve
                     </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
