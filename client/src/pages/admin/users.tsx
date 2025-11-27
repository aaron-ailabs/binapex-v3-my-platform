import { db, User, Role, KYCStatus, MembershipTier, Bonus } from '@/lib/mock-data';
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
import { useToast } from '@/hooks/use-toast';

export default function UserManagement() {
  const { toast } = useToast();
  const { user: admin, token } = useAuth();
  const apiBase = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:5000/api';
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusNote, setBonusNote] = useState('');
  const [bonusExpire, setBonusExpire] = useState<string>('');
  const [overrideScore, setOverrideScore] = useState<number>(0);
  const [overrideReason, setOverrideReason] = useState<string>('');

  useEffect(() => {
    setUsers(db.getUsers());
  }, []);

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
                        <Button variant="ghost" size="icon" className="h-12 w-12" onClick={() => setSelectedUser(user)} aria-label={`Edit ${user.name}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
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
                                 <div className="grid grid-cols-2 gap-4 text-sm">
                                   <div>
                                     <div className="text-muted-foreground">Current</div>
                                     <div className="font-bold text-primary text-xl">{selectedUser.credit_score ?? 0}</div>
                                     <div className="text-xs text-muted-foreground">Updated: {selectedUser.credit_score_last_updated ? new Date(selectedUser.credit_score_last_updated).toLocaleString() : '-'}</div>
                                   </div>
                                   <div className="space-y-2">
                                     <Label>Manual Override</Label>
                                     <input type="range" min={0} max={1000} value={overrideScore} onChange={(e) => setOverrideScore(Number(e.target.value))} />
                                     <Input placeholder="Reason (required)" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
                                     <Button variant="outline" onClick={applyOverrideScore}>Apply Override</Button>
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
