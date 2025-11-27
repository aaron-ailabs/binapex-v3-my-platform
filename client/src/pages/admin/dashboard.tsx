import { db } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, AlertCircle, CreditCard } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingKYC: 0,
    pendingWithdrawals: 0,
  });

  useEffect(() => {
    const users = db.getUsers();
    const kycs = db.getKYCSubmissions().filter(k => k.status === 'Pending');
    const withdrawals = db.getTransactions().filter(t => t.type === 'Withdrawal' && t.status === 'Pending');

    setStats({
      totalUsers: users.length,
      pendingKYC: kycs.length,
      pendingWithdrawals: withdrawals.length,
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and alerts.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Active accounts</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending KYC</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.pendingKYC}</div>
            <p className="text-xs text-muted-foreground">Requires review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
            <CreditCard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.pendingWithdrawals}</div>
            <p className="text-xs text-muted-foreground">Requires approval</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
