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

  const forexAssets = [ 
    { name: 'USD/SGD', symbol: 'FX:USDSGD' }, 
    { name: 'USD/PHP', symbol: 'FX:USDPHP' }, 
    { name: 'USD/NZD', symbol: 'FX:USDNZD' }, 
    { name: 'EUR/USD', symbol: 'FX:EURUSD' }, 
    { name: 'USD/MYR', symbol: 'FX:USDMYR' }, 
    { name: 'AUD/USD', symbol: 'FX:AUDUSD' }, 
    { name: 'GBP/USD', symbol: 'FX:GBPUSD' }, 
    { name: 'USD/JPY', symbol: 'FX:USDJPY' }, 
    { name: 'USD/THB', symbol: 'FX:USDTHB' }, 
    { name: 'USD/IDR', symbol: 'FX:USDIDR' }, 
    { name: 'USD/HKD', symbol: 'FX:USDHKD' }, 
    { name: 'USD/KRW', symbol: 'FX:USDKRW' }, 
  ];
 
  const stockAssets = [ 
    { name: 'KOPI', symbol: 'MYX:KOPI' }, 
    { name: 'PJBUMI', symbol: 'MYX:PJBUMI' }, 
    { name: 'MITRA', symbol: 'MYX:MITRA' }, 
    { name: 'LSH', symbol: 'MYX:LSH' }, 
    { name: 'CVIEW', symbol: 'MYX:CVIEW' }, 
    { name: 'GDB Holdings', symbol: 'MYX:GDB' }, 
    { name: 'NADIBHD', symbol: 'MYX:NADIBHD' }, 
    { name: 'RAMSSOL', symbol: 'MYX:RAMSSOL' }, 
    { name: 'HARNLEN', symbol: 'MYX:HARNLEN' }, 
    { name: 'BNASTRA', symbol: 'MYX:BNASTRA' }, 
    { name: 'EDGENTA', symbol: 'MYX:EDGENTA' }, 
    { name: 'KERJAYA', symbol: 'MYX:KERJAYA' }, 
    { name: 'ECOSHOP', symbol: 'MYX:ECOSHOP' }, 
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
    { name: 'Tether', symbol: 'BINANCE:USDTUSD' }, 
    { name: 'UniSwap', symbol: 'BINANCE:UNIUSD' }, 
    { name: 'Bitcoin', symbol: 'BINANCE:BTCUSDT' }, 
    { name: 'Solana', symbol: 'BINANCE:SOLUSDT' }, 
    { name: 'Cardano', symbol: 'BINANCE:ADAUSDT' }, 
    { name: 'Litecoin', symbol: 'BINANCE:LTCUSDT' }, 
    { name: 'Dogecoin', symbol: 'BINANCE:DOGEUSDT' }, 
    { name: 'Polygon', symbol: 'BINANCE:MATICUSDT' }, 
    { name: 'Ethereum', symbol: 'BINANCE:ETHUSDT' }, 
    { name: 'Chainlink', symbol: 'BINANCE:LINKUSDT' }, 
    { name: 'Ethereum Classic', symbol: 'BINANCE:ETCUSDT' }, 
    { name: 'Bitcoin Cash', symbol: 'BINANCE:BCHUSDT' }, 
  ];

  const [category, setCategory] = useState<'Forex' | 'Stocks' | 'Commodities' | 'Crypto'>('Crypto');
  const [assetName, setAssetName] = useState('Bitcoin');
  const [assetSymbol, setAssetSymbol] = useState('BINANCE:BTCUSDT');
  const [spreadBps, setSpreadBps] = useState<number>(db.getEngineSettings().spreadBps);
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
    setSpreadBps(db.getEngineSettings().spreadBps);
  }, []);

  useEffect(() => {
    setPrice(null);
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (esRef.current) { try { esRef.current.close(); } catch {} esRef.current = null; }
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
        const next = Math.min(retryRef.current * 2, 15000);
        retryRef.current = next;
        timerRef.current = setTimeout(connect, next);
      };
    };
    connect();
    return () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      if (esRef.current) { try { esRef.current.close(); } catch {} esRef.current = null; }
    };
  }, [assetSymbol, apiBase]);

  const handleTrade = async (direction: 'High' | 'Low') => {
    if (!amount || isNaN(Number(amount))) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid trade amount.' });
      return;
    }
    
    if (!user) return;
    try {
      const fallback = Math.abs(assetSymbol.split('').reduce((s,c)=>s + c.charCodeAt(0),0)) % 1000 + 100;
      const body = { symbol: assetSymbol, asset: assetName, amount: Number(amount), direction, duration, entryPrice: price ?? fallback };
      const res = await fetch(`${apiBase}/trades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Trade Failed', description: 'Could not place trade.' });
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
            <TradingViewWidget 
                symbol={assetSymbol} 
                height="100%" 
            />
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
               Expected Payout: 85%
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
