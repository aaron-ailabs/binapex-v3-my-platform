import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { Order, Position, Portfolio, MarketQuote, ChartData, NewsItem } from '../types'

interface TradingState {
  orders: Order[]
  positions: Position[]
  portfolios: Portfolio[]
  marketQuotes: Record<string, MarketQuote>
  chartData: Record<string, ChartData[]>
  news: NewsItem[]
  isLoading: boolean
  error: string | null
  fetchOrders: () => Promise<void>
  fetchPositions: () => Promise<void>
  fetchPortfolios: () => Promise<void>
  placeOrder: (order: Omit<Order, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  cancelOrder: (orderId: string) => Promise<void>
  subscribeToMarketData: (symbols: string[]) => () => void
  subscribeToOrders: () => () => void
}

export const useTradingStore = create<TradingState>((set, get) => ({
  orders: [],
  positions: [],
  portfolios: [],
  marketQuotes: {},
  chartData: {},
  news: [],
  isLoading: false,
  error: null,

  fetchOrders: async () => {
    set({ isLoading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ orders: data || [], isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  fetchPositions: async () => {
    set({ isLoading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data: portfoliosData } = await supabase
        .from('portfolios')
        .select('id')
        .eq('user_id', user.id)

      if (portfoliosData && portfoliosData.length > 0) {
        const portfolioIds = portfoliosData.map(p => p.id)
        const { data, error } = await supabase
          .from('positions')
          .select('*')
          .in('portfolio_id', portfolioIds)

        if (error) throw error
        set({ positions: data || [], isLoading: false })
      } else {
        set({ positions: [], isLoading: false })
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  fetchPortfolios: async () => {
    set({ isLoading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error
      set({ portfolios: data || [], isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  placeOrder: async (order) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert([order])
        .select()
        .single()

      if (error) throw error
      
      set(state => ({ 
        orders: [data, ...state.orders], 
        isLoading: false 
      }))
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
      throw error
    }
  },

  cancelOrder: async (orderId) => {
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId)

      if (error) throw error
      
      set(state => ({ 
        orders: state.orders.map(order => 
          order.id === orderId ? { ...order, status: 'cancelled' as const } : order
        ), 
        isLoading: false 
      }))
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
      throw error
    }
  },

  subscribeToMarketData: (symbols) => {
    // Mock market data subscription - in real app, this would connect to WebSocket
    const updateMarketData = () => {
      const quotes: Record<string, MarketQuote> = {}
      symbols.forEach(symbol => {
        const basePrice = Math.random() * 200 + 50
        const change = (Math.random() - 0.5) * 10
        quotes[symbol] = {
          symbol,
          price: basePrice + change,
          change,
          changePercent: (change / basePrice) * 100,
          volume: Math.floor(Math.random() * 1000000),
          timestamp: new Date().toISOString()
        }
      })
      set({ marketQuotes: quotes })
    }

    updateMarketData()
    const interval = setInterval(updateMarketData, 5000)
    
    // Cleanup function would be returned in real implementation
    return () => clearInterval(interval)
  },

  subscribeToOrders: () => {
    const { fetchOrders } = get()
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('orders-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders()
        }
      )
      .subscribe()

    // Cleanup function
    return () => {
      subscription.unsubscribe()
    }
  }
}))
