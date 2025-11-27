import { db, User, Role, KYCStatus, MembershipTier, Bonus, Wallet } from '@/lib/mock-data';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { Search, Edit } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Slider } from '@/components/ui/slider';
import { toUSD, fmtUSD } from '@/lib/utils';

export default function UserManagement() {
  const { toast } = useToast();
  const { user: admin, token } = useAuth();
  const apiBase = (import.meta.env.VITE_API_BASE as string) || '/api';
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusNote, setBonusNote] = useState('');
  const [bonusExpire, setBonusExpire] = useState<string>('');
  const [overrideScore, setOverrideScore] = useState<number>(0);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(false);
  

  useEffect(() => {
    setUsers(db.getUsers());
  }, []);

  

  useEffect(() => {
    if (!selectedUser) {
      setWallets([]);
      setWalletsLoading(false);
      return;
    }
    setWalletsLoading(true);
    try { setWallets(db.getUserWallets(selectedUser.id)); } finally { setWalletsLoading(false); }
    const id = window.setInterval(() => {
      try { setWallets(db.getUserWallets(selectedUser.id)); } catch {}
    }, 2000);
    return () => { window.clearInterval(id); };
  }, [selectedUser]);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleUpdateUser = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const original = users.find(u => u.id === selectedUser.id);
    const membershipChanged = original && original.membership_tier !== selectedUser.membership_tier;
    db.updateUser(selectedUser);
    setUsers(db.getUsers()); // Refresh
    setSelectedUser(null);
    toast({ title: 'User Updated', description: 'User details saved successfully.' });
    if (membershipChanged && admin) {
      db.addAdminLog({ id: Math.random().toString(36).slice(2,9), admin_id: admin.id, user_id: original!.id, action: 'membership_change', details: `Changed tier from ${original!.membership_tier} to ${selectedUser.membership_tier}`, timestamp: new Date().toISOString() });
    }
  };

  const handleAllocateBonus = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !admin) return;
    const amount = Number(bonusAmount);
    if (!amount || amount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid amount' });
      return;
    }
    const bonus: Bonus = {
      id: Math.random().toString(36).slice(2,9),
      user_id: selectedUser.id,
      amount,
      type: 'manual',
      status: 'active',
      assigned_by: admin.id,
      assigned_at: new Date().toISOString(),
      expires_at: bonusExpire || undefined,
      notes: bonusNote || undefined,
    };
    db.addBonus(bonus);
    db.addAdminLog({ id: Math.random().toString(36).slice(2,9), admin_id: admin.id, user_id: selectedUser.id, action: 'bonus_allocation', details: `Manual bonus ${amount} allocated`, timestamp: new Date().toISOString() });
    setBonusAmount(''); setBonusNote(''); setBonusExpire('');
    toast({ title: 'Bonus Allocated', description: `Bonus added to ${selectedUser.email}` });
  };

  const recalcCreditScore = () => {
    if (!selectedUser) return;
    const txs = db.getUserTransactions(selectedUser.id).filter(t => t.type === 'Deposit' && t.status !== 'Rejected');
    const trades = db.getUserTrades(selectedUser.id);
    const totalDeposits = txs.reduce((s, t) => s + (t.asset === 'USD' ? t.amount : t.asset === 'BTC' ? t.amount * 50000 : t.amount), 0);
    const depositFrequencyScore = Math.min(100, txs.length * 10);
    const tradingFrequencyScore = Math.min(100, trades.length * 5);
    const base = 400 + Math.min(400, Math.log10(1 + totalDeposits) * 100) + depositFrequencyScore + tradingFrequencyScore;
    const credit_score = Math.max(0, Math.min(1000, Math.round(base)));
    const updated: User = { ...selectedUser, credit_score, credit_score_last_updated: new Date().toISOString(), total_deposits: Math.round(totalDeposits*100)/100, total_trades: trades.length, deposit_frequency_score: depositFrequencyScore, trading_frequency_score: tradingFrequencyScore };
    setSelectedUser(updated);
    db.updateUser(updated);
  };

  const applyOverrideScore = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !admin) return;
    if (!overrideReason.trim()) {
      toast({ variant: 'destructive', title: 'Reason required', description: 'Provide a reason for manual adjustment.' });
      return;
    }
    try {
      const r = await fetch(`${apiBase}/admin/credit-score/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ userId: selectedUser.id, score: overrideScore, reason: overrideReason })
      });
      if (!r.ok) throw new Error('Failed to update');
      const d = await r.json();
      const updated: User = { ...selectedUser, credit_score: d.score, credit_score_last_updated: new Date(d.lastUpdated).toISOString() };
      setSelectedUser(updated);
      db.updateUser(updated);
      toast({ title: 'Credit Score Updated', description: `Set to ${d.score}` });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update credit score.' });
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="flex items-center justify-between sm:flex-row sm:items-center sm:justify-between flex-col gap-3 stack-sm">
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <div className="relative w-full sm:w-64">
           <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
           <Input 
             placeholder="Search users..." 
             className="pl-8 h-12" 
             aria-label="Search users" 
             value={search}
             onChange={e => setSearch(e.target.value)}
           />
        </div>
      </div>

      <Card className="mobile-container">
        <CardContent className="p-0">
          <Table className="sm:text-sm text-xs sm:table-auto table-fixed mobile-table">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>KYC Status</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium text-wrap">{user.name}</TableCell>
                  <TableCell className="text-wrap max-w-[180px] sm:max-w-none">{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                     <Badge variant={user.kyc_status === 'Approved' ? 'default' : 'outline'}>
                        {user.kyc_status}
                     </Badge>
                  </TableCell>
                  <TableCell>{user.membership_tier}</TableCell>
                  <TableCell className="text-right">
                    <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
                      <DialogTrigger asChild>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-12 w-12 md:h-10 md:w-10 rounded-full hover:bg-primary/10 focus-visible:ring-2"
                                onClick={() => setSelectedUser(user)}
                                aria-label={`Edit ${user.name}`}
                                title={`Edit ${user.name}`}
                              >
                                <Edit className="h-5 w-5 md:h-4 md:w-4" aria-hidden="true" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Edit {user.name}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </DialogTrigger>
                      {selectedUser && selectedUser.id === user.id && (
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit User: {user.name}</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleUpdateUser} className="space-y-6 py-4">
                             <div className="space-y-2">
                                <Label>Role</Label>
                                <Select 
                                  value={selectedUser.role} 
                                  onValueChange={(val: Role) => setSelectedUser({...selectedUser, role: val})}
                                >
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Trader">Trader</SelectItem>
                                    <SelectItem value="Admin">Admin</SelectItem>
                                    <SelectItem value="Customer Service">Customer Service</SelectItem>
                                  </SelectContent>
                                </Select>
                             </div>
                             <div className="space-y-2">
                                <Label>KYC Status</Label>
                                <Select 
                                  value={selectedUser.kyc_status} 
                                  onValueChange={(val: KYCStatus) => setSelectedUser({...selectedUser, kyc_status: val})}
                                >
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Not Started">Not Started</SelectItem>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="Approved">Approved</SelectItem>
                                    <SelectItem value="Rejected">Rejected</SelectItem>
                                  </SelectContent>
                                </Select>
                             </div>
                             <div className="space-y-2">
                                <Label>Membership Tier</Label>
                                <Select 
                                  value={selectedUser.membership_tier} 
                                  onValueChange={(val: MembershipTier) => setSelectedUser({...selectedUser, membership_tier: val})}
                                >
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Silver">Silver</SelectItem>
                                    <SelectItem value="Gold">Gold</SelectItem>
                                    <SelectItem value="Platinum">Platinum</SelectItem>
                                  </SelectContent>
                                </Select>
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-2">
                                 <Label>Phone</Label>
                                 <Input value={selectedUser.phone || ''} onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })} />
                               </div>
                               <div className="space-y-2">
                                 <Label>Bank Name</Label>
                                 <Input value={selectedUser.bank_account?.bank_name || ''} onChange={(e) => setSelectedUser({ ...selectedUser, bank_account: { ...(selectedUser.bank_account || { bank_name: '', account_number: '' }), bank_name: e.target.value } })} />
                               </div>
                               <div className="space-y-2 col-span-2">
                                 <Label>Bank Account Number</Label>
                                 <Input value={selectedUser.bank_account?.account_number || ''} onChange={(e) => setSelectedUser({ ...selectedUser, bank_account: { ...(selectedUser.bank_account || { bank_name: '', account_number: '' }), account_number: e.target.value } })} />
                               </div>
                             </div>
                             {selectedUser && (
                               <div className="space-y-3 border-t pt-4">
                                 <Label>Credit Score</Label>
                                <div className="space-y-2 text-sm">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                                    <div className="md:col-span-1 space-y-1">
                                      <div className="text-muted-foreground">Current</div>
                                      <div className="font-bold text-primary text-xl">{selectedUser.credit_score ?? 0}</div>
                                      <div className="text-xs text-muted-foreground">Updated: {selectedUser.credit_score_last_updated ? new Date(selectedUser.credit_score_last_updated).toLocaleString() : '-'}</div>
                                    </div>
                                    <div className="md:col-span-2 space-y-1">
                                      <Label>Manual Override</Label>
                                      <Slider className="touch-manipulation h-12 md:h-8 [&_[data-radix-collection-item]]:h-12 [&_[data-radix-collection-item]]:w-12 md:[&_[data-radix-collection-item]]:h-6 md:[&_[data-radix-collection-item]]:w-6" value={[overrideScore]} min={0} max={1000} step={1} onValueChange={(v) => setOverrideScore(Math.max(0, Math.min(1000, Number(v[0] || 0))))} />
                                      <div className="grid grid-cols-3 gap-3 items-center">
                                        <Input inputMode="numeric" pattern="[0-9]*" placeholder="Score" value={String(overrideScore)} onChange={(e) => setOverrideScore(Math.max(0, Math.min(1000, Number(e.target.value || 0))))} />
                                        <Input placeholder="Reason (required)" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
                                        <Button type="button" className="h-12 md:h-9" variant="outline" onClick={applyOverrideScore}>Apply</Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                 <div className="grid grid-cols-2 gap-4 text-xs">
                                   <div>Total Deposits: ${selectedUser.total_deposits ?? 0}</div>
                                   <div>Total Trades: {selectedUser.total_trades ?? 0}</div>
                                   <div>Deposit Frequency Score: {selectedUser.deposit_frequency_score ?? 0}</div>
                                   <div>Trading Frequency Score: {selectedUser.trading_frequency_score ?? 0}</div>
                                 </div>
                                <Button type="button" variant="secondary" onClick={recalcCreditScore}>Recalculate</Button>
                               </div>
                             )}
                             {selectedUser && (
                               <div className="space-y-3 border-t pt-4">
                                 <Label>Wallets</Label>
                                 <div className="text-xs text-muted-foreground">Current account balances</div>
                                 <Table>
                                   <TableHeader>
                                     <TableRow>
                                       <TableHead>Asset</TableHead>
                                       <TableHead>Balance</TableHead>
                                     </TableRow>
                                   </TableHeader>
                                   <TableBody>
                                     {walletsLoading && (
                                       <TableRow><TableCell colSpan={2}>Loading...</TableCell></TableRow>
                                     )}
                                     {!walletsLoading && wallets.map(w => (
                                       <TableRow key={w.id}>
                                         <TableCell>{w.asset_name}</TableCell>
                                         <TableCell>{fmtUSD(toUSD(w.asset_name, w.balance))}</TableCell>
                                       </TableRow>
                                     ))}
                                   </TableBody>
                                 </Table>
                                 <div className="text-xs">Total USD: {fmtUSD(wallets.reduce((s, w) => s + toUSD(w.asset_name, w.balance), 0))}</div>
                               </div>
                             )}
                             {selectedUser && (
                               <div className="space-y-3 border-t pt-4">
                                 <Label>Allocate Bonus</Label>
                                 <div className="grid grid-cols-3 gap-3">
                                   <Input placeholder="Amount" type="number" value={bonusAmount} onChange={(e) => setBonusAmount(e.target.value)} />
                                   <Input placeholder="Note" value={bonusNote} onChange={(e) => setBonusNote(e.target.value)} />
                                   <Input placeholder="Expires At (ISO)" value={bonusExpire} onChange={(e) => setBonusExpire(e.target.value)} />
                                 </div>
                                 <Button type="button" onClick={handleAllocateBonus}>Add Bonus</Button>
                                 <div className="text-xs text-muted-foreground">Recent Bonuses:</div>
                                 <div className="max-h-24 overflow-y-auto text-xs">
                                   {db.getUserBonuses(selectedUser.id).slice(0,5).map(b => (
                                     <div key={b.id} className="flex justify-between"><span>{b.type}</span><span>${b.amount}</span><span>{b.status}</span></div>
                                   ))}
                                 </div>
                               </div>
                             )}
                            <div className="space-y-2 border-t pt-3">
                              <Label id="label-user-payout">User Payout Percentage</Label>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                                <div className="md:col-span-2 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <div className="text-xs text-muted-foreground" id="desc-user-payout">Override payout for this user</div>
                                    <div className="text-sm font-medium" aria-live="polite">{Math.round(selectedUser.payout_percentage ?? 0)}%</div>
                                  </div>
                                  <Slider aria-labelledby="label-user-payout" aria-describedby="desc-user-payout" className="touch-manipulation h-12 md:h-8 [&_[data-radix-collection-item]]:h-12 [&_[data-radix-collection-item]]:w-12 md:[&_[data-radix-collection-item]]:h-6 md:[&_[data-radix-collection-item]]:w-6" value={[selectedUser.payout_percentage ?? 0]} onValueChange={(v) => setSelectedUser({ ...selectedUser, payout_percentage: Math.max(0, Math.min(100, Number(v[0] || 0))) })} min={0} max={100} step={1} />
                                </div>
                                <div className="space-y-1">
                                  <Input aria-label="Payout percentage" inputMode="numeric" pattern="[0-9]*" placeholder="%" value={String(Math.round(selectedUser.payout_percentage ?? 0))} onChange={(e) => setSelectedUser({ ...selectedUser, payout_percentage: Math.max(0, Math.min(100, Number(e.target.value || 0))) })} />
                                  <Button aria-label="Save user payout" type="button" className="h-12 md:h-9" onClick={async () => {
                                    if (!token) { toast({ variant: 'destructive', title: 'Unauthorized', description: 'Login token required.' }); return; }
                                    const pct = Math.round(selectedUser.payout_percentage ?? 0);
                                    const r = await fetch(`${apiBase}/admin/users/payout`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ userId: selectedUser.id, payoutPct: pct, reason: overrideReason }) });
                                    if (!r.ok) { toast({ variant: 'destructive', title: 'Save failed', description: `${r.status}` }); return; }
                                    const data = await r.json().catch(() => null);
                                    const val = typeof data?.payoutPct === 'number' ? Number(data.payoutPct) : pct;
                                    setSelectedUser({ ...selectedUser, payout_percentage: val });
                                    toast({ title: 'User Payout Updated', description: `${Math.round(val)}%` });
                                  }}>Save</Button>
                                </div>
                              </div>
                              <Input aria-label="Reason (optional)" placeholder="Reason (optional)" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
                            </div>

                             <Button type="submit" className="w-full">Save Changes</Button>
                          </form>
                        </DialogContent>
                      )}
                    </Dialog>
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
