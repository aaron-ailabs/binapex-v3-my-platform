import { db, SupportTicket } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useEffect, useRef, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CSDashboard() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [presence, setPresence] = useState<{status: 'online'|'away'|'offline', waitTimeMins?: number}>({status:'offline'});
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<{sender: 'trader'|'agent'|'ai', text?: string, timestamp: number}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    setTickets(db.getTickets().filter(t => t.status === 'Open'));
  }, []);

  useEffect(() => {
    async function loadPresence() {
      try {
        const res = await fetch('/api/support/status');
        setPresence(await res.json());
      } catch {}
    }
    loadPresence();
  }, []);

  const handleClose = (id: string) => {
     const ticket = tickets.find(t => t.id === id);
     if (!ticket) return;
     
     db.updateTicket({ ...ticket, status: 'Closed' });
     setTickets(prev => prev.filter(t => t.id !== id));
     toast({ title: 'Ticket Closed', description: 'Ticket marked as resolved.' });
  };

  const setOnline = async () => {
    const res = await fetch('/api/support/presence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'online', waitTimeMins: 0 }) });
    setPresence(await res.json());
    toast({ title: 'Presence Updated', description: 'You are now ONLINE' });
  };
  const setAway = async () => {
    const res = await fetch('/api/support/presence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'away', waitTimeMins: 10 }) });
    setPresence(await res.json());
    toast({ title: 'Presence Updated', description: 'You are now AWAY' });
  };
  const setOffline = async () => {
    const res = await fetch('/api/support/presence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'offline', waitTimeMins: 5 }) });
    setPresence(await res.json());
    toast({ title: 'Presence Updated', description: 'You are now OFFLINE' });
  };

  const joinSession = () => {
    if (!sessionId) return;
    try {
      const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws?sessionId=${sessionId}&role=agent`);
      wsRef.current = ws;
      ws.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data);
          if (payload.type === 'message') {
            const d = payload.data;
            setMessages((prev) => [...prev, { sender: d.sender, text: d.text, timestamp: d.timestamp }]);
          }
        } catch {}
      };
      ws.onopen = () => {
        toast({ title: 'Joined Session', description: `Session ${sessionId}` });
      };
      ws.onclose = () => {
        toast({ variant: 'destructive', title: 'Disconnected', description: 'Session closed' });
      };
    } catch {}
  };

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'message', text }));
    setMessages((prev) => [...prev, { sender: 'agent', text, timestamp: Date.now() }]);
    setChatInput('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">CS Dashboard</h1>
        <p className="text-muted-foreground">Support ticket queue & live presence.</p>
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

      <Card>
        <CardHeader>
          <CardTitle>Presence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge variant={presence.status === 'online' ? 'secondary' : 'outline'}>{presence.status.toUpperCase()}</Badge>
            {presence.waitTimeMins ? <span className="text-xs text-muted-foreground">~{presence.waitTimeMins}m wait</span> : null}
            <Button size="sm" onClick={setOnline}>Go Online</Button>
            <Button size="sm" variant="outline" onClick={setAway}>Set Away</Button>
            <Button size="sm" variant="destructive" onClick={setOffline}>Go Offline</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Join Chat Session</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <input className="border rounded px-2 py-1 bg-background" placeholder="Enter sessionId" value={sessionId} onChange={(e) => setSessionId(e.target.value)} />
            <Button onClick={joinSession}>Join</Button>
          </div>
          <div className="h-[260px] border rounded p-3 overflow-y-auto bg-black/10">
            {messages.map((m, i) => (
              <div key={i} className={m.sender === 'agent' ? 'text-right' : 'text-left'}>
                <div className={m.sender === 'agent' ? 'inline-block bg-primary text-black px-3 py-2 rounded-2xl' : 'inline-block bg-white/10 text-white px-3 py-2 rounded-2xl'}>
                  {m.text}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{new Date(m.timestamp).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <input className="border rounded px-2 py-1 flex-1 bg-background" placeholder="Type a message…" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }} />
            <Button onClick={sendChat}>Send</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
