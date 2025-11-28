import { db, Transaction, EngineSettings } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toUSD, fmtUSD } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TransactionOversight() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [engine, setEngine] = useState<EngineSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTransactions(db.getTransactions().filter(t => t.status === 'Pending'));
    setEngine(db.getEngineSettings());
    const t = setTimeout(() => setLoading(false), 200);
    return () => clearTimeout(t);
  }, []);

  

  const handleAction = (id: string, status: 'Approved' | 'Rejected') => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    // Update transaction
    db.updateTransaction({ ...tx, status });
    
    // If approved and it's a withdrawal, deduct from wallet (mock logic)
    // If deposit, add to wallet.
    if (status === 'Approved') {
       const wallets = db.getUserWallets(tx.user_id);
       const wallet = wallets.find(w => w.asset_name === tx.asset);
       if (wallet) {
          const newBalance = tx.type === 'Deposit' ? wallet.balance + tx.amount : wallet.balance - tx.amount;
          db.updateWallet({ ...wallet, balance: newBalance });
       } else if (tx.type === 'Deposit') {
          // Create new wallet if deposit
          db.updateWallet({
             id: Math.random().toString(),
             user_id: tx.user_id,
             asset_name: tx.asset,
             balance: tx.amount
          });
       }
    }

    setTransactions(prev => prev.filter(t => t.id !== id));
    toast({ title: `Transaction ${status}`, description: `Transaction has been processed.` });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Transaction Oversight</h1>
        <p className="text-sm text-muted-foreground">Lulus/tolak transaksi yang belum diproses.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Engine Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label>Spread (bps)</Label>
              <Input type="number" value={engine?.spreadBps ?? 0} onChange={(e) => setEngine(_prev => ({ spreadBps: Number(e.target.value || 0) }))} />
            </div>
          </div>
          <div className="flex justify-end mt-4 gap-2">
            <Button variant="outline" onClick={() => { if (engine) { db.updateEngineSettings(engine); toast({ title: 'Engine Updated', description: 'Spread configuration saved.' }); } }}>Save Engine</Button>
          </div>
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">Manage deposit channels on the dedicated funding page.</p>
            <a href="/admin/funding" className="inline-flex items-center h-9 px-3 rounded-md bg-primary text-primary-foreground mt-2">Go to Funding Settings</a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No pending transactions.</TableCell>
                 </TableRow>
              )}
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-mono text-xs">{tx.id}</TableCell>
                  <TableCell>
                    <Badge variant={tx.type === 'Deposit' ? 'default' : 'secondary'}>{tx.type}</Badge>
                  </TableCell>
                  <TableCell>{tx.user_id}</TableCell>
                  <TableCell>{tx.asset}</TableCell>
                  <TableCell>{fmtUSD(toUSD(tx.asset, tx.amount))}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {tx.wallet_address || 'Bank Transfer'}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                     <Button size="sm" variant="destructive" onClick={() => handleAction(tx.id, 'Rejected')}>
                        <X className="w-4 h-4" />
                     </Button>
                     <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleAction(tx.id, 'Approved')}>
                        <Check className="w-4 h-4" />
                     </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
