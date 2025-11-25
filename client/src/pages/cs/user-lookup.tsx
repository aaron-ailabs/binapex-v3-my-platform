import { db, User, Wallet, Trade, Transaction } from '@/lib/mock-data';
import { fmtUSD, toUSD } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function UserLookup() {
  const [email, setEmail] = useState('');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<{
    wallets: Wallet[];
    trades: Trade[];
    transactions: Transaction[];
  } | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const users = db.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (user) {
      setFoundUser(user);
      setUserData({
        wallets: db.getUserWallets(user.id),
        trades: db.getUserTrades(user.id),
        transactions: db.getUserTransactions(user.id),
      });
    } else {
      setFoundUser(null);
      setUserData(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">User Lookup</h1>
        <p className="text-muted-foreground">Search for a user to view their details.</p>
      </div>

      <Card>
        <CardHeader>
           <CardTitle>Search User</CardTitle>
        </CardHeader>
        <CardContent>
           <form onSubmit={handleSearch} className="flex gap-4">
              <Input 
                placeholder="Enter user email..." 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="max-w-md"
              />
              <Button type="submit"><Search className="w-4 h-4 mr-2" /> Search</Button>
           </form>
        </CardContent>
      </Card>

      {foundUser && userData && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           {/* User Details */}
           <Card>
              <CardHeader>
                 <CardTitle>User Profile</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <div>
                    <div className="text-sm text-muted-foreground">Name</div>
                    <div className="font-medium">{foundUser.name}</div>
                 </div>
                 <div>
                    <div className="text-sm text-muted-foreground">Email</div>
                    <div className="font-medium">{foundUser.email}</div>
                 </div>
                 <div>
                    <div className="text-sm text-muted-foreground">Status</div>
                    <Badge variant="outline">{foundUser.kyc_status}</Badge>
                 </div>
                 <div>
                    <div className="text-sm text-muted-foreground">Tier</div>
                    <div>
                      <span
                        className="inline-block px-2 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor:
                            foundUser.membership_tier === 'Gold'
                              ? '#FFD700'
                              : foundUser.membership_tier === 'Platinum'
                              ? '#E5E4E2'
                              : '#C0C0C0',
                          color: '#000',
                        }}
                      >
                        {foundUser.membership_tier}
                      </span>
                    </div>
                 </div>
              </CardContent>
           </Card>

           <div className="grid md:grid-cols-2 gap-6">
              {/* Wallets */}
              <Card>
                 <CardHeader><CardTitle>Wallets</CardTitle></CardHeader>
                 <CardContent>
                    <Table>
                       <TableHeader>
                          <TableRow><TableHead>Asset</TableHead><TableHead>Balance</TableHead></TableRow>
                       </TableHeader>
                       <TableBody>
                          {userData.wallets.map(w => (
                             <TableRow key={w.id}>
                                <TableCell>{w.asset_name}</TableCell>
                                <TableCell>{fmtUSD(toUSD(w.asset_name, w.balance))}</TableCell>
                             </TableRow>
                          ))}
                       </TableBody>
                    </Table>
                 </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                 <CardHeader><CardTitle>Recent Transactions</CardTitle></CardHeader>
                 <CardContent>
                    <Table>
                       <TableHeader>
                          <TableRow><TableHead>Type</TableHead><TableHead>Status</TableHead></TableRow>
                       </TableHeader>
                       <TableBody>
                          {userData.transactions.slice(0, 5).map(t => (
                             <TableRow key={t.id}>
                                <TableCell>{t.type}</TableCell>
                                <TableCell>{t.status}</TableCell>
                             </TableRow>
                          ))}
                       </TableBody>
                    </Table>
                 </CardContent>
              </Card>
           </div>
        </div>
      )}
    </div>
  );
}
