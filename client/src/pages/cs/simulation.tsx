import { useEffect, useMemo, useRef, useState, ChangeEvent } from 'react'
import { useAuth } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'

type Msg = { id?: string; sender: 'trader'|'agent'|'ai'; text?: string; timestamp: number; filename?: string; mimeType?: string; attachmentUrl?: string; readBy?: string[] }

export default function ChatSimulation() {
  const { token } = useAuth()
  const { toast } = useToast()
  const apiBase = (import.meta.env.VITE_API_BASE as string) || '/api'
  const wsBase = (import.meta.env.VITE_WS_BASE as string) || (typeof location !== 'undefined' ? (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host : 'ws://localhost:5000')

  const [sessionId, setSessionId] = useState('')
  const [presence, setPresence] = useState<{status: 'online'|'away'|'offline', waitTimeMins?: number}>({ status: 'offline' })
  const [messages, setMessages] = useState<Msg[]>([])
  const [traderTyping, setTraderTyping] = useState(false)
  const [agentTyping, setAgentTyping] = useState(false)
  const [traderInput, setTraderInput] = useState('')
  const [agentInput, setAgentInput] = useState('')
  const [autoReply, setAutoReply] = useState(true)
  const [fastTestMode, setFastTestMode] = useState(false)
  const [latencies, setLatencies] = useState<number[]>([])
  const [logs, setLogs] = useState<string[]>([])

  const wsTraderRef = useRef<WebSocket | null>(null)
  const wsAgentRef = useRef<WebSocket | null>(null)
  const typingTraderTimerRef = useRef<number | null>(null)
  const typingAgentTimerRef = useRef<number | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const idleTimerRef = useRef<number | null>(null)

  const replyWindowMs = useMemo(() => fastTestMode ? [2000, 5000] : [120000, 300000], [fastTestMode])

  useEffect(() => {
    async function init() {
      try {
        const statusRes = await fetch(`${apiBase}/support/status`)
        const p = await statusRes.json()
        setPresence(p)
        const res = await fetch(`${apiBase}/support/session`, { method: 'POST' })
        const data = await res.json()
        setSessionId(data.sessionId)

        const url = `${wsBase.replace(/^http/,'ws')}/ws?sessionId=${encodeURIComponent(data.sessionId)}`
        const wsTrader = new WebSocket(`${url}&role=trader${token ? `&token=${encodeURIComponent(token)}` : ''}`)
        const wsAgent = new WebSocket(`${url}&role=agent${token ? `&token=${encodeURIComponent(token)}` : ''}`)
        wsTraderRef.current = wsTrader
        wsAgentRef.current = wsAgent

        const onMessage = (_side: 'trader'|'agent') => (ev: MessageEvent) => {
          try {
            const payload = JSON.parse(ev.data)
            if (payload.type === 'presence') {
              setPresence(payload.data)
            } else if (payload.type === 'typing') {
              if (payload.data?.sender === 'agent') { setAgentTyping(true); setTimeout(() => setAgentTyping(false), 1200) }
              if (payload.data?.sender === 'trader') { setTraderTyping(true); setTimeout(() => setTraderTyping(false), 1200) }
            } else if (payload.type === 'message') {
              const d = payload.data
              setMessages(prev => [...prev, { id: d.id, sender: d.sender, text: d.text, timestamp: d.timestamp, filename: d.filename, mimeType: d.mimeType, readBy: d.readBy || [], attachmentUrl: d.attachmentId ? `${apiBase}/chat/file/${d.attachmentId}` : undefined }])
              setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} [recv] ${d.sender}: ${String(d.text||'')}`])
              lastActivityRef.current = Date.now()
            } else if (payload.type === 'read') {
              const { messageId, userId } = payload.data || {}
              setMessages(prev => prev.map(m => m.id === messageId ? { ...m, readBy: Array.isArray(m.readBy) ? (m.readBy!.includes(userId) ? m.readBy! : [...m.readBy!, userId]) : [userId] } : m))
            }
          } catch {}
        }
        wsTrader.onmessage = onMessage('trader')
        wsAgent.onmessage = onMessage('agent')
        wsTrader.onopen = () => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} [open] trader socket`])
        wsAgent.onopen = () => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} [open] agent socket`])
        wsTrader.onclose = () => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} [close] trader socket`])
        wsAgent.onclose = () => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} [close] agent socket`])

        try {
          const h = await fetch(`${apiBase}/chat/history/${data.sessionId}`)
          const j = await h.json()
          const msgs = Array.isArray(j?.messages) ? j.messages : []
          setMessages(msgs.map((d: any) => ({ id: d.id, sender: d.sender, text: d.text, timestamp: d.timestamp, filename: d.filename, mimeType: d.mimeType, readBy: d.readBy || [], attachmentUrl: d.attachmentId ? `${apiBase}/chat/file/${d.attachmentId}` : undefined })))
        } catch {}

        if (idleTimerRef.current) window.clearInterval(idleTimerRef.current)
        idleTimerRef.current = window.setInterval(() => {
          const idleMs = Date.now() - lastActivityRef.current
          const threshold = 30 * 60 * 1000
          if (idleMs > threshold) {
            try { wsTraderRef.current?.close() } catch {}
            try { wsAgentRef.current?.close() } catch {}
            setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} [timeout] session closed after inactivity`])
            window.clearInterval(idleTimerRef.current!)
          }
        }, 5000)
      } catch {
        toast({ variant: 'destructive', title: 'Simulation failed', description: 'Could not initialize session' })
      }
    }
    init()
    return () => {
      try { wsTraderRef.current?.close() } catch {}
      try { wsAgentRef.current?.close() } catch {}
      if (idleTimerRef.current) window.clearInterval(idleTimerRef.current)
    }
  }, [apiBase, wsBase, token, toast])

  useEffect(() => {
    const last = messages[messages.length - 1]
    if (!last || !last.id) return
    try { wsTraderRef.current?.send(JSON.stringify({ type: 'read', messageId: last.id })) } catch {}
    try { wsAgentRef.current?.send(JSON.stringify({ type: 'read', messageId: last.id })) } catch {}
  }, [messages])

  const sendFrom = (side: 'trader'|'agent') => {
    const ws = side === 'trader' ? wsTraderRef.current : wsAgentRef.current
    const text = side === 'trader' ? traderInput.trim() : agentInput.trim()
    if (!ws || ws.readyState !== WebSocket.OPEN || !text) return
    const start = Date.now()
    ws.send(JSON.stringify({ type: 'message', text }))
    setMessages(prev => [...prev, { sender: side, text, timestamp: Date.now() }])
    lastActivityRef.current = Date.now()
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} [send] ${side}: ${text}`])
    if (side === 'trader') setTraderInput('')
    else setAgentInput('')

    const onrecv = (ev: MessageEvent) => {
      try {
        const payload = JSON.parse(ev.data)
        if (payload.type === 'message' && payload.data?.text === text) {
          const ms = Date.now() - start
          setLatencies(prev => [...prev, ms])
          ;(side === 'trader' ? wsTraderRef.current : wsAgentRef.current)?.removeEventListener('message', onrecv as any)
        }
      } catch {}
    }
    ;(side === 'trader' ? wsTraderRef.current : wsAgentRef.current)?.addEventListener('message', onrecv as any)

    if (autoReply && side === 'trader') {
      const [minMs, maxMs] = replyWindowMs
      const delay = Math.floor(minMs + Math.random() * (maxMs - minMs))
      window.setTimeout(() => {
        const wsA = wsAgentRef.current
        if (!wsA || wsA.readyState !== WebSocket.OPEN) return
        const reply = `Acknowledged: ${text}`
        wsA.send(JSON.stringify({ type: 'message', text: reply }))
        setMessages(prev => [...prev, { sender: 'agent', text: reply, timestamp: Date.now() }])
        setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} [auto] agent: ${reply}`])
      }, delay)
    }
  }

  const onTyping = (side: 'trader'|'agent', val: string) => {
    if (side === 'trader') { setTraderInput(val) } else { setAgentInput(val) }
    const ws = side === 'trader' ? wsTraderRef.current : wsAgentRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    const ref = side === 'trader' ? typingTraderTimerRef : typingAgentTimerRef
    if (ref.current) window.clearTimeout(ref.current)
    ref.current = window.setTimeout(() => { try { ws.send(JSON.stringify({ type: 'typing' })) } catch {} }, 150)
  }

  const onAttach = async (side: 'trader'|'agent', e: ChangeEvent<HTMLInputElement>) => {
    const ws = side === 'trader' ? wsTraderRef.current : wsAgentRef.current
    const file = e.target.files?.[0]
    if (!ws || ws.readyState !== WebSocket.OPEN || !file) return
    const allowed = ['application/pdf', 'image/png', 'image/jpeg']
    if (!allowed.includes(file.type)) {
      toast({ variant: 'destructive', title: 'Invalid file type', description: 'Only PDF, PNG, JPEG allowed.' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Max 5MB.' })
      return
    }
    const buf = await file.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    const base64 = btoa(binary)
    const res = await fetch(`${apiBase}/chat/upload`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: file.name, mimeType: file.type, contentBase64: base64 }) })
    if (!res.ok) { toast({ variant: 'destructive', title: 'Upload failed', description: 'Please try again.' }); return }
    const data = await res.json()
    const attachmentUrl = data.url
    setMessages(prev => [...prev, { sender: side, text: 'Attachment sent', filename: file.name, mimeType: file.type, attachmentUrl, timestamp: Date.now() }])
    try { ws.send(JSON.stringify({ type: 'message', text: `Attachment: ${file.name}`, attachmentId: data.id })) } catch {}
  }

  const runTest = async () => {
    setFastTestMode(true)
    setAutoReply(true)
    const samples = ['Hello, I need help with withdrawal', 'My ID document is uploaded', 'Can you verify my account?']
    for (const s of samples) {
      setTraderInput(s)
      sendFrom('trader')
      await new Promise(r => setTimeout(r, 600))
    }
    await new Promise(r => setTimeout(r, 6000))
    const ok = messages.length >= samples.length
    const avg = latencies.length ? Math.round(latencies.reduce((a,b)=>a+b,0)/latencies.length) : 0
    setLogs(prev => [...prev, `TEST: delivery=${ok ? 'ok' : 'fail'} avg_latency=${avg}ms`])
    setFastTestMode(false)
  }

  const avgLatency = useMemo(() => latencies.length ? Math.round(latencies.reduce((a,b)=>a+b,0)/latencies.length) : 0, [latencies])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chat Simulation</h1>
          <p className="text-muted-foreground">Dual-panel live chat for trader and support agent</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={presence.status === 'online' ? 'secondary' : 'outline'}>{presence.status.toUpperCase()}</Badge>
          {presence.waitTimeMins ? <span className="text-xs text-muted-foreground">~{presence.waitTimeMins}m wait</span> : null}
          <div className="flex items-center gap-2">
            <span className="text-xs">Auto Reply</span>
            <Switch checked={autoReply} onCheckedChange={(v) => setAutoReply(Boolean(v))} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs">Fast Test</span>
            <Switch checked={fastTestMode} onCheckedChange={(v) => setFastTestMode(Boolean(v))} />
          </div>
          <Button size="sm" onClick={runTest}>Run Simulation Test</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Trader View</CardTitle>
            <CardDescription>Session <span className="font-mono">{sessionId}</span></CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[360px] bg-black/20 border border-white/10 rounded-xl p-4 overflow-y-auto space-y-3">
              {traderTyping && (
                <div className="text-left">
                  <div className="inline-block px-3 py-2 rounded-2xl bg-white/10 text-white animate-pulse">Agent is typing…</div>
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
            <div className="flex items-center gap-2 mt-4">
              <Input value={traderInput} onChange={(e) => onTyping('trader', e.target.value)} placeholder="Type a message…" onKeyDown={(e) => { if (e.key === 'Enter') sendFrom('trader') }} />
              <Button onClick={() => sendFrom('trader')}>Send</Button>
              <Input type="file" accept="application/pdf,image/png,image/jpeg" onChange={(e) => onAttach('trader', e)} className="max-w-[180px]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Support Agent View</CardTitle>
            <CardDescription>Session <span className="font-mono">{sessionId}</span></CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[360px] bg-black/20 border border-white/10 rounded-xl p-4 overflow-y-auto space-y-3">
              {agentTyping && (
                <div className="text-right">
                  <div className="inline-block px-3 py-2 rounded-2xl bg-white/10 text-white animate-pulse">Trader is typing…</div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={m.sender === 'agent' ? 'text-right' : 'text-left'}>
                  <div className={m.sender === 'agent' ? 'inline-block bg-primary text-black px-3 py-2 rounded-2xl' : 'inline-block bg-white/10 text-white px-3 py-2 rounded-2xl'}>
                    {m.text}
                    {m.attachmentUrl && (
                      <div className="mt-2">
                        <a href={m.attachmentUrl} target="_blank" className="underline">{m.filename}</a>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    {new Date(m.timestamp).toLocaleTimeString()}
                    {m.sender === 'agent' && Array.isArray(m.readBy) && m.readBy.length > 0 ? <span title="Read"><span>✓✓</span></span> : null}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Input value={agentInput} onChange={(e) => onTyping('agent', e.target.value)} placeholder="Type a message…" onKeyDown={(e) => { if (e.key === 'Enter') sendFrom('agent') }} />
              <Button onClick={() => sendFrom('agent')}>Send</Button>
              <Input type="file" accept="application/pdf,image/png,image/jpeg" onChange={(e) => onAttach('agent', e)} className="max-w-[180px]" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Metrics & Logs</CardTitle>
          <CardDescription>Avg Latency: {avgLatency}ms • Messages: {messages.length}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-xs font-mono bg-black/10 rounded p-3 h-[160px] overflow-y-auto">
            {logs.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
