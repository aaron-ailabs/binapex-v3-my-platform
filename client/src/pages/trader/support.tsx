import { useAuth } from '@/lib/auth';
import { db, SupportTicket } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function Support() {
  const { user } = useAuth();
  const { toast } = useToast();
  const apiBase = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:5000/api';
  const wsBase = (import.meta.env.VITE_WS_BASE as string) || 'ws://localhost:5000';
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [presence, setPresence] = useState<{status: 'online'|'away'|'offline', waitTimeMins?: number}>({status:'offline'});
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{sender: 'trader'|'agent'|'ai', text?: string, attachmentUrl?: string, filename?: string, mimeType?: string, timestamp: number}[]>([]);
  const [typing, setTyping] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (user) {
      // Mock fetching user tickets
       const allTickets = db.getTickets();
       setTickets(allTickets.filter(t => t.user_id === user.id));
    }
  }, [user]);

  const initRef = useRef(false);
  useEffect(() => {
    async function initSession() {
      try {
        if (initRef.current) return;
        initRef.current = true;
        const statusRes = await fetch(`${apiBase}/support/status`);
        const p = await statusRes.json();
        setPresence(p);
        const res = await fetch(`${apiBase}/support/session`, { method: 'POST' });
        const data = await res.json();
        setSessionId(data.sessionId);
        const targetWs = `${wsBase.replace(/^http/,'ws')}/ws`;
        const ws = new WebSocket(`${targetWs}?sessionId=${data.sessionId}&role=trader`);
        wsRef.current = ws;
        ws.onmessage = (ev) => {
          try {
            const payload = JSON.parse(ev.data);
            if (payload.type === 'presence') {
              setPresence(payload.data);
            } else if (payload.type === 'typing') {
              setTyping(true);
              setTimeout(() => setTyping(false), 1200);
            } else if (payload.type === 'message') {
              const d = payload.data;
              setMessages((prev) => [...prev, { sender: d.sender, text: d.text, timestamp: d.timestamp, filename: d.filename, mimeType: d.mimeType, attachmentUrl: d.attachmentId ? `${apiBase}/chat/file/${d.attachmentId}` : undefined }]);
            }
          } catch {}
        };
        ws.onopen = () => {
          setMessages((prev) => [...prev, { sender: 'ai', text: 'Welcome to Binapex Support. How can we help?', timestamp: Date.now() }]);
        };
        ws.onclose = () => {
          toast({ variant: 'destructive', title: 'Chat disconnected', description: 'Please refresh to reconnect.' });
        };
      } catch {
        toast({ variant: 'destructive', title: 'Chat unavailable', description: 'Please try again later.' });
      }
    }
    initSession();
    return () => { wsRef.current?.close(); };
  }, [apiBase, wsBase, toast]);

  const handleSubmit = (e: FormEvent) => {
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

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'message', text }));
    setMessages((prev) => [...prev, { sender: 'trader', text, timestamp: Date.now() }]);
    setChatInput('');
  };

  const onAttach = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
    if (!allowed.includes(file.type)) {
      toast({ variant: 'destructive', title: 'Invalid file type', description: 'Only PDF, PNG, JPEG allowed.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Max 5MB.' });
      return;
    }
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);
    const res = await fetch(`${apiBase}/chat/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, mimeType: file.type, contentBase64: base64 })
    });
    if (!res.ok) {
      toast({ variant: 'destructive', title: 'Upload failed', description: 'Please try again.' });
      return;
    }
    const data = await res.json();
    const attachmentUrl = data.url;
    setMessages((prev) => [...prev, { sender: 'trader', text: 'Attachment sent', filename: file.name, mimeType: file.type, attachmentUrl, timestamp: Date.now() }]);
    wsRef.current?.send(JSON.stringify({ type: 'message', text: `Attachment: ${file.name}`, attachmentId: data.id }));
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

        <Card className="border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Live Chat</CardTitle>
                <CardDescription>Real-time support with AI fallback.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={presence.status === 'online' ? 'secondary' : 'outline'}>
                  {presence.status.toUpperCase()}
                </Badge>
                {presence.waitTimeMins ? <span className="text-xs text-muted-foreground">~{presence.waitTimeMins}m wait</span> : null}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[380px] bg-black/20 border border-white/10 rounded-xl p-4 overflow-y-auto space-y-3">
              {typing && (
                <div className="text-left">
                  <div className="inline-block px-3 py-2 rounded-2xl bg-white/10 text-white animate-pulse">Support is typing…</div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={m.sender === 'trader' ? 'text-right' : 'text-left'}>
                  <div className={m.sender === 'trader' ? 'inline-block bg-primary text-black px-3 py-2 rounded-2xl' : 'inline-block bg-white/10 text-white px-3 py-2 rounded-2xl'}>
                    {m.text}
                    {m.attachmentUrl && (
                      <div className="mt-2">
                        <a href={m.attachmentUrl} target="_blank" className="underline">{m.filename}</a>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{new Date(m.timestamp).toLocaleTimeString()}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Session ID: <span className="font-mono">{sessionId}</span> <button className="underline" onClick={() => navigator.clipboard.writeText(sessionId)}>Copy</button></div>
            <div className="flex items-center gap-2 mt-4">
              <Input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type a message…" onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }} />
              <Button onClick={sendChat} className="bg-gradient-to-r from-primary to-amber-300 text-black">Send</Button>
              <Input type="file" accept="application/pdf,image/png,image/jpeg" onChange={onAttach} className="max-w-[180px]" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
