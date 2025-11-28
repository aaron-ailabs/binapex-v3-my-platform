import { useAuth } from '@/lib/auth';
import { db, Transaction, DepositSettings } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toUSD, fmtUSD } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';

export default function Deposits() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [asset, setAsset] = useState('USD');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [depositSettings, setDepositSettings] = useState<DepositSettings | null>(null);

  useEffect(() => {
    if (user) {
      setTransactions(db.getUserTransactions(user.id).filter(t => t.type === 'Deposit'));
    }
    setDepositSettings(db.getDepositSettings());
  }, [user]);

  const handleDeposit = () => {
    if (!amount || !user) return;
    
    const newTx: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      user_id: user.id,
      type: 'Deposit',
      asset,
      amount: Number(amount),
      status: 'Pending',
      created_at: new Date().toISOString()
    };
    
    db.addTransaction(newTx);
    setTransactions([newTx, ...transactions]);
    toast({ title: 'Deposit Submitted', description: 'Your deposit is pending approval.' });
    setAmount('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Deposits</h1>
        <p className="text-muted-foreground">Fund your account securely.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>New Deposit</CardTitle>
            <CardDescription>Select asset and amount to deposit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Asset</Label>
              <Select value={asset} onValueChange={setAsset}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD (Bank Transfer MYR)</SelectItem>
                  <SelectItem value="BTC">Bitcoin</SelectItem>
                  <SelectItem value="ETH">Ethereum</SelectItem>
                  <SelectItem value="USDT">USDT (TRC20)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Amount ( MYR )</Label>
              <Input 
                type="number" 
                placeholder="1000" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <Label>Proof of Payment</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 flex flex-col items-center justify-center text-muted-foreground hover:bg-accent/5 cursor-pointer transition-colors">
                 <Upload className="w-8 h-8 mb-2" />
                 <span className="text-sm">Click to upload or drag and drop</span>
                 <span className="text-xs">(JPG, PNG, PDF max 5MB)</span>
              </div>
            </div>

            <Button className="w-full" onClick={handleDeposit}>Submit Deposit</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deposit Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
             <p>1. Select the asset you wish to deposit.</p>
             <p>2. Send the funds to the dedicated wallet address provided (Crypto) or Bank/eWallet (Fiat MYR).</p>
             <p>3. Upload a screenshot or PDF receipt of the transaction.</p>
             <p>4. Our team will verify and credit your account within 24 hours.</p>

             {depositSettings && (
               <div className="bg-muted p-4 rounded-md mt-4 space-y-3">
                 <p className="font-bold text-foreground mb-1">Bank Transfer (MYR):</p>
                 <p>Bank: {depositSettings.bank.bank_name}</p>
                 <p>Account Name: {depositSettings.bank.account_name}</p>
                 <p>Account Number: {depositSettings.bank.account_number}</p>

                 <div className="h-px bg-border my-2" />

                 <p className="font-bold text-foreground mb-1">eWallet (Malaysia):</p>
                 <p>Provider: {depositSettings.ewallet.provider}</p>
                 <p>Account ID: {depositSettings.ewallet.account_id}</p>

                 {depositSettings.qr_code_url && (
                   <div className="mt-3">
                     <p className="font-bold text-foreground mb-2">QR Pay:</p>
                    <img src={depositSettings.qr_code_url} alt="QR Code" className="w-40 h-40 rounded border" loading="lazy" decoding="async" />
                   </div>
                 )}
               </div>
             )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deposit History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No deposits found.</TableCell>
                 </TableRow>
              )}
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-mono text-xs">{tx.id}</TableCell>
                  <TableCell>{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{tx.asset}</TableCell>
                  <TableCell>{fmtUSD(toUSD(tx.asset, tx.amount))}</TableCell>
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
