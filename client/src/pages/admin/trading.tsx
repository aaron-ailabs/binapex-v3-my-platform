import React, { useEffect, useMemo, useRef, useState, FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { db, User } from "@/lib/mock-data";

export default function AdminTrading() {
  const { toast } = useToast();
  const { token } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const esRef = useRef<EventSource | null>(null);
  const apiBase = (import.meta.env.VITE_API_BASE as string) || '/api';
  const [targetEmail, setTargetEmail] = useState('');
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [payoutPct, setPayoutPct] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  useEffect(() => {
    const es = new EventSource("/api/admin/trades/stream", { withCredentials: true } as any);
    esRef.current = es;
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data || "{}");
        if (Array.isArray(data)) {
          setEvents((prev) => [...data, ...prev].slice(0, 200));
        } else {
          setEvents((prev) => [data, ...prev].slice(0, 200));
        }
      } catch {}
    };
    return () => {
      try { es.close(); } catch {}
    };
  }, []);

  const findUser = (e: FormEvent) => {
    e.preventDefault();
    const users = db.getUsers();
    const u = users.find(u => u.email.toLowerCase() === targetEmail.toLowerCase() || u.name.toLowerCase() === targetEmail.toLowerCase());
    if (!u) {
      setTargetUser(null);
      toast({ variant: 'destructive', title: 'User not found', description: 'Enter exact email or name.' });
      return;
    }
    setTargetUser(u);
    setPayoutPct(Math.max(0, Math.min(100, Number(u.payout_percentage ?? 0))));
  };

  const savePayout = async () => {
    if (!token) { toast({ variant: 'destructive', title: 'Unauthorized', description: 'Admin token required.' }); return; }
    if (!targetUser) { toast({ variant: 'destructive', title: 'No user selected' }); return; }
    const pct = Math.round(Math.max(0, Math.min(100, payoutPct)));
    try {
      const r = await fetch(`${apiBase}/admin/users/payout`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ userId: targetUser.id, payoutPct: pct, reason }) });
      if (!r.ok) { toast({ variant: 'destructive', title: 'Save failed', description: `${r.status}` }); return; }
      const data = await r.json().catch(() => null);
      const val = typeof data?.payoutPct === 'number' ? Number(data.payoutPct) : pct;
      setPayoutPct(val);
      setTargetUser({ ...targetUser, payout_percentage: val });
      toast({ title: 'Payout Updated', description: `${Math.round(val)}% for ${targetUser.email}` });
    } catch {
      toast({ variant: 'destructive', title: 'Network error' });
    }
  };

  const largeTrades = useMemo(() => events.filter((e) => e?.type === "large_trade"), [events]);
  const suspicious = useMemo(() => events.filter((e) => e?.type === "suspicious_pattern"), [events]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
        Trading Monitor
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Adjust User Trade Payout (Admin)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={findUser} className="grid md:grid-cols-3 gap-3 items-end" aria-label="Find user by email or name">
            <div className="space-y-2 md:col-span-2">
              <Label id="label-find-user">User Email or Name</Label>
              <Input aria-labelledby="label-find-user" placeholder="trader@binapex.com" value={targetEmail} onChange={(e) => setTargetEmail(e.target.value)} />
            </div>
            <Button type="submit" className="h-12 md:h-9" aria-label="Find user">Find User</Button>
          </form>

          {targetUser && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center" aria-label="User payout control">
                <div className="md:col-span-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">Current Payout</div>
                    <div className="text-sm font-medium" aria-live="polite">{Math.round(payoutPct)}%</div>
                  </div>
                  <Slider aria-label="Payout percentage slider" className="touch-manipulation h-12 md:h-8 [&_[data-radix-collection-item]]:h-12 [&_[data-radix-collection-item]]:w-12 md:[&_[data-radix-collection-item]]:h-6 md:[&_[data-radix-collection-item]]:w-6" value={[payoutPct]} onValueChange={(v) => setPayoutPct(Math.max(0, Math.min(100, Number(v[0] || 0))))} min={0} max={100} step={1} />
                </div>
                <div className="space-y-1">
                  <Input aria-label="Payout percentage" inputMode="numeric" pattern="[0-9]*" placeholder="%" value={String(Math.round(payoutPct))} onChange={(e) => setPayoutPct(Math.max(0, Math.min(100, Number(e.target.value || 0))))} />
                  <Button type="button" className="h-12 md:h-9" aria-label="Save payout" onClick={savePayout}>Save</Button>
                </div>
              </div>
              <Input aria-label="Reason (optional)" placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Live Trade Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.filter(e => e?.type?.startsWith("trade_")).map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{e.type.replace("trade_", "")}</TableCell>
                  <TableCell>{e.trade?.symbol}</TableCell>
                  <TableCell>{e.trade?.direction}</TableCell>
                  <TableCell className="text-right">${e.trade?.amount?.toFixed?.(2) ?? e.trade?.amount}</TableCell>
                  <TableCell>
                    <Badge variant={e.type === "trade_open" ? "outline" : "secondary"}>{e.type === "trade_open" ? "Open" : "Closed"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Large Trade Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {largeTrades.length === 0 ? (
              <p className="text-muted-foreground">No large trades detected.</p>
            ) : (
              <ul className="space-y-2">
                {largeTrades.map((e, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Badge variant="secondary">${e.trade?.amount}</Badge>
                    <span className="text-sm">{e.trade?.symbol} • {e.trade?.direction}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Suspicious Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            {suspicious.length === 0 ? (
              <p className="text-muted-foreground">No suspicious activity detected.</p>
            ) : (
              <ul className="space-y-2">
                {suspicious.map((e, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Badge variant="destructive">{e.pattern}</Badge>
                    <span className="text-sm">User {e.userId} • {e.count} events</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
