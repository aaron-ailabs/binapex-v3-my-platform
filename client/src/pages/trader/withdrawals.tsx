import { useAuth } from '@/lib/auth';
import { db, Transaction } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function Withdrawals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [asset, setAsset] = useState('BTC');
  const [address, setAddress] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (user) {
      setTransactions(db.getUserTransactions(user.id).filter(t => t.type === 'Withdrawal'));
    }
  }, [user]);

  const handleWithdraw = () => {
    if (!amount || !address || !user) return;
    
    const newTx: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      user_id: user.id,
      type: 'Withdrawal',
      asset,
      amount: Number(amount),
      status: 'Pending',
      created_at: new Date().toISOString(),
      wallet_address: address
    };
    
    db.addTransaction(newTx);
    setTransactions([newTx, ...transactions]);
    toast({ title: 'Withdrawal Requested', description: 'Your withdrawal is being processed.' });
    setAmount('');
    setAddress('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Withdrawals</h1>
        <p className="text-muted-foreground">Withdraw funds to your external wallet.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Request Withdrawal</CardTitle>
            <CardDescription>Enter destination wallet details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Asset</Label>
              <Select value={asset} onValueChange={setAsset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTC">Bitcoin</SelectItem>
                  <SelectItem value="ETH">Ethereum</SelectItem>
                  <SelectItem value="USDT">USDT (TRC20)</SelectItem>
                  <SelectItem value="USD">USD (Bank Wire)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input 
                type="number" 
                placeholder="0.00" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <Label>Destination Address / Account</Label>
              <Input 
                type="text" 
                placeholder="Wallet Address" 
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
              />
            </div>

            <Button className="w-full" variant="destructive" onClick={handleWithdraw}>Request Withdrawal</Button>
          </CardContent>
        </Card>

        <Card>
           <CardHeader>
             <CardTitle>Important Information</CardTitle>
           </CardHeader>
           <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>• Withdrawals are processed within 24 hours.</p>
              <p>• Ensure your destination address is correct. Transactions cannot be reversed.</p>
              <p>• Minimum withdrawal amount: $50 USD equivalent.</p>
              <p>• Network fees may apply and will be deducted from the withdrawal amount.</p>
           </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Withdrawal History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No withdrawals found.</TableCell>
                 </TableRow>
              )}
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-mono text-xs">{tx.id}</TableCell>
                  <TableCell>{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{tx.asset}</TableCell>
                  <TableCell>{tx.amount}</TableCell>
                  <TableCell className="font-mono text-xs max-w-[150px] truncate">{tx.wallet_address}</TableCell>
                  <TableCell>
                    <Badge variant={tx.status === 'Approved' ? 'default' : tx.status === 'Pending' ? 'secondary' : 'destructive'}>
                      {tx.status}
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
