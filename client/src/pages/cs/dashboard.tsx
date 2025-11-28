import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js'
import { useToast } from '@/hooks/use-toast';

export default function CSDashboard() {
  const { toast } = useToast();
  useAuth();
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || ''
  const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || ''
  const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null
  const [presence, setPresence] = useState<{status: 'online'|'away'|'offline', waitTimeMins?: number}>({status:'offline'});
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<{id?: string; sender: 'trader'|'agent'|'ai', text?: string, timestamp: number, readBy?: string[]}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatChannelRef = useRef<any>(null)
  const presenceChannelRef = useRef<any>(null)
  const [sessions, setSessions] = useState<{ id: string; participants: number }[]>([]);
  const typingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    async function loadSessions() {
      try {
        const r = await fetch('/api/chat/sessions');
        const j = await r.json();
        setSessions(Array.isArray(j?.items) ? j.items : []);
      } catch {}
    }
    loadSessions();
    const t = setInterval(loadSessions, 3000);
    return () => clearInterval(t);
  }, [supabase]);

  useEffect(() => {
    async function loadPresence() {
      try {
        const res = await fetch('/api/support/status');
        setPresence(await res.json());
      } catch {}
    }
    loadPresence();
    if (supabase) {
      try {
        const ch = supabase.channel('presence')
        ch.on('broadcast', { event: 'presence' }, (payload) => {
          setPresence(payload.payload)
        })
        ch.subscribe()
        presenceChannelRef.current = ch
      } catch {}
    }
  }, [supabase]);

  

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
      if (!supabase) {
        toast({ variant: 'destructive', title: 'Realtime unavailable', description: 'Supabase not configured' })
        return
      }
      const ch = supabase.channel(`chat:${sessionId}`)
      ch.on('broadcast', { event: 'message' }, (payload) => {
        const d: any = payload.payload || {}
        setMessages((prev) => [...prev, { id: d.id, sender: d.sender, text: d.text, timestamp: d.timestamp, readBy: d.readBy || [] }])
      })
      ch.on('broadcast', { event: 'read' }, (payload) => {
        const { messageId, userId: reader } = (payload.payload || {})
        setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, readBy: Array.isArray(m.readBy) ? (m.readBy!.includes(reader) ? m.readBy! : [...m.readBy!, reader]) : [reader] } : m))
      })
      ch.on('broadcast', { event: 'typing' }, () => { /* optional typing indicator for agent */ })
      ch.subscribe()
      chatChannelRef.current = ch
      toast({ title: 'Joined Session', description: `Session ${sessionId}` })
    } catch {}
  };

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    try { chatChannelRef.current?.send({ type: 'broadcast', event: 'message', payload: { sender: 'agent', sessionId, text, timestamp: Date.now() } }) } catch {}
    setMessages((prev) => [...prev, { sender: 'agent', text, timestamp: Date.now() }]);
    setChatInput('');
  };

  const sendTyping = () => {
    try { chatChannelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { sender: 'agent', sessionId } }) } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">CS Live Chat</h1>
        <p className="text-muted-foreground">Real-time peer-to-peer support.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session ID</TableHead>
                <TableHead>Participants</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No active sessions</TableCell>
                </TableRow>
              )}
              {sessions.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.id}</TableCell>
                  <TableCell>{s.participants}</TableCell>
                  <TableCell className="text-right"><Button size="sm" onClick={() => { setSessionId(s.id); joinSession(); }}>Join</Button></TableCell>
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
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                  {new Date(m.timestamp).toLocaleTimeString()}
                  {m.sender === 'agent' && Array.isArray(m.readBy) && m.readBy.length > 0 ? <span title="Read"><span>✓✓</span></span> : null}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <input className="border rounded px-2 py-1 flex-1 bg-background" placeholder="Type a message…" value={chatInput} onChange={(e) => { setChatInput(e.target.value); if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current); typingTimerRef.current = window.setTimeout(() => sendTyping(), 150); }} onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }} />
            <Button onClick={sendChat}>Send</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
