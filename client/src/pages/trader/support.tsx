import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function Support() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const apiBase = (import.meta.env.VITE_API_BASE as string) || '/api';
  const wsEnv = (import.meta.env.VITE_WS_BASE as string) || '';
  
  const [sessionId, setSessionId] = useState<string>('');
  const [presence, setPresence] = useState<{status: 'online'|'away'|'offline', waitTimeMins?: number}>({status:'offline'});
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{id?: string; sender: 'trader'|'agent'|'ai', text?: string, attachmentUrl?: string, filename?: string, mimeType?: string, timestamp: number, readBy?: string[]}[]>([]);
  const [typing, setTyping] = useState<boolean>(false);
  const [httpMode, setHttpMode] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  useEffect(() => {}, [user]);

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
        const scheme = (typeof location !== 'undefined' && location.protocol === 'https:') ? 'wss' : 'ws';
        const host = (typeof location !== 'undefined' && location.host) ? location.host : 'localhost:5000';
        const base = wsEnv ? wsEnv.replace(/^http/,'ws') : `${scheme}://${host}`;
        const targetWs = `${base}${base.endsWith('/ws') ? '' : '/ws'}`;
        const ws = new WebSocket(`${targetWs}?sessionId=${data.sessionId}&role=trader${token ? `&token=${encodeURIComponent(token)}` : ''}`);
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
              setMessages((prev) => [...prev, { id: d.id, sender: d.sender, text: d.text, timestamp: d.timestamp, filename: d.filename, mimeType: d.mimeType, readBy: d.readBy || [], attachmentUrl: d.attachmentId ? `${apiBase}/chat/file/${d.attachmentId}` : undefined }]);
            } else if (payload.type === 'read') {
              const { messageId, userId: reader } = payload.data || {};
              setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, readBy: Array.isArray(m.readBy) ? (m.readBy!.includes(reader) ? m.readBy! : [...m.readBy!, reader]) : [reader] } : m));
            }
          } catch {}
        };
        ws.onopen = () => {
          setHttpMode(false);
          setMessages((prev) => [...prev, { sender: 'ai', text: 'Welcome to Binapex Support. How can we help?', timestamp: Date.now() }]);
        };
        ws.onclose = () => {
          setHttpMode(true);
          toast({ variant: 'destructive', title: 'Realtime chat unavailable', description: 'Switched to fallback messaging.' });
        };
        try {
          const h = await fetch(`${apiBase}/chat/history/${data.sessionId}`);
          const j = await h.json();
          const msgs = Array.isArray(j?.messages) ? j.messages : [];
          setMessages(msgs.map((d: any) => ({ id: d.id, sender: d.sender, text: d.text, timestamp: d.timestamp, filename: d.filename, mimeType: d.mimeType, readBy: d.readBy || [], attachmentUrl: d.attachmentId ? `${apiBase}/chat/file/${d.attachmentId}` : undefined })));
        } catch {}
      } catch {
        toast({ variant: 'destructive', title: 'Chat unavailable', description: 'Please try again later.' });
      }
    }
    initSession();
    return () => { wsRef.current?.close(); };
  }, [apiBase, wsEnv, toast, token]);

  

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    const now = Date.now();
    setMessages((prev) => [...prev, { sender: 'trader', text, timestamp: now }]);
    setChatInput('');
    if (!httpMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', text }));
      return;
    }
    (async () => {
      try {
        const r = await fetch(`${apiBase}/support/message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, text }) });
        if (r.ok) {
          const j = await r.json();
          const reply = String(j.reply || 'Thank you. An agent will assist you shortly.');
          setMessages((prev) => [...prev, { sender: 'ai', text: reply, timestamp: Date.now() }]);
        }
      } catch {}
    })();
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

  const sendTyping = () => {
    if (httpMode) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'typing' }));
  };

  useEffect(() => {
    if (httpMode || !wsRef.current || !user) return;
    const last = messages[messages.length - 1];
    if (!last || last.sender === 'trader' || !last.id) return;
    const already = Array.isArray(last.readBy) && last.readBy.includes(user.id);
    if (!already) wsRef.current.send(JSON.stringify({ type: 'read', messageId: last.id }));
  }, [messages, user, httpMode]);

  if (!user || user.role !== 'Trader' || user.kyc_status !== 'Approved') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Support</h1>
          <p className="text-muted-foreground">Access restricted. Only verified traders can use live chat.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Verification Required</CardTitle>
            <CardDescription>Please complete KYC to enable live chat.</CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/security" className="inline-flex items-center h-9 px-3 rounded-md bg-primary text-primary-foreground">Go to Security</a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Support</h1>
        <p className="text-muted-foreground">Need help? We are here 24/7.</p>
      </div>

      <div className="grid lg:grid-cols-1 gap-6">
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
            <div className="h-[420px] bg-black/20 border border.white/10 rounded-xl p-4 overflow-y-auto space-y-3">
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
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    {new Date(m.timestamp).toLocaleTimeString()}
                    {m.sender === 'trader' && Array.isArray(m.readBy) && m.readBy.length > 0 ? <span title="Read"><span>✓✓</span></span> : null}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Session ID: <span className="font-mono">{sessionId}</span> <button className="underline" onClick={() => navigator.clipboard.writeText(sessionId)}>Copy</button></div>
            <div className="flex items-center gap-2 mt-4">
              <Input value={chatInput} onChange={(e) => { setChatInput(e.target.value); if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current); typingTimerRef.current = window.setTimeout(() => sendTyping(), 150); }} placeholder="Type a message…" onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }} />
              <Button onClick={sendChat} className="bg-gradient-to-r from-primary to-amber-300 text-black">Send</Button>
              <Input type="file" accept="application/pdf,image/png,image/jpeg" onChange={onAttach} className="max-w-[180px]" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
