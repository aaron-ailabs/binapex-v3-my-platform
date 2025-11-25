import { useAuth } from '@/lib/auth';
import { db, Trade, Wallet, Bonus } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TradingViewWidget from '@/components/tradingview-widget';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wallet as WalletIcon, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { toUSD, fmtUSD } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function TraderDashboard() {
  const { user, token } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [creditScore, setCreditScore] = useState<number>(user?.credit_score || 0);
  const [creditConfig, setCreditConfig] = useState<{ decimals: number; rounding: 'nearest'|'down'|'up' }>({ decimals: 0, rounding: 'nearest' });
  const [creditUpdatedAt, setCreditUpdatedAt] = useState<number>(Date.now());
  const [syncStatus, setSyncStatus] = useState<'ok'|'updating'|'mismatch'|'error'>('ok');
  const apiBase = (import.meta.env.VITE_API_BASE as string) || '/api';
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setWallets(db.getUserWallets(user.id));
      setTrades(db.getUserTrades(user.id));
      setBonuses(db.getUserBonuses(user.id));
      (async () => {
        try {
          const r = await fetch(`${apiBase}/credit-score`, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
          if (r.ok) {
            const data = await r.json();
            setCreditScore(Number(data.score || 0));
            setCreditUpdatedAt(Number(data.lastUpdated || Date.now()));
            if (data.config) setCreditConfig({ decimals: data.config.decimals, rounding: data.config.rounding });
            setSyncStatus('ok');
          } else {
            setSyncStatus('error');
          }
        } catch { setSyncStatus('error'); }
        try {
          const es = new EventSource(`${apiBase}/credit-score/stream?token=${encodeURIComponent(token || '')}`);
          es.onmessage = (ev) => {
            try {
              const payload = JSON.parse(ev.data);
              if (payload?.type === 'update' || payload?.type === 'snapshot') {
                const d = payload.data || payload;
                setSyncStatus('updating');
                setCreditScore(Number(d.score || 0));
                setCreditUpdatedAt(Number(d.lastUpdated || Date.now()));
                setSyncStatus('ok');
              }
              if (payload?.config) {
                setCreditConfig({ decimals: payload.config.decimals, rounding: payload.config.rounding });
              }
            } catch {}
          };
          es.onerror = () => { setSyncStatus('error'); };
        } catch {}
      })();
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
        {user?.membership_tier && (
          <div className="mt-1">
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                backgroundColor:
                  user.membership_tier === 'Gold'
                    ? '#FFD700'
                    : user.membership_tier === 'Platinum'
                    ? '#E5E4E2'
                    : '#C0C0C0',
                color: '#000',
              }}
            >
              {user.membership_tier}
            </span>
          </div>
        )}
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Score</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const format = (v: number) => {
                const dec = creditConfig.decimals || 0;
                const factor = Math.pow(10, dec);
                const roundMode = creditConfig.rounding || 'nearest';
                let n = v;
                if (roundMode === 'nearest') n = Math.round(v * factor) / factor;
                else if (roundMode === 'down') n = Math.floor(v * factor) / factor;
                else n = Math.ceil(v * factor) / factor;
                return n.toFixed(dec);
              };
              const valNum = Number(format(creditScore));
              const color = valNum >= 700 ? 'text-emerald-500' : valNum >= 600 ? 'text-yellow-500' : 'text-red-500';
              const desc = valNum >= 700 ? 'Excellent' : valNum >= 600 ? 'Fair' : 'Needs Improvement';
              return (
                <div className="space-y-1">
                  <div className={`text-3xl font-extrabold tracking-tight ${color}`}>{format(creditScore)}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                  <div className="text-[10px] text-muted-foreground">Updated {creditUpdatedAt ? new Date(creditUpdatedAt).toLocaleString() : '-'}</div>
                  <div className="text-[10px]">
                    {syncStatus === 'updating' ? <span className="text-primary">Updating…</span> : syncStatus === 'mismatch' ? <span className="text-yellow-500">Discrepancy detected</span> : syncStatus === 'error' ? <span className="text-red-500">Sync error</span> : <span className="text-muted-foreground">Live</span>}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Market Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <TradingViewWidget
              overviewSymbols={[
                'NASDAQ:NVDA|ALL',
                'NASDAQ:TSLA|ALL',
                'NASDAQ:AAPL|ALL',
                'NASDAQ:META|ALL',
                'NASDAQ:AMZN|ALL',
                'NASDAQ:MSFT|ALL',
              ]}
              height={350}
            />
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

        <Card>
          <CardHeader>
            <CardTitle>My Bonuses</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bonuses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No bonuses available.</TableCell>
                  </TableRow>
                )}
                {bonuses.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.type}</TableCell>
                    <TableCell>{fmtUSD(b.amount)}</TableCell>
                    <TableCell className="text-xs">{b.status}</TableCell>
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
