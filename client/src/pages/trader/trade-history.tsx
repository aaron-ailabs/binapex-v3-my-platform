import { useAuth } from '@/lib/auth';
import { db, Trade } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { fmtUSD } from '@/lib/utils';
import { useEffect, useState } from 'react';

export default function TradeHistory() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    if (user) {
      setTrades(db.getUserTrades(user.id));
    }
  }, [user]);

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
