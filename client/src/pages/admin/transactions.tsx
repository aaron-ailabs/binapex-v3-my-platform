import { db, Transaction, DepositSettings, EngineSettings } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toUSD, fmtUSD } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TransactionOversight() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<DepositSettings | null>(null);
  const [engine, setEngine] = useState<EngineSettings | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const apiBase = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:5000/api';

  useEffect(() => {
    setTransactions(db.getTransactions().filter(t => t.status === 'Pending'));
    setSettings(db.getDepositSettings());
    setEngine(db.getEngineSettings());
    if (typeof window !== 'undefined' && window.location.search.includes('tab=funding')) {
      setTimeout(() => settingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  }, []);

  const handleQrUpload = async (file?: File) => {
    try {
      if (!file || !settings) return;
      const allowed = ['image/png', 'image/jpeg'];
      if (!allowed.includes(file.type)) {
        toast({ variant: 'destructive', title: 'Invalid file type', description: 'Only PNG or JPEG allowed.' });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ variant: 'destructive', title: 'File too large', description: 'Max 5MB.' });
        return;
      }
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      const res = await fetch(`${apiBase}/chat/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, mimeType: file.type, contentBase64: base64 })
      });
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Upload failed', description: 'Please try again.' });
        return;
      }
      const data = await res.json();
      const url = `${apiBase.replace(/\/$/, '')}/chat/file/${String(data.id || '').trim()}`;
      const next = { ...settings, qr_code_url: url } as DepositSettings;
      setSettings(next);
      db.updateDepositSettings(next);
      toast({ title: 'QR Code Updated', description: 'QR image uploaded successfully.' });
    } catch {
      toast({ variant: 'destructive', title: 'Upload error', description: 'Please try again.' });
    }
  };

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

      <Card ref={settingsRef as any} id="funding">
        <CardHeader>
          <CardTitle>Deposit Settings (Malaysia)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input value={settings.bank.bank_name} onChange={(e) => setSettings({ ...settings, bank: { ...settings.bank, bank_name: e.target.value } })} />
              </div>
              <div className="space-y-2">
                <Label>Account Name</Label>
                <Input value={settings.bank.account_name} onChange={(e) => setSettings({ ...settings, bank: { ...settings.bank, account_name: e.target.value } })} />
              </div>
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input value={settings.bank.account_number} onChange={(e) => setSettings({ ...settings, bank: { ...settings.bank, account_number: e.target.value } })} />
              </div>
              <div className="space-y-2">
                <Label>eWallet Provider</Label>
                <Input value={settings.ewallet.provider} onChange={(e) => setSettings({ ...settings, ewallet: { ...settings.ewallet, provider: e.target.value } })} />
              </div>
              <div className="space-y-2">
                <Label>eWallet Account ID</Label>
                <Input value={settings.ewallet.account_id} onChange={(e) => setSettings({ ...settings, ewallet: { ...settings.ewallet, account_id: e.target.value } })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>QR Code</Label>
                <div className="flex items-center gap-3">
                  <Input type="file" accept="image/png,image/jpeg" onChange={(e) => handleQrUpload(e.target.files?.[0])} className="max-w-[260px]" />
                  {settings.qr_code_url ? (
                    <img src={settings.qr_code_url} alt="QR" className="h-16 w-16 rounded border border-white/10 object-cover" />
                  ) : null}
                </div>
                {settings.qr_code_url ? (
                  <a href={settings.qr_code_url} target="_blank" className="text-xs underline text-muted-foreground">Open current QR</a>
                ) : (
                  <div className="text-xs text-muted-foreground">No QR uploaded yet</div>
                )}
              </div>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label>Spread (bps)</Label>
              <Input type="number" value={engine?.spreadBps ?? 0} onChange={(e) => setEngine(_prev => ({ spreadBps: Number(e.target.value || 0) }))} />
            </div>
          </div>
          <div className="flex justify-end mt-4 gap-2">
            <Button variant="outline" onClick={() => { if (engine) { db.updateEngineSettings(engine); toast({ title: 'Engine Updated', description: 'Spread configuration saved.' }); } }}>Save Engine</Button>
            <Button onClick={() => { 
              if (settings) { 
                const acct = settings.bank.account_number.replace(/\D/g, '');
                if (acct.length < 10 || acct.length > 16) { 
                  toast({ variant: 'destructive', title: 'Invalid Account Number', description: 'Provide a valid Malaysian bank account number.' });
                  return; 
                }
                db.updateDepositSettings({ 
                  ...settings, 
                  bank: { ...settings.bank, account_number: acct }
                }); 
                toast({ title: 'Settings Saved', description: 'Deposit channels updated.' }); 
              } 
            }}>Save Settings</Button>
          </div>
        </CardContent>
      </Card>

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
