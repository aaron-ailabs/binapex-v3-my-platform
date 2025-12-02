import { useAuth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js'
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
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || ''
  const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || ''
  const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null
  
  const [sessionId, setSessionId] = useState<string>('');
  const [presence, setPresence] = useState<{status: 'online'|'away'|'offline', waitTimeMins?: number}>({status:'offline'});
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{id?: string; sender: 'trader'|'agent'|'ai', text?: string, attachmentUrl?: string, filename?: string, mimeType?: string, timestamp: number, readBy?: string[]}[]>([]);
  const [typing, setTyping] = useState<boolean>(false);
  const [httpMode, setHttpMode] = useState<boolean>(false);
  const presenceChannelRef = useRef<any>(null)
  const chatChannelRef = useRef<any>(null)
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
        if (supabase) {
          try {
            const presenceCh = supabase.channel('presence')
            presenceCh.on('broadcast', { event: 'presence' }, (payload) => {
              setPresence(payload.payload)
            })
            await presenceCh.subscribe()
            presenceChannelRef.current = presenceCh

            const chatCh = supabase.channel(`chat:${data.sessionId}`)
            chatCh.on('broadcast', { event: 'typing' }, () => {
              setTyping(true)
              setTimeout(() => setTyping(false), 1200)
            })
            chatCh.on('broadcast', { event: 'message' }, (payload) => {
              const d: any = payload.payload || {}
              setMessages((prev) => [...prev, { id: d.id, sender: d.sender, text: d.text, timestamp: d.timestamp, filename: d.filename, mimeType: d.mimeType, readBy: d.readBy || [], attachmentUrl: d.attachmentId ? `${apiBase}/chat/file/${d.attachmentId}` : undefined }])
            })
            chatCh.on('broadcast', { event: 'read' }, (payload) => {
              const { messageId, userId: reader } = (payload.payload || {})
              setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, readBy: Array.isArray(m.readBy) ? (m.readBy!.includes(reader) ? m.readBy! : [...m.readBy!, reader]) : [reader] } : m))
            })
            await chatCh.subscribe()
            chatChannelRef.current = chatCh
            setHttpMode(false)
            setMessages((prev) => [...prev, { sender: 'ai', text: 'Welcome to Binapex Support. How can we help?', timestamp: Date.now() }])
          } catch {
            setHttpMode(true)
            toast({ variant: 'destructive', title: 'Realtime chat unavailable', description: 'Switched to fallback messaging.' })
          }
        } else {
          setHttpMode(true)
        }
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
    return () => {
      try { presenceChannelRef.current?.unsubscribe() } catch {}
      try { chatChannelRef.current?.unsubscribe() } catch {}
    };
  }, [apiBase, wsEnv, toast, token, supabase]);

  

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    const now = Date.now();
    setMessages((prev) => [...prev, { sender: 'trader', text, timestamp: now }]);
    setChatInput('');
    (async () => {
      try {
        const r = await fetch(`${apiBase}/support/message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, text }) });
        if (!r.ok) return;
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
    try {
      chatChannelRef.current?.send({ type: 'broadcast', event: 'message', payload: { sender: 'trader', sessionId, text: `Attachment: ${file.name}`, attachmentId: data.id, filename: file.name, mimeType: file.type, timestamp: Date.now() } })
    } catch {}
  };

  const sendTyping = () => {
    if (httpMode) return;
    try { chatChannelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { sender: 'trader', sessionId } }) } catch {}
  };

  useEffect(() => {
    if (httpMode || !user) return;
    const last = messages[messages.length - 1];
    if (!last || last.sender === 'trader' || !last.id) return;
    const already = Array.isArray(last.readBy) && last.readBy.includes(user.id);
    if (!already) {
      try { chatChannelRef.current?.send({ type: 'broadcast', event: 'read', payload: { messageId: last.id, userId: user.id } }) } catch {}
    }
  }, [messages, user, httpMode]);

  if (!user || user.role !== 'Trader') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Support</h1>
          <p className="text-muted-foreground">Access restricted. Only traders can use live chat.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Trader Role Required</CardTitle>
            <CardDescription>Please login as a Trader to access live chat.</CardDescription>
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
              <Input value={chatInput} onChange={(e) => { setChatInput(e.target.value); if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current); typingTimerRef.current = window.setTimeout(() => sendTyping(), 150); }} placeholder="Type a message…" aria-label="Type a message" enterKeyHint="send" onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }} />
              <Button onClick={sendChat} className="bg-gradient-to-r from-primary to-amber-300 text-black">Send</Button>
              <Input type="file" accept="application/pdf,image/png,image/jpeg" onChange={onAttach} className="max-w-[180px]" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
