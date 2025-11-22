import { db, Transaction } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toUSD, fmtUSD } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function TransactionOversight() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    setTransactions(db.getTransactions().filter(t => t.status === 'Pending'));
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Transaction Oversight</h1>
        <p className="text-muted-foreground">Approve or reject pending transactions.</p>
      </div>

      <Card>
        <CardContent className="p-0">
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
        </CardContent>
      </Card>
    </div>
  );
}
