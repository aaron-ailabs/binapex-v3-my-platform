import { useAuth } from '@/lib/auth';
import { db } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TradingViewWidget from '@/components/tradingview-widget';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ArrowUp, ArrowDown, TrendingUp, Activity } from 'lucide-react';

export default function LiveTrading() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('1M');
  const [asset, setAsset] = useState('BTC/USD');

  const handleTrade = (direction: 'High' | 'Low') => {
    if (!amount || isNaN(Number(amount))) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid trade amount.' });
      return;
    }
    
    if (!user) return;

    const newTrade = {
      id: Math.random().toString(36).substr(2, 9),
      user_id: user.id,
      asset: asset,
      amount: Number(amount),
      direction: direction,
      duration: duration,
      entry_price: Math.random() * 50000 + 20000, // Mock price
      result: 'Pending',
      status: 'Open',
      created_at: new Date().toISOString(),
    };

    // @ts-ignore - Partial implementation for mock
    db.addTrade(newTrade);
    
    toast({ 
      title: 'Trade Placed', 
      description: `${direction} trade for $${amount} on ${asset} opened.`,
    });
    setAmount('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
      {/* Main Chart Area */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
           <h1 className="text-3xl font-bold tracking-tight">Live Trading</h1>
           <div className="flex gap-2">
              <Button variant={asset === 'BTC/USD' ? 'default' : 'outline'} onClick={() => setAsset('BTC/USD')}>BTC/USD</Button>
              <Button variant={asset === 'ETH/USD' ? 'default' : 'outline'} onClick={() => setAsset('ETH/USD')}>ETH/USD</Button>
              <Button variant={asset === 'GC1!' ? 'default' : 'outline'} onClick={() => setAsset('GC1!')}>GOLD</Button>
           </div>
        </div>
        
        <Card className="h-[600px] border-primary/20 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-0 h-full">
            <TradingViewWidget 
                symbol={asset === 'BTC/USD' ? 'COINBASE:BTCUSD' : asset === 'ETH/USD' ? 'COINBASE:ETHUSD' : 'COMEX:GC1!'} 
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
              <span className="text-muted-foreground">Current Price</span>
              <span className="font-mono font-bold text-xl">$48,291.20</span>
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
              <Input value={asset} disabled className="font-mono bg-muted/50" />
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
