import { useAuth } from '@/lib/auth';
import { db } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TradingViewWidget from '@/components/tradingview-widget';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ArrowUp, ArrowDown, TrendingUp, Activity } from 'lucide-react';
import { useRef } from 'react';

export default function LiveTrading() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('1M');
  const [alertPrice, setAlertPrice] = useState('');
  const [alertDirection, setAlertDirection] = useState('above');

  const forexAssets = [
    { name: 'EUR/USD', symbol: 'BLACKBULL:EURUSD' },
    { name: 'GBP/USD', symbol: 'BLACKBULL:GBPUSD' },
    { name: 'USD/JPY', symbol: 'BLACKBULL:USDJPY' },
    { name: 'GBP/JPY', symbol: 'BLACKBULL:GBPJPY' },
    { name: 'AUD/USD', symbol: 'BLACKBULL:AUDUSD' },
    { name: 'USD/CHF', symbol: 'BLACKBULL:USDCHF' },
    { name: 'NZD/USD', symbol: 'BLACKBULL:NZDUSD' },
    { name: 'USD/SGD', symbol: 'BLACKBULL:USDSGD' },
    { name: 'MYR/USD', symbol: 'FX_IDC:MYRUSD' },
    { name: 'MYR/THB', symbol: 'FX_IDC:MYRTHB' },
  ];
 
  const stockAssets = [
    { name: 'NVIDIA', symbol: 'NASDAQ:NVDA' },
    { name: 'Tesla', symbol: 'NASDAQ:TSLA' },
    { name: 'Apple', symbol: 'NASDAQ:AAPL' },
    { name: 'Meta', symbol: 'NASDAQ:META' },
    { name: 'Amazon', symbol: 'NASDAQ:AMZN' },
    { name: 'Palantir', symbol: 'NASDAQ:PLTR' },
    { name: 'Microsoft', symbol: 'NASDAQ:MSFT' },
    { name: 'Netflix', symbol: 'NASDAQ:NFLX' },
    { name: 'Alibaba', symbol: 'NYSE:BABA' },
  ];
 
  const commodityAssets = [ 
    { name: 'Gold', symbol: 'COMEX:GC1!' }, 
    { name: 'Palladium', symbol: 'NYMEX:PA1!' }, 
    { name: 'Platinum', symbol: 'NYMEX:PL1!' }, 
    { name: 'Micro Silver', symbol: 'COMEX:SI1!' }, 
    { name: 'Brent Crude Oil', symbol: 'ICEEUR:BRN1!' }, 
    { name: 'Crude Oil', symbol: 'NYMEX:CL1!' }, 
    { name: 'Natural Gas', symbol: 'NYMEX:NG1!' }, 
    { name: 'RBOB Gasoline', symbol: 'NYMEX:RB1!' }, 
    { name: 'Heating Oil', symbol: 'NYMEX:HO1!' }, 
    { name: 'Coffee', symbol: 'ICEUS:KC1!' }, 
    { name: 'Aluminum', symbol: 'LME:ALI1!' }, 
    { name: 'Copper', symbol: 'COMEX:HG1!' }, 
  ];
 
  const cryptoAssets = [
    { name: 'Bitcoin', symbol: 'BINANCE:BTCUSDT' },
    { name: 'Ethereum', symbol: 'BINANCE:ETHUSDT' },
    { name: 'Solana', symbol: 'BINANCE:SOLUSDT' },
    { name: 'XRP', symbol: 'BINANCE:XRPUSDT' },
    { name: 'BNB', symbol: 'BINANCE:BNBUSDT' },
    { name: 'Dogecoin', symbol: 'BINANCE:DOGEUSDT' },
    { name: 'Zcash', symbol: 'BINANCE:ZECUSDT' },
    { name: 'Litecoin', symbol: 'BINANCE:LTCUSDT' },
    { name: 'TRON', symbol: 'BINANCE:TRXUSDT' },
  ];

  const [category, setCategory] = useState<'Forex' | 'Stocks' | 'Commodities' | 'Crypto'>('Crypto');
  const [assetName, setAssetName] = useState('Bitcoin');
  const [assetSymbol, setAssetSymbol] = useState('BINANCE:BTCUSDT');
  const [spreadBps, setSpreadBps] = useState<number>(db.getEngineSettings().spreadBps);
  const [payoutPct, setPayoutPct] = useState<number>(85);
  const [price, setPrice] = useState<number | null>(null);
  const apiBase = (import.meta.env.VITE_API_BASE as string) || '/api';
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef<number>(1000);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const list = category === 'Forex' ? forexAssets : category === 'Stocks' ? stockAssets : category === 'Commodities' ? commodityAssets : cryptoAssets;
    if (!list.find(a => a.name === assetName)) {
      setAssetName(list[0].name);
      setAssetSymbol(list[0].symbol);
    }
  }, [category]);

  useEffect(() => {
    (async () => {
      try {
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`${apiBase}/engine`, { headers });
        if (res.ok) {
          const d = await res.json();
          if (typeof d.spreadBps === 'number') setSpreadBps(d.spreadBps);
          if (typeof d.payoutPct === 'number') setPayoutPct(Math.max(0, Math.min(100, d.payoutPct)));
        }
      } catch {}
    })();
  }, [apiBase, token]);

  useEffect(() => {
    setPrice(null);
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (esRef.current) { try { esRef.current.close(); } catch {} esRef.current = null; }
    (async () => {
      try {
        const res = await fetch(`${apiBase}/prices/alpha?symbol=${encodeURIComponent(assetSymbol)}`);
        if (res.ok) {
          const d = await res.json();
          if (typeof d.price === 'number') setPrice(d.price);
        }
      } catch {}
    })();
    const connect = () => {
      const url = `${apiBase}/prices/stream?symbols=${encodeURIComponent(assetSymbol)}`;
      const es = new EventSource(url);
      esRef.current = es;
      es.onopen = () => { retryRef.current = 1000; };
      es.onmessage = (e) => {
        try {
          const d = JSON.parse(e.data);
          if (d && d.symbol === assetSymbol && typeof d.price === 'number') {
            setPrice(d.price);
          }
        } catch {}
      };
      es.onerror = () => {
        try { es.close(); } catch {}
        if (document.visibilityState !== 'visible') { timerRef.current = null; return; }
        const next = Math.min(retryRef.current * 2, 15000);
        retryRef.current = next;
        timerRef.current = setTimeout(connect, next);
      };
    };
    connect();
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        if (!esRef.current && !timerRef.current) {
          retryRef.current = 1000;
          connect();
        }
      } else {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
        if (esRef.current) { try { esRef.current.close(); } catch {} esRef.current = null; }
      }
    };
    const onOnline = () => {
      if (document.visibilityState === 'visible') {
        if (!esRef.current && !timerRef.current) {
          retryRef.current = 1000;
          connect();
        }
      }
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('online', onOnline);
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      if (esRef.current) { try { esRef.current.close(); } catch {} esRef.current = null; }
    };
  }, [assetSymbol, apiBase]);

  const handleTrade = async (direction: 'High' | 'Low') => {
    if (!amount || isNaN(Number(amount))) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid trade amount.' });
      return;
    }
    
    if (!user) {
      toast({ variant: 'destructive', title: 'Login Required', description: 'Please sign in to place trades.' });
      return;
    }
    try {
      const fallback = Math.abs(assetSymbol.split('').reduce((s,c)=>s + c.charCodeAt(0),0)) % 1000 + 100;
      const body = { symbol: assetSymbol, asset: assetName, amount: Number(amount), direction, duration, entryPrice: price ?? fallback };
      const res = await fetch(`${apiBase}/trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        let msg = 'Could not place trade.';
        try { const j = await res.json(); if (j?.message) msg = j.message; } catch {}
        toast({ variant: 'destructive', title: 'Trade Failed', description: msg });
        return;
      }
      toast({ title: 'Trade Placed', description: `${direction} trade for $${amount} on ${assetName} opened.` });
      setAmount('');
    } catch {
      toast({ variant: 'destructive', title: 'Network Error', description: 'Please try again.' });
    }
  };

  const currentList = category === 'Forex' ? forexAssets : category === 'Stocks' ? stockAssets : category === 'Commodities' ? commodityAssets : cryptoAssets;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
      {/* Main Chart Area */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
           <h1 className="text-3xl font-bold tracking-tight">Live Trading</h1>
           <div className="flex gap-4 items-center">
             <div className="w-[160px]">
               <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                 <SelectTrigger>
                   <SelectValue placeholder="Market" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="Crypto">Crypto</SelectItem>
                   <SelectItem value="Forex">Forex</SelectItem>
                   <SelectItem value="Commodities">Commodities</SelectItem>
                   <SelectItem value="Stocks">Stocks</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             <div className="w-[220px]">
               <Select 
                 value={assetName} 
                 onValueChange={(name) => {
                   setAssetName(name);
                   const found = currentList.find(a => a.name === name);
                   if (found) setAssetSymbol(found.symbol);
                 }}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Select Asset" />
                 </SelectTrigger>
                 <SelectContent>
                   {currentList.map((a) => (
                     <SelectItem key={a.symbol} value={a.name}>{a.name}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
          </div>
        </div>
        
        <Card className="h-[600px] border-primary/20 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-0 h-full">
            {category === 'Crypto' ? (
              <TradingViewWidget
                overviewSymbols={[
                  'BINANCE:BTCUSDT|ALL',
                  'BINANCE:ETHUSDT|ALL',
                  'BINANCE:SOLUSDT|ALL',
                  'BINANCE:XRPUSDT|ALL',
                  'BINANCE:BNBUSDT|ALL',
                  'BINANCE:DOGEUSDT|ALL',
                  'BINANCE:ZECUSDT|ALL',
                  'BINANCE:LTCUSDT|ALL',
                  'BINANCE:TRXUSDT|ALL',
                ]}
                height="100%"
              />
            ) : category === 'Forex' ? (
              <TradingViewWidget
                overviewSymbols={[
                  'BLACKBULL:EURUSD|ALL',
                  'BLACKBULL:GBPUSD|ALL',
                  'BLACKBULL:USDJPY|ALL',
                  'BLACKBULL:GBPJPY|ALL',
                  'BLACKBULL:AUDUSD|ALL',
                  'BLACKBULL:USDCHF|ALL',
                  'BLACKBULL:NZDUSD|ALL',
                  'BLACKBULL:USDSGD|ALL',
                  'FX_IDC:MYRUSD|ALL',
                  'FX_IDC:MYRTHB|ALL',
                ]}
                height="100%"
              />
            ) : category === 'Stocks' ? (
              <TradingViewWidget
                overviewSymbols={[
                  'NASDAQ:NVDA|ALL',
                  'NASDAQ:TSLA|ALL',
                  'NASDAQ:AAPL|ALL',
                  'NASDAQ:META|ALL',
                  'NASDAQ:AMZN|ALL',
                  'NASDAQ:PLTR|ALL',
                  'NASDAQ:MSFT|ALL',
                  'NASDAQ:NFLX|ALL',
                  'NYSE:BABA|ALL',
                ]}
                height="100%"
              />
            ) : (
              <TradingViewWidget
                advancedSymbol={assetSymbol}
                advancedOptions={{
                  interval: '1D',
                  hide_side_toolbar: false,
                  hide_top_toolbar: false,
                  withdateranges: true,
                  studies: ['RSI@tv-basicstudies','MACD@tv-basicstudies','BB@tv-basicstudies'],
                }}
                watchlist={commodityAssets.map(c => c.symbol)}
                height="100%"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Side Panel */}
      <div className="space-y-6">
        {/* Asset Stats */}
        <Card className="bg-sidebar/50 border-sidebar-border">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-accent" />
              Asset Stats
            </CardTitle>
          </CardHeader>
      <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Bid / Ask</span>
              {(() => {
                const fallback = Math.abs(assetSymbol.split('').reduce((s,c)=>s + c.charCodeAt(0),0)) % 1000 + 100;
                const base = price ?? fallback;
                const bid = base * (1 - (spreadBps/10000)/2);
                const ask = base * (1 + (spreadBps/10000)/2);
                return <span className="font-mono font-bold text-xl">${bid.toFixed(2)} / ${ask.toFixed(2)}</span>;
              })()}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">24h Change</span>
              <span className="font-mono text-emerald-500 font-medium flex items-center">+2.45% <ArrowUp className="w-3 h-3 ml-1" /></span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">24h High</span>
              <span className="font-mono">$49,100.00</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">24h Low</span>
              <span className="font-mono">$47,500.00</span>
            </div>
            <div className="flex items-center gap-2">
              <Input placeholder="Alert price" value={alertPrice} onChange={(e) => setAlertPrice(e.target.value)} className="w-28" />
              <Select value={alertDirection} onValueChange={setAlertDirection}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="above">Above</SelectItem>
                  <SelectItem value="below">Below</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={async () => {
                const t = Number(alertPrice);
                if (!Number.isFinite(t) || t <= 0) {
                  toast({ variant: 'destructive', title: 'Invalid price', description: 'Enter a valid price target.' });
                  return;
                }
                try {
                  const res = await fetch(`${apiBase}/alerts/price`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                    body: JSON.stringify({ symbol: assetSymbol, target: t, direction: alertDirection })
                  });
                  if (res.ok) {
                    toast({ title: 'Alert Added', description: `Alert when ${assetName} ${alertDirection} ${t}` });
                    setAlertPrice('');
                  } else {
                    let msg = 'Failed to add alert.';
                    try { const j = await res.json(); if (j?.message) msg = j.message; } catch {}
                    toast({ variant: 'destructive', title: 'Error', description: msg });
                  }
                } catch {
                  toast({ variant: 'destructive', title: 'Error', description: 'Failed to add alert.' });
                }
              }}>Add Alert</Button>
            </div>
          </CardContent>
        </Card>

        {/* Trade Form */}
        <Card className="border-primary/20 shadow-lg shadow-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Place Trade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Asset</Label>
              <Input value={assetName} disabled className="font-mono bg-muted/50" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1M">1 Min</SelectItem>
                    <SelectItem value="5M">5 Min</SelectItem>
                    <SelectItem value="15M">15 Min</SelectItem>
                    <SelectItem value="1H">1 Hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input 
                  type="number" 
                  placeholder="100" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-lg" 
                onClick={() => handleTrade('High')}
              >
                HIGH <ArrowUp className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                className="w-full bg-rose-600 hover:bg-rose-700 h-12 text-lg"
                onClick={() => handleTrade('Low')}
              >
                LOW <ArrowDown className="ml-2 w-5 h-5" />
              </Button>
            </div>
            
            <div className="text-center text-xs text-muted-foreground">
               Expected Payout: {payoutPct}%
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
