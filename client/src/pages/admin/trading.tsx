import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminTrading() {
  const [events, setEvents] = useState<any[]>([]);
  const esRef = useRef<EventSource | null>(null);
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


  const largeTrades = useMemo(() => events.filter((e) => e?.type === "large_trade"), [events]);
  const suspicious = useMemo(() => events.filter((e) => e?.type === "suspicious_pattern"), [events]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 200); return () => clearTimeout(t); }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Trading Monitor</h1>

      <Card>
        <CardHeader>
          <CardTitle>Payout Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">Urus peratus pembayaran pengguna di halaman Users. Ciri ini telah dipusatkan untuk konsistensi dan penyelenggaraan yang lebih baik.</p>
          <a href="/admin/users" className="inline-flex items-center h-9 px-3 rounded-md bg-primary text-primary-foreground">Go to Users</a>
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
