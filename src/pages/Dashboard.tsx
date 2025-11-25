import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useTradingStore } from '../stores/tradingStore'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { TrendingUp, TrendingDown, DollarSign, Activity, Plus, Search, Star } from 'lucide-react'

const majorIndices = [
  { symbol: 'SPY', name: 'S&P 500', price: 478.35, change: 2.15, changePercent: 0.45 },
  { symbol: 'QQQ', name: 'NASDAQ', price: 398.21, change: -1.23, changePercent: -0.31 },
  { symbol: 'DIA', name: 'Dow Jones', price: 375.89, change: 0.87, changePercent: 0.23 },
  { symbol: 'IWM', name: 'Russell 2000', price: 198.45, change: 3.21, changePercent: 1.64 }
]

const topMovers = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 195.89, change: 5.23, changePercent: 2.74, volume: '45.2M' },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 248.50, change: -8.75, changePercent: -3.40, volume: '89.1M' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 875.28, change: 12.45, changePercent: 1.44, volume: '32.8M' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 415.26, change: -2.18, changePercent: -0.52, volume: '28.7M' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 142.57, change: 1.89, changePercent: 1.34, volume: '21.3M' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 178.35, change: -1.23, changePercent: -0.69, volume: '38.9M' }
]

const watchlistSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX']

export default function Dashboard() {
  const { user } = useAuthStore()
  const { marketQuotes, subscribeToMarketData, fetchPortfolios, portfolios } = useTradingStore()
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    // Subscribe to market data for watchlist symbols
    const unsubscribe = subscribeToMarketData(watchlistSymbols)
    
    // Fetch user portfolios
    fetchPortfolios()

    return () => {
      unsubscribe()
    }
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">B</span>
              </div>
              <h1 className="text-2xl font-bold text-white">Binapex</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search stocks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex items-center space-x-2 text-white">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user?.first_name?.[0]}{user?.last_name?.[0]}
                  </span>
                </div>
                <span className="text-sm font-medium">{user?.first_name} {user?.last_name}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Major Indices */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {majorIndices.map((index) => (
            <Card key={index.symbol} className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-white">{index.name}</h3>
                  {index.change >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-400" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-white">{formatCurrency(index.price)}</p>
                  <div className={`flex items-center space-x-1 text-sm ${
                    index.change >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    <span>{index.change >= 0 ? '+' : ''}{formatCurrency(index.change)}</span>
                    <span>({formatPercent(index.changePercent)})</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Watchlist */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-bold text-white">Watchlist</CardTitle>
                <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Stock
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {watchlistSymbols.map((symbol) => {
                    const quote = marketQuotes[symbol]
                    return (
                      <div key={symbol} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:bg-slate-900/70 transition-colors cursor-pointer">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">{symbol[0]}</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-white">{symbol}</h4>
                            <p className="text-sm text-slate-400">Technology</p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          {quote ? (
                            <>
                              <p className="font-semibold text-white">{formatCurrency(quote.price)}</p>
                              <p className={`text-sm ${
                                quote.change >= 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {quote.change >= 0 ? '+' : ''}{formatCurrency(quote.change)} ({formatPercent(quote.changePercent)})
                              </p>
                            </>
                          ) : (
                            <div className="animate-pulse">
                              <div className="h-4 bg-slate-700 rounded w-16 mb-1"></div>
                              <div className="h-3 bg-slate-700 rounded w-20"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Movers */}
          <div>
            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white">Top Movers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topMovers.map((stock) => (
                    <div key={stock.symbol} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                      <div>
                        <h4 className="font-semibold text-white text-sm">{stock.symbol}</h4>
                        <p className="text-xs text-slate-400">{stock.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-white text-sm">{formatCurrency(stock.price)}</p>
                        <p className={`text-xs ${
                          stock.change >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {stock.change >= 0 ? '+' : ''}{formatPercent(stock.changePercent)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm mt-6">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-white">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      <span className="text-slate-300">Portfolio Value</span>
                    </div>
                    <span className="font-semibold text-white">
                      {portfolios.length > 0 ? formatCurrency(portfolios[0]?.total_value || 0) : '$0.00'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Activity className="w-4 h-4 text-blue-400" />
                      <span className="text-slate-300">Today's P&L</span>
                    </div>
                    <span className={`font-semibold ${
                      (portfolios[0]?.total_gain_loss || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {portfolios.length > 0 ? 
                        `${(portfolios[0]?.total_gain_loss || 0) >= 0 ? '+' : ''}${formatCurrency(portfolios[0]?.total_gain_loss || 0)}` : 
                        '$0.00'
                      }
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span className="text-slate-300">Watchlist</span>
                    </div>
                    <span className="font-semibold text-white">{watchlistSymbols.length} stocks</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}