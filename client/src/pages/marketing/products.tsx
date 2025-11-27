import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart2, Grid, SlidersHorizontal } from 'lucide-react'
import TradingViewWidget from '@/components/tradingview-widget'

export default function Products() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
        <div>
          <h1 className="text-4xl font-bold">Products</h1>
          <p className="text-gray-400">Trading, analytics, and portfolio tools</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div>
            <TradingViewWidget symbol="BINANCE:BTCUSDT" theme="dark" height={420} />
          </div>
          <div className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-3"><BarChart2 className="w-6 h-6 text-primary" /> Real-Time Analytics</CardTitle>
                <CardDescription>TradingView integration and indicators</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-gray-300">Advanced charts, overlays, and strategies.</CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-3"><Grid className="w-6 h-6 text-primary" /> Portfolio</CardTitle>
                <CardDescription>Positions, orders, and history</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-gray-300">Track PnL and exposure across assets.</CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-3"><SlidersHorizontal className="w-6 h-6 text-primary" /> Orders</CardTitle>
                <CardDescription>Market and limit orders</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-gray-300">Simulated order entry and management.</CardContent>
            </Card>
            <div className="flex gap-3">
              <Button>Start Trading</Button>
              <Button variant="outline">Learn More</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
