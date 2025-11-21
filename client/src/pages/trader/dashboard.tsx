import { useAuth } from '@/lib/auth';
import { db, Trade, Wallet } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TradingViewWidget from '@/components/tradingview-widget';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wallet as WalletIcon, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { toUSD, fmtUSD } from '@/lib/utils';
import { useEffect, useState } from 'react';

export default function TraderDashboard() {
  const { user } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    if (user) {
      setWallets(db.getUserWallets(user.id));
      setTrades(db.getUserTrades(user.id));
    }
  }, [user]);

  const totalBalance = wallets.reduce((sum, w) => sum + toUSD(w.asset_name, w.balance), 0);

  const totalPayouts = trades
    .filter(t => t.result === 'Win')
    .reduce((sum, t) => sum + (t.exit_price ? (t.exit_price - t.entry_price) * t.amount : 0), 0); // Rough Mock logic

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.name}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/20 to-card border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance (Est. USD)</CardTitle>
            <WalletIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{fmtUSD(totalBalance)}</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">+${totalPayouts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Lifetime earnings</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membership Tier</CardTitle>
            <div className="text-yellow-500 text-xl">♛</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{user?.membership_tier}</div>
            <p className="text-xs text-muted-foreground">Benefits active</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Market Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <TradingViewWidget symbol="COINBASE:BTCUSD" height={350} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Wallets</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallets.map((wallet) => (
                  <TableRow key={wallet.id}>
                    <TableCell className="font-medium">{wallet.asset_name}</TableCell>
                    <TableCell className="text-right">{fmtUSD(toUSD(wallet.asset_name, wallet.balance))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
