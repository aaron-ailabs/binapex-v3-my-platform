import { useAuth } from '@/lib/auth';
import { db, Transaction } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fmtUSD } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, ArrowRight, Building2, Smartphone, Wallet } from 'lucide-react';
import { ReceiptModal } from '@/components/receipt-modal';

export default function Withdrawals() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  
  // Common State
  const [amount, setAmount] = useState('');
  const [withdrawalPassword, setWithdrawalPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  
  // Method Specific State
  const [method, setMethod] = useState('bank'); // bank, crypto, ewallet
  
  // Bank State
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  
  // Crypto State
  const [cryptoAsset, setCryptoAsset] = useState('USDT');
  const [network, setNetwork] = useState('TRC20');
  const [walletAddress, setWalletAddress] = useState('');
  
  // eWallet State
  const [ewalletProvider, setEwalletProvider] = useState('Touch n Go');
  const [ewalletAccount, setEwalletAccount] = useState('');

  const apiBase = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:5000/api';

  useEffect(() => {
    if (user) {
      setTransactions(db.getUserTransactions(user.id).filter(t => t.type === 'Withdrawal'));
    }
  }, [user]);

  // Calculations
  const usdAmount = Number(amount) || 0;
  const exchangeRate = 4.45; // USD to MYR
  const myrAmount = usdAmount * exchangeRate;
  
  const getFee = () => {
    if (method === 'crypto') {
      if (cryptoAsset === 'USDT' && network === 'ERC20') return 5; // $5 Gas
      if (cryptoAsset === 'USDT' && network === 'TRC20') return 1; // $1 Gas
      if (cryptoAsset === 'BTC') return 10;
      if (cryptoAsset === 'ETH') return 5;
    }
    return 0; // Bank and eWallet free for now
  };
  
  const finalAmount = usdAmount - getFee();

  const handleWithdraw = async () => {
    if (!user) return;
    
    // Validation
    if (usdAmount < 50) {
      toast({ variant: 'destructive', title: 'Minimum Amount', description: 'Minimum withdrawal is $50 USD.' });
      return;
    }
    
    if (!withdrawalPassword.trim()) {
      toast({ variant: 'destructive', title: 'Password Required', description: 'Please enter your withdrawal password.' });
      return;
    }

    if (method === 'crypto' && !twoFactorCode.trim()) {
      toast({ variant: 'destructive', title: '2FA Required', description: 'Please enter your 2FA code for crypto withdrawals.' });
      return;
    }

    let details = '';
    let destination = '';
    
    if (method === 'bank') {
      if (!bankName || !accountNumber) {
        toast({ variant: 'destructive', title: 'Missing Details', description: 'Please provide bank details.' });
        return;
      }
      details = `Bank: ${bankName}; Account: ${accountNumber}; MYR: ${myrAmount.toFixed(2)}`;
      destination = `${bankName} - ${accountNumber}`;
    } else if (method === 'crypto') {
      if (!walletAddress) {
        toast({ variant: 'destructive', title: 'Missing Address', description: 'Please provide wallet address.' });
        return;
      }
      
      const isNewAddress = !transactions.some(t => t.wallet_address === walletAddress && t.status === 'Approved');
      if (isNewAddress) {
         details += " [NEW ADDRESS - 24H HOLD]";
      }

      details = `Asset: ${cryptoAsset}; Network: ${network}; Address: ${walletAddress}`;
      destination = walletAddress;
    } else if (method === 'ewallet') {
      if (!ewalletAccount) {
        toast({ variant: 'destructive', title: 'Missing Details', description: 'Please provide eWallet account.' });
        return;
      }
      details = `Provider: ${ewalletProvider}; Account: ${ewalletAccount}; MYR: ${myrAmount.toFixed(2)}`;
      destination = `${ewalletProvider} - ${ewalletAccount}`;
    }

    if (usdAmount > 10000) {
       details += " [LARGE AMOUNT - MANUAL REVIEW]";
    }

    try {
      const res = await fetch(`${apiBase}/withdrawals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ 
          amount: usdAmount, 
          note: details, 
          destination,
          withdrawalPassword,
          twoFactorCode: method === 'crypto' ? twoFactorCode : undefined
        })
      });
      
      if (!res.ok) {
        let msg = 'Withdrawal failed.';
        try { const j = await res.json(); if (j?.message) msg = j.message; } catch {}
        toast({ variant: 'destructive', title: 'Withdrawal Error', description: msg });
        return;
      }
      
      const newTx: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        user_id: user.id,
        type: 'Withdrawal',
        asset: method === 'crypto' ? cryptoAsset : 'USD',
        amount: usdAmount,
        status: 'Pending',
        created_at: new Date().toISOString(),
        wallet_address: destination
      };
      
      db.addTransaction(newTx);
      setTransactions([newTx, ...transactions]);
      toast({ title: 'Withdrawal Requested', description: 'Your withdrawal is being processed.' });
      
      // Reset form
      setAmount('');
      setWithdrawalPassword('');
      // Keep other fields for convenience
      
    } catch {
      toast({ variant: 'destructive', title: 'Network Error', description: 'Please try again.' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Withdrawals</h1>
        <p className="text-muted-foreground">Securely withdraw your funds via Bank, Crypto, or e-Wallet.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Tabs defaultValue="bank" onValueChange={setMethod} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="bank" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Malaysian Bank
              </TabsTrigger>
              <TabsTrigger value="crypto" className="flex items-center gap-2">
                <Wallet className="w-4 h-4" /> Crypto Wallet
              </TabsTrigger>
              <TabsTrigger value="ewallet" className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" /> e-Wallet
              </TabsTrigger>
            </TabsList>

            {/* Malaysian Bank Tab */}
            <TabsContent value="bank">
              <Card>
                <CardHeader>
                  <CardTitle>Malaysian Bank Withdrawal</CardTitle>
                  <CardDescription>Withdraw directly to your local bank account.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label>Amount (USD)</Label>
                       <Input type="number" placeholder="Min 50.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                     </div>
                     <div className="space-y-2">
                       <Label>Receive (MYR)</Label>
                       <Input type="text" value={myrAmount > 0 ? `RM ${myrAmount.toFixed(2)}` : ''} disabled className="bg-muted" />
                       <p className="text-[10px] text-muted-foreground text-right">Rate: 1 USD ≈ {exchangeRate} MYR</p>
                     </div>
                   </div>
                   
                   <div className="space-y-2">
                     <Label>Bank Name</Label>
                     <Select value={bankName} onValueChange={setBankName}>
                       <SelectTrigger>
                         <SelectValue placeholder="Select Bank" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="Maybank">Maybank</SelectItem>
                         <SelectItem value="CIMB">CIMB Bank</SelectItem>
                         <SelectItem value="Public Bank">Public Bank</SelectItem>
                         <SelectItem value="RHB">RHB Bank</SelectItem>
                         <SelectItem value="Hong Leong">Hong Leong Bank</SelectItem>
                         <SelectItem value="AmBank">AmBank</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                   
                   <div className="space-y-2">
                     <Label>Account Number</Label>
                     <Input placeholder="Enter account number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                   </div>

                   <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-500">
                     <AlertCircle className="h-4 w-4" />
                     <AlertTitle>Processing Time</AlertTitle>
                     <AlertDescription>Bank withdrawals are typically processed within 24 hours.</AlertDescription>
                   </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Crypto Wallet Tab */}
            <TabsContent value="crypto">
              <Card>
                <CardHeader>
                  <CardTitle>Crypto Withdrawal</CardTitle>
                  <CardDescription>Withdraw USDT, BTC, or ETH to external wallet.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label>Asset</Label>
                       <Select value={cryptoAsset} onValueChange={setCryptoAsset}>
                         <SelectTrigger><SelectValue /></SelectTrigger>
                         <SelectContent>
                           <SelectItem value="USDT">USDT</SelectItem>
                           <SelectItem value="BTC">Bitcoin</SelectItem>
                           <SelectItem value="ETH">Ethereum</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                     <div className="space-y-2">
                       <Label>Network</Label>
                       <Select value={network} onValueChange={setNetwork} disabled={cryptoAsset !== 'USDT'}>
                         <SelectTrigger><SelectValue /></SelectTrigger>
                         <SelectContent>
                           <SelectItem value="TRC20">TRC20 (Tron)</SelectItem>
                           <SelectItem value="ERC20">ERC20 (Ethereum)</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Amount (USD)</Label>
                    <Input type="number" placeholder="Min 50.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Wallet Address</Label>
                    <Input placeholder={`Enter ${cryptoAsset} Address`} value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} />
                    <p className="text-[10px] text-destructive">Ensure the network matches. Incorrect addresses will result in loss of funds.</p>
                  </div>
                  
                  <div className="flex justify-between text-sm p-3 bg-muted rounded-md">
                     <span className="text-muted-foreground">Network Fee:</span>
                     <span>${getFee().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm p-3 bg-muted rounded-md mt-1 font-bold">
                     <span>Total Receive:</span>
                     <span>${(finalAmount > 0 ? finalAmount : 0).toFixed(2)}</span>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border mt-2">
                     <Label>2FA Code (Google Authenticator)</Label>
                     <Input 
                        placeholder="Enter 6-digit code" 
                        value={twoFactorCode} 
                        onChange={(e) => setTwoFactorCode(e.target.value)}
                        maxLength={6}
                     />
                     <p className="text-[10px] text-muted-foreground">Required for all crypto withdrawals.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* e-Wallet Tab */}
            <TabsContent value="ewallet">
              <Card>
                <CardHeader>
                  <CardTitle>e-Wallet Transfer</CardTitle>
                  <CardDescription>Instant transfer to TNG or Boost.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="space-y-2">
                     <Label>Provider</Label>
                     <Select value={ewalletProvider} onValueChange={setEwalletProvider}>
                       <SelectTrigger><SelectValue /></SelectTrigger>
                       <SelectContent>
                         <SelectItem value="Touch n Go">Touch 'n Go eWallet</SelectItem>
                         <SelectItem value="Boost">Boost</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                       <Label>Amount (USD)</Label>
                       <Input type="number" placeholder="Min 50.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                     </div>
                     <div className="space-y-2">
                       <Label>Receive (MYR)</Label>
                       <Input type="text" value={myrAmount > 0 ? `RM ${myrAmount.toFixed(2)}` : ''} disabled className="bg-muted" />
                     </div>
                   </div>

                   <div className="space-y-2">
                     <Label>Account Number / Phone</Label>
                     <Input placeholder="e.g. +60123456789" value={ewalletAccount} onChange={(e) => setEwalletAccount(e.target.value)} />
                   </div>

                   <Alert className="bg-green-500/10 border-green-500/20 text-green-500">
                     <Smartphone className="h-4 w-4" />
                     <AlertTitle>Instant Transfer</AlertTitle>
                     <AlertDescription>e-Wallet withdrawals are processed within 5 minutes.</AlertDescription>
                   </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Common Footer / Submit */}
          <Card className="mt-6">
            <CardContent className="pt-6 space-y-4">
               <div className="space-y-2">
                  <Label>Withdrawal Password</Label>
                  <Input 
                    type="password" 
                    placeholder="Enter your security password" 
                    value={withdrawalPassword} 
                    onChange={(e) => setWithdrawalPassword(e.target.value)} 
                  />
               </div>
               <Button className="w-full" size="lg" onClick={handleWithdraw}>
                 Confirm Withdrawal Request
                 <ArrowRight className="w-4 h-4 ml-2" />
               </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card>
             <CardHeader>
               <CardTitle>Withdrawal Limits</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4 text-sm">
                <div className="flex justify-between py-2 border-b">
                   <span className="text-muted-foreground">Minimum</span>
                   <span className="font-medium">$50.00</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                   <span className="text-muted-foreground">Daily Limit</span>
                   <span className="font-medium">$50,000.00</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                   <span className="text-muted-foreground">Monthly Limit</span>
                   <span className="font-medium">Uncapped</span>
                </div>
             </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.slice(0, 5).map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs">{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right font-medium">{fmtUSD(tx.amount)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={tx.status === 'Approved' ? 'default' : tx.status === 'Pending' ? 'secondary' : 'destructive'} className="text-[10px] h-5 px-1">
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(tx.wallet_address?.includes('Touch') || tx.wallet_address?.includes('Boost')) && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={() => {
                              setSelectedTx(tx);
                              setReceiptOpen(true);
                            }}
                          >
                            <Wallet className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {transactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground text-xs">No history</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="p-4 pt-2">
                <Button variant="ghost" className="w-full text-xs h-8" size="sm">View All History</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <ReceiptModal 
        transaction={selectedTx} 
        open={receiptOpen} 
        onOpenChange={setReceiptOpen} 
      />
    </div>
  );
}
