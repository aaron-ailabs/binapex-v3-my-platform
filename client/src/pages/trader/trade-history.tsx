import { useAuth } from '@/lib/auth';
import { Trade } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { fmtUSD } from '@/lib/utils';
import { useEffect, useState } from 'react';

export default function TradeHistory() {
  const { user, token } = useAuth();
  const apiBase = (import.meta.env.VITE_API_BASE as string) || '/api';
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const res = await fetch(`${apiBase}/trades`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
        if (res.ok) {
          const list = await res.json();
          const mapped: Trade[] = list.map((t: any) => ({ id: t.id, user_id: t.userId, asset: t.asset, amount: t.amount, direction: t.direction, duration: t.duration, entry_price: t.entryPrice, exit_price: t.exitPrice, result: t.result, status: t.status, created_at: t.createdAt }));
          setTrades(mapped);
        }
      } catch {}
    }
    load();
  }, [user, token, apiBase]);

  useEffect(() => {
    if (!user) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch(`${apiBase}/trades`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
        if (res.ok) {
          const list = await res.json();
          const mapped: Trade[] = list.map((t: any) => ({ id: t.id, user_id: t.userId, asset: t.asset, amount: t.amount, direction: t.direction, duration: t.duration, entry_price: t.entryPrice, exit_price: t.exitPrice, result: t.result, status: t.status, created_at: t.createdAt }));
          setTrades(mapped);
        }
      } catch {}
    }, 2000);
    return () => clearInterval(id);
  }, [user, token, apiBase]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Trade History</h1>
        <p className="text-muted-foreground">Review your past performance.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Entry</TableHead>
                <TableHead>Exit</TableHead>
                <TableHead>Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell className="font-mono text-xs">{trade.id}</TableCell>
                  <TableCell>{new Date(trade.created_at).toLocaleString()}</TableCell>
                  <TableCell>{trade.asset}</TableCell>
                  <TableCell>
                    <Badge variant={trade.direction === 'High' ? 'default' : 'destructive'}>
                      {trade.direction}
                    </Badge>
                  </TableCell>
                  <TableCell>{fmtUSD(trade.amount)}</TableCell>
                  <TableCell>{trade.duration}</TableCell>
                  <TableCell>{trade.entry_price.toFixed(2)}</TableCell>
                  <TableCell>{trade.exit_price?.toFixed(2) || '-'}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={trade.result === 'Win' ? 'default' : trade.result === 'Loss' ? 'destructive' : 'secondary'}
                      className={trade.result === 'Win' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                    >
                      {trade.result}
                    </Badge>
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
