import { useAuth } from '@/lib/auth';
import { db, SupportTicket } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function Support() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  useEffect(() => {
    if (user) {
      // Mock fetching user tickets
       const allTickets = db.getTickets();
       setTickets(allTickets.filter(t => t.user_id === user.id));
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const newTicket: SupportTicket = {
       id: Math.random().toString(36).substr(2, 9),
       user_id: user.id,
       subject,
       message,
       status: 'Open',
       created_at: new Date().toISOString()
    };

    db.addTicket(newTicket);
    setTickets([newTicket, ...tickets]);
    toast({ title: 'Ticket Created', description: 'Our support team will respond shortly.' });
    setSubject('');
    setMessage('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Support</h1>
        <p className="text-muted-foreground">Need help? We are here 24/7.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Create New Ticket</CardTitle>
            <CardDescription>Describe your issue in detail.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g., Deposit not showing" required />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Provide transaction IDs if applicable..." required className="min-h-[150px]" />
              </div>
              <Button type="submit">Submit Ticket</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">{ticket.subject}</TableCell>
                    <TableCell>
                      <Badge variant={ticket.status === 'Open' ? 'secondary' : 'outline'}>
                        {ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(ticket.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
