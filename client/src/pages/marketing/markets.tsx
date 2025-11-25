import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Globe, BarChart2, Wallet, ShieldCheck } from 'lucide-react'
import { apiRequest } from '@/lib/queryClient'

export default function Markets() {
  const [fx, setFx] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const pairs = ['FX:EURUSD','FX:USDJPY','FX:GBPUSD']

  const refresh = async () => {
    setLoading(true)
    const out: Record<string, number> = {}
    for (const s of pairs) {
      try {
        const res = await apiRequest('GET', `/api/prices/alpha?symbol=${encodeURIComponent(s)}`)
        const j = await res.json()
        if (typeof j?.price === 'number') out[s] = j.price
      } catch {}
    }
    setFx(out)
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    const iv = window.setInterval(refresh, 30000)
    return () => { try { window.clearInterval(iv) } catch {} }
  }, [])

  const formatFx = (s: string, p?: number) => {
    if (typeof p !== 'number') return { price: '—', bid: '—', ask: '—', spread: '—' }
    const jpyPair = s.includes('JPY')
    const tick = p * (jpyPair ? 0.0002 : 0.00002)
    const bid = p - tick
    const ask = p + tick
    const spread = ask - bid
    const pipFactor = jpyPair ? 100 : 10000
    return {
      price: p.toFixed(jpyPair ? 3 : 5),
      bid: bid.toFixed(jpyPair ? 3 : 5),
      ask: ask.toFixed(jpyPair ? 3 : 5),
      spread: (spread * pipFactor).toFixed(2)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
        <div>
          <h1 className="text-4xl font-bold">Markets</h1>
          <p className="text-gray-400">Crypto, Forex, Commodities, and Indices</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-3"><Globe className="w-6 h-6 text-primary" /> Forex</CardTitle>
              <CardDescription>Indicative spreads using live quotes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pairs.map((sym) => {
                const f = formatFx(sym, fx[sym])
                const label = sym.replace('FX:', '')
                return (
                  <div key={sym} className="grid grid-cols-5 gap-3 items-center text-sm">
                    <div className="font-semibold">{label}</div>
                    <div className="text-gray-300">Price {f.price}</div>
                    <div className="text-green-400">Bid {f.bid}</div>
                    <div className="text-red-400">Ask {f.ask}</div>
                    <div><Badge variant="secondary">Spread {f.spread} pips</Badge></div>
                  </div>
                )
              })}
              <div className="pt-2"><Button size="sm" variant="outline" onClick={refresh} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</Button></div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-3"><BarChart2 className="w-6 h-6 text-primary" /> Crypto</CardTitle>
              <CardDescription>Popular pairs and indicative spreads</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-300">
              <div>BTC/USDT • ETH/USDT • SOL/USDT</div>
              <div className="text-xs">Spreads vary by liquidity and session</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-3"><Wallet className="w-6 h-6 text-primary" /> Commodities</CardTitle>
              <CardDescription>Gold, Oil, Silver</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-300">
              <div>Gold • WTI Crude • Silver</div>
              <div className="text-xs">Indicative spreads based on session volatility</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-3"><ShieldCheck className="w-6 h-6 text-primary" /> Indices</CardTitle>
              <CardDescription>Global benchmarks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-300">
              <div>S&P 500 • NASDAQ • DAX</div>
              <div className="text-xs">Indicative spreads vary across sessions</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
