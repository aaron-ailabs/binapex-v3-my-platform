import { db, User, Role, KYCStatus, MembershipTier, Bonus, Wallet } from '@/lib/mock-data';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PayoutControl from '@/components/admin/PayoutControl';
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusNote, setBonusNote] = useState('');
  const [bonusExpire, setBonusExpire] = useState<string>('');
  const [overrideScore, setOverrideScore] = useState<number>(0);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(false);
  const [traderQuery, setTraderQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editPct, setEditPct] = useState<Record<string, number>>({});
  const [bulkPct, setBulkPct] = useState<string>('');
  const [bulkReason, setBulkReason] = useState<string>('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ ids: string[]; pct?: number } | null>(null);
  const [simAmount, setSimAmount] = useState<string>('');
  const [simPct, setSimPct] = useState<number>(85);
  

  useEffect(() => {
    const apiBase = (import.meta.env.VITE_API_BASE as string) || '/api';
    const load = async () => {
      try {
        if (!token) { setLoading(false); return; }
        const r = await fetch(`${apiBase}/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
        const list = await r.json().catch(() => []);
        const mapped: User[] = Array.isArray(list) ? list.map((u: any) => ({ id: String(u.id), email: String(u.username), name: String(u.username || '').includes('@') ? String(u.username).split('@')[0] : String(u.username), role: String(u.role) as any, kyc_status: String(u.kycStatus) as any, membership_tier: String(u.membershipTier) as any, payout_percentage: typeof u.payoutPct === 'number' ? Number(u.payoutPct) : undefined })) : [];
        setUsers(mapped);
      } catch {
        setUsers(db.getUsers());
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  

  useEffect(() => {
    if (!selectedUser) {
      setWallets([]);
      setWalletsLoading(false);
      return;
    }
    setWalletsLoading(true);
    try { setWallets(db.getUserWallets(selectedUser.id)); } finally { setWalletsLoading(false); }
    const pollMs = window.matchMedia('(max-width: 640px)').matches ? 4000 : 2000;
    const id = window.setInterval(() => {
      try { setWallets(db.getUserWallets(selectedUser.id)); } catch {}
    }, pollMs);
    return () => { window.clearInterval(id); };
  }, [selectedUser]);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const traders = users.filter(u => String(u.role) === 'Trader');
  const filteredTraders = traders.filter(u => 
    u.name.toLowerCase().includes(traderQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(traderQuery.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const saveSinglePct = async (userId: string) => {
    if (!token) { toast({ variant: 'destructive', title: 'Unauthorized', description: 'Admin token required.' }); return; }
    const u = users.find(x => x.id === userId);
    if (!u) return;
    const current = Math.max(0, Math.min(100, Number(u.payout_percentage ?? 0)));
    const pct = Math.round(Math.max(0, Math.min(100, Number(editPct[userId] ?? current))));
    try {
      const r = await fetch(`${apiBase}/admin/users/payout`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ userId, payoutPct: pct, reason: overrideReason || 'admin_update' }) });
      if (!r.ok) { toast({ variant: 'destructive', title: 'Save failed', description: `${r.status}` }); return; }
      const data = await r.json().catch(() => null);
      const val = typeof data?.payoutPct === 'number' ? Number(data.payoutPct) : pct;
      setUsers(prev => prev.map(x => x.id === userId ? { ...x, payout_percentage: val } as any : x));
      toast({ title: 'Payout Updated', description: `${Math.round(val)}% for ${u.email}` });
    } catch {
      toast({ variant: 'destructive', title: 'Network error' });
    }
  };

  const openConfirmBulk = () => {
    const ids = selectedIds.slice();
    if (!ids.length) { toast({ variant: 'destructive', title: 'No traders selected' }); return; }
    const pct = bulkPct ? Math.round(Math.max(0, Math.min(100, Number(bulkPct)))) : undefined;
    setConfirmTarget({ ids, pct });
    setConfirmOpen(true);
  };

  const applyBulk = async () => {
    if (!token || !confirmTarget) return;
    const items = confirmTarget.ids.map(id => {
      const u = users.find(x => x.id === id);
      const current = Math.max(0, Math.min(100, Number(u?.payout_percentage ?? 0)));
      const next = typeof confirmTarget.pct === 'number' ? confirmTarget.pct : Math.round(Math.max(0, Math.min(100, Number(editPct[id] ?? current))));
      return { userId: id, payoutPct: next, reason: bulkReason || 'bulk_update' };
    });
    try {
      const r = await fetch(`${apiBase}/admin/users/payout/bulk`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ items }) });
      if (!r.ok) { toast({ variant: 'destructive', title: 'Bulk failed', description: `${r.status}` }); return; }
      const d = await r.json().catch(() => null);
      const results = Array.isArray(d?.results) ? d.results : [];
      setUsers(prev => prev.map(x => {
        const m = results.find((r: any) => r.userId === x.id && r.ok);
        return m ? { ...x, payout_percentage: Number(m.payoutPct) } as any : x;
      }));
      setConfirmOpen(false);
      setSelectedIds([]);
      setBulkPct('');
      setBulkReason('');
      toast({ title: 'Bulk Update Applied', description: `${results.filter((r: any) => r.ok).length} updated` });
    } catch {
      toast({ variant: 'destructive', title: 'Network error' });
    }
  };

  const handleUpdateUser = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const original = users.find(u => u.id === selectedUser.id);
    const membershipChanged = original && original.membership_tier !== selectedUser.membership_tier;
    setUsers(prev => prev.map(u => u.id === selectedUser.id ? selectedUser : u));
    setSelectedUser(null);
    toast({ title: 'User Updated', description: 'User details saved successfully.' });
    if (membershipChanged && admin) {
      // no-op
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
      toast({ title: 'Credit Score Updated', description: `Set to ${d.score}` });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update credit score.' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between sm:flex-row sm:items-center sm:justify-between flex-col gap-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-12 w-64" />
        </div>
        <Skeleton className="h-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between sm:flex-row sm:items-center sm:justify-between flex-col gap-3">
        <h1 className="text-2xl font-semibold">User Management</h1>
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
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Trader Profit Percentage Control</div>
              <div className="text-xs text-muted-foreground">Admin-only</div>
            </div>
            <div className="text-xs text-muted-foreground">Return = stake + stake × percentage ÷ 100. Example: $200 at 18% → $236.</div>
            <div className="grid sm:grid-cols-3 gap-3 items-end">
              <div className="sm:col-span-2">
                <Label>Search Traders</Label>
                <Input placeholder="Search by name or email" value={traderQuery} onChange={e => setTraderQuery(e.target.value)} />
              </div>
              <div>
                <Label>Bulk Percentage</Label>
                <Input inputMode="numeric" pattern="[0-9]*" placeholder="%" value={bulkPct} onChange={e => setBulkPct(e.target.value)} />
              </div>
            </div>
          <div className="grid sm:grid-cols-3 gap-3 items-end">
            <div className="sm:col-span-2">
              <Label>Reason</Label>
              <Input placeholder="Optional" value={bulkReason} onChange={e => setBulkReason(e.target.value)} />
            </div>
            <div>
              <Button type="button" onClick={openConfirmBulk}>Apply to Selected</Button>
            </div>
          </div>
          {confirmOpen && confirmTarget && confirmTarget.ids.length > 1 && (
            <Dialog open={confirmOpen} onOpenChange={(open) => setConfirmOpen(open)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Bulk Update</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 text-sm">
                  <div>Updating {confirmTarget.ids.length} traders</div>
                  {typeof confirmTarget.pct === 'number' ? (
                    <div>Set percentage to {Math.round(confirmTarget.pct)}% for all selected</div>
                  ) : (
                    <div>Use per-row new percentage values</div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                  <Button type="button" onClick={async () => { await applyBulk(); }}>Confirm</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
            <Table className="sm:text-sm text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Select</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Current %</TableHead>
                  <TableHead>New %</TableHead>
                  <TableHead>Δ</TableHead>
                  <TableHead className="text-right">Save</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTraders.map(u => {
                  const current = Math.max(0, Math.min(100, Number(u.payout_percentage ?? 0)));
                  const next = Math.max(0, Math.min(100, Number(editPct[u.id] ?? current)));
                  const delta = Math.round(next - current);
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <input aria-label={`Select ${u.email}`} type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => toggleSelect(u.id)} />
                      </TableCell>
                      <TableCell className="font-medium text-wrap">{u.name}</TableCell>
                      <TableCell className="text-wrap max-w-[180px] sm:max-w-none">{u.email}</TableCell>
                      <TableCell>{current}%</TableCell>
                      <TableCell>
                        <Input aria-label="New percentage" inputMode="numeric" pattern="[0-9]*" placeholder="%" value={String(next)} onChange={e => setEditPct(p => ({ ...p, [u.id]: Math.max(0, Math.min(100, Number(e.target.value || 0))) }))} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={delta >= 0 ? 'default' : 'outline'}>{delta >= 0 ? `+${delta}%` : `${delta}%`}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog open={confirmOpen && !!confirmTarget && confirmTarget.ids.length === 1 && confirmTarget.ids[0] === u.id} onOpenChange={(open) => setConfirmOpen(open)}>
                          <DialogTrigger asChild>
                            <Button type="button" variant="outline" onClick={() => { setConfirmTarget({ ids: [u.id], pct: Math.round(next) }); setConfirmOpen(true); }}>Save</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Confirm Update</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-2 text-sm">
                              <div>{u.email}</div>
                              <div>Set percentage to {Math.round(next)}%</div>
                              <div className="grid grid-cols-3 gap-3 items-end">
                                <Input placeholder="Amount" inputMode="numeric" value={simAmount} onChange={e => setSimAmount(e.target.value)} />
                                <Input placeholder="%" inputMode="numeric" value={String(simPct)} onChange={e => setSimPct(Math.max(0, Math.min(100, Number(e.target.value || 0))))} />
                                <div className="text-xs text-muted-foreground">
                                  {(() => { const a = Number(simAmount || 0); const p = Math.round(simPct); const profit = Math.round((a * p) / 100); const ret = a + profit; return a > 0 ? `Profit ${profit}, Return ${ret}` : 'Enter amount to simulate'; })()}
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                              <Button type="button" onClick={async () => { setConfirmOpen(false); await saveSinglePct(u.id); }}>Confirm</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
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
                        <DialogContent className="sm:max-w-2xl w-[96vw] sm:w-auto max-h-[85vh] overflow-y-auto rounded-none sm:rounded-lg p-0">
                          <DialogHeader>
                            <DialogTitle>Edit User: {user.name}</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleUpdateUser} className="space-y-6 p-4 sm:p-6">
                             <div className="space-y-2">
                                <Label>Role</Label>
                                <Select 
                                  value={selectedUser.role} 
                                  onValueChange={(val: Role) => setSelectedUser({...selectedUser, role: val})}
                                >
                                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
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
                                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
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
                                  <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Silver">Silver</SelectItem>
                                    <SelectItem value="Gold">Gold</SelectItem>
                                    <SelectItem value="Platinum">Platinum</SelectItem>
                                  </SelectContent>
                                </Select>
                             </div>
                             <div className="grid grid-cols-1 gap-3 sm:gap-4">
                               <div className="space-y-2">
                                  <Label>Phone</Label>
                                  <Input className="h-12 touch-manipulation" value={selectedUser.phone || ''} onChange={(e) => setSelectedUser({ ...selectedUser, phone: e.target.value })} />
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
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                                        <Input className="h-12" inputMode="numeric" pattern="[0-9]*" placeholder="Score" value={String(overrideScore)} onChange={(e) => setOverrideScore(Math.max(0, Math.min(1000, Number(e.target.value || 0))))} />
                                        <Input className="h-12" placeholder="Reason (required)" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
                                        <Button type="button" className="h-12" variant="outline" onClick={applyOverrideScore}>Apply</Button>
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
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <Input className="h-12" placeholder="Amount" type="number" value={bonusAmount} onChange={(e) => setBonusAmount(e.target.value)} />
                                    <Input className="h-12" placeholder="Note" value={bonusNote} onChange={(e) => setBonusNote(e.target.value)} />
                                    <Input className="h-12" placeholder="Expires At (ISO)" value={bonusExpire} onChange={(e) => setBonusExpire(e.target.value)} />
                                  </div>
                                  <Button className="h-12" type="button" onClick={handleAllocateBonus}>Add Bonus</Button>
                                 <div className="text-xs text-muted-foreground">Recent Bonuses:</div>
                                 <div className="max-h-24 overflow-y-auto text-xs">
                                   {db.getUserBonuses(selectedUser.id).slice(0,5).map(b => (
                                     <div key={b.id} className="flex justify-between"><span>{b.type}</span><span>${b.amount}</span><span>{b.status}</span></div>
                                   ))}
                                 </div>
                               </div>
                             )}
                            <div className="space-y-2 border-t pt-3">
                              {selectedUser && (
                                <PayoutControl 
                                  userId={selectedUser.id} 
                                  initialPct={selectedUser.payout_percentage ?? 0} 
                                  apiBase={apiBase} 
                                  token={token || ''} 
                                  onUpdated={(p) => setSelectedUser({ ...selectedUser, payout_percentage: p })}
                                />
                              )}
                            </div>

                             <Button type="submit" className="w-full h-12">Save Changes</Button>
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
