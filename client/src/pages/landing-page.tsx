import { useEffect, useState, useRef, memo } from 'react';
import TradingViewWidget from '@/components/tradingview-widget';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  Globe, 
  ShieldCheck, 
  Headset, 
  Star, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  Menu,
  X,
  Lock,
  KeyRound,
  Smartphone,
  Users,
  Wallet,
  BarChart2
} from 'lucide-react';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

// Carousel Data
const CAROUSEL_SLIDES = [
  {
    title: "Advanced Trading Tools",
    subtitle: "Professional-grade tools and charts for successful trading",
    image: "https://images.unsplash.com/photo-1611974765270-ca1258634369?q=80&w=1964&auto=format&fit=crop",
  },
  {
    title: "Secure & Regulated",
    subtitle: "Licensed by MISA and FSCA for your peace of mind",
    image: "https://images.unsplash.com/photo-1639322537228-f710d846310a?q=80&w=1932&auto=format&fit=crop",
  },
  {
    title: "Instant Execution",
    subtitle: "High-performance infrastructure with minimal latency",
    image: "https://images.unsplash.com/photo-1642790106117-e829e14a795f?q=80&w=1930&auto=format&fit=crop",
  }
];

const HERO_TICKER = [
  { label: 'BTC', symbol: 'BINANCE:BTCUSDT' },
  { label: 'ETH', symbol: 'BINANCE:ETHUSDT' },
  { label: 'Gold', symbol: 'COMEX:GC1!' },
  { label: 'Oil', symbol: 'NYMEX:CL1!' },
  { label: 'EUR/USD', symbol: 'FX:EURUSD' },
];


const TRUST_PILLARS = [
  { label: "Licensed Broker", value: "FSCA • MISA" },
  { label: "Global Clients", value: "85+ Countries" },
  { label: "Avg. Execution", value: "42ms" },
  { label: "Daily Volume", value: "$4.2B" },
];

const HERO_STATS = [
  { value: "350K+", label: "Active Traders" },
  { value: "$2.4T", label: "Processed Volume" },
  { value: "24/7", label: "Concierge Desk" },
];


export default function LandingPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [imgReady, setImgReady] = useState<Record<string, boolean>>({});
  const [chatOpen, setChatOpen] = useState(false);
  const [fxSpreadText, setFxSpreadText] = useState<string>('');
  

  const apiBase = (import.meta.env.VITE_API_BASE as string) || 'http://localhost:5000/api';
  const esRef = useRef<EventSource | null>(null);
  const [visiblePrices, setVisiblePrices] = useState<Record<string, number>>({});
  const pricesRef = useRef<Record<string, number>>({});

  const HeroTicker = memo(function HeroTicker({ prices }: { prices: Record<string, number> }) {
    return (
      <div aria-label="Live market ticker" aria-live="polite" className="flex gap-8 whitespace-nowrap">
        {HERO_TICKER.map((t) => {
          const p = prices[t.symbol];
          return (
            <div key={t.symbol} className="flex items-center gap-3 text-sm">
              <span className="text-gray-400">{t.label}</span>
              <span className="font-mono">{typeof p === 'number' ? p.toFixed(2) : '—'}</span>
            </div>
          );
        })}
      </div>
    );
  });

  const toProxy = (url: string) => `/api/assets/proxy?url=${encodeURIComponent(url)}`;

  useEffect(() => {
    CAROUSEL_SLIDES.forEach((s) => {
      const img = new Image();
      img.onload = () => setImgReady((prev) => ({ ...prev, [s.image]: true }));
      img.onerror = () => setImgReady((prev) => ({ ...prev, [s.image]: false }));
      img.src = toProxy(s.image);
    });
  }, []);

  useEffect(() => {
    const pairs = ['FX:EURUSD','FX:USDJPY','FX:GBPUSD'];
    const fetchFx = async () => {
      const out: Record<string, number> = {};
      for (const s of pairs) {
        try {
          const res = await apiRequest('GET', `/api/prices/alpha?symbol=${encodeURIComponent(s)}`);
          const j = await res.json();
          if (typeof j?.price === 'number') out[s] = j.price;
        } catch {}
      }
      
      const eur = out['FX:EURUSD'];
      const jpy = out['FX:USDJPY'];
      const gbp = out['FX:GBPUSD'];
      const spreadCalc = (p: number, jpyPair: boolean) => {
        const tick = p * (jpyPair ? 0.0002 : 0.00002);
        const bid = p - tick;
        const ask = p + tick;
        const spread = ask - bid;
        const pipFactor = jpyPair ? 100 : 10000;
        return (spread * pipFactor).toFixed(2);
      };
      const eurS = typeof eur === 'number' ? spreadCalc(eur, false) : null;
      const jpyS = typeof jpy === 'number' ? spreadCalc(jpy, true) : null;
      const gbpS = typeof gbp === 'number' ? spreadCalc(gbp, false) : null;
      const txt = [eurS ? `EUR/USD ~ ${eurS} pips` : null, jpyS ? `USD/JPY ~ ${jpyS} pips` : null, gbpS ? `GBP/USD ~ ${gbpS} pips` : null].filter(Boolean).join(' • ');
      setFxSpreadText(txt);
    };
    fetchFx();
    const iv = window.setInterval(fetchFx, 30000);
    return () => { try { window.clearInterval(iv); } catch {} };
  }, [apiBase]);

  useEffect(() => {
    let es: EventSource | null = null;
    let timer: number | null = null;
    let retryDelay = 1000;

    const connect = () => {
      if (es) { try { es.close(); } catch {} }
      
      const symbols = HERO_TICKER.map((t) => t.symbol).join(',');
      es = new EventSource(`${apiBase}/prices/stream?symbols=${encodeURIComponent(symbols)}`);
      esRef.current = es;

      es.onopen = () => {
        retryDelay = 1000;
        // console.log('EventSource connected');
      };

      es.onmessage = (e) => {
        try {
          const j = JSON.parse(e.data);
          if (j && j.symbol && typeof j.price === 'number') {
            pricesRef.current = { ...pricesRef.current, [j.symbol]: j.price };
          }
        } catch {}
      };

      es.onerror = () => {
        // console.log('EventSource error');
        try { es?.close(); } catch {}
        if (document.visibilityState !== 'visible') {
          timer = null;
          return;
        }
        const next = Math.min(retryDelay * 1.5, 30000); // Slower backoff
        retryDelay = next;
        timer = window.setTimeout(connect, next);
      };
    };

    if (document.visibilityState === 'visible') {
      connect();
    }

    const onVis = () => {
      if (document.visibilityState === 'visible') {
        if (!esRef.current && !timer) {
          retryDelay = 1000;
          connect();
        }
      } else {
        if (timer) { clearTimeout(timer); timer = null; }
        if (esRef.current) { try { esRef.current.close(); } catch {} esRef.current = null; }
      }
    };

    const onOnline = () => {
      if (document.visibilityState === 'visible') {
        if (!esRef.current && !timer) {
          retryDelay = 1000;
          connect();
        }
      }
    };

    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('online', onOnline);
    const iv = window.setInterval(() => {
      const next: Record<string, number> = {};
      for (const t of HERO_TICKER) {
        const v = pricesRef.current[t.symbol];
        if (typeof v === 'number') {
          next[t.symbol] = v;
        }
      }
      setVisiblePrices(next);
    }, 5000);

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('online', onOnline);
      try { window.clearInterval(iv); } catch {}
      if (timer) { clearTimeout(timer); timer = null; }
      if (esRef.current) {
        try { esRef.current.close(); } catch {}
        esRef.current = null;
      }
    };
  }, [apiBase]);

  // If logged in, we shouldn't really be here typically, but if we are, we show the landing page 
  // with a "Go to Dashboard" button instead of Login.
  
  const handleLoginClick = () => {
    setLocation('/auth');
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length);
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-primary selection:text-primary-foreground overflow-x-hidden">
      
      {/* 1. Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/70 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-amber-300 rounded-2xl flex items-center justify-center text-black font-bold text-xl shadow-[0_0_30px_rgba(245,158,11,0.35)]">
              B
            </div>
            <div>
              <span className="text-2xl font-bold tracking-tight text-white block">
                BINAPEX
              </span>
              <span className="text-xs uppercase tracking-[0.4em] text-white/60">
                Elite Markets • Live Trading
              </span>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <div className="flex items-center gap-4 text-sm font-medium text-gray-400">
              <button className="hover:text-primary transition-colors" onClick={() => setLocation('/markets')} aria-label="Markets">Markets</button>
              <button className="hover:text-primary transition-colors" onClick={() => setLocation('/products')} aria-label="Products">Products</button>
              <button className="hover:text-primary transition-colors" onClick={() => setLocation('/institutional')} aria-label="Institutional">Institutional</button>
            </div>
            
            <Button 
              onClick={handleLoginClick}
              className="bg-gradient-to-r from-primary to-amber-300 text-black font-bold px-6 rounded-full shadow-[0_0_25px_rgba(245,158,11,0.35)] transition-all hover:shadow-[0_0_35px_rgba(245,158,11,0.45)]"
            >
              {user ? 'DASHBOARD' : 'LOGIN'}
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-black border-b border-white/10 p-4 space-y-4 animate-in slide-in-from-top-5">
            <div className="flex flex-col gap-4 text-sm font-medium text-gray-400">
              <button className="text-left hover:text-primary">Markets</button>
              <button className="text-left hover:text-primary">Products</button>
              <button className="text-left hover:text-primary">Institutional</button>
            </div>
            <Button onClick={handleLoginClick} className="w-full bg-primary text-black font-bold">
               {user ? 'GO TO DASHBOARD' : 'LOGIN'}
            </Button>
          </div>
        )}
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-20 h-[650px] sm:h-[760px] overflow-hidden">
        {CAROUSEL_SLIDES.map((slide, index) => (
          <div 
            key={index}
            className={cn(
              "absolute inset-0 transition-opacity duration-1000 ease-in-out",
              currentSlide === index ? "opacity-100 z-10" : "opacity-0 z-0"
            )}
          >
            {/* Background Image with Overlay */}
            <div 
              className={cn("absolute inset-0 bg-cover bg-center", !imgReady[slide.image] ? "bg-gradient-to-br from-[#0a0a0a] to-[#111]" : "")}
              style={imgReady[slide.image] ? { backgroundImage: `url(${toProxy(slide.image)})` } : undefined}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black" />
            
            {/* Content */}
            <div className="absolute inset-0 flex items-center">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="max-w-3xl animate-in slide-in-from-left-10 fade-in duration-700 delay-200 space-y-8">
                  <div className="flex items-center gap-4 text-xs uppercase tracking-[0.4em] text-primary">
                    <span className="h-px w-10 bg-gradient-to-r from-transparent via-primary to-amber-200" />
                    Binapex Private Desk
                  </div>
                  <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight">
                    Professional Multi-Asset Trading Platform
                  </h1>
                  <p className="text-2xl text-gray-300">
                    Trade Crypto, Forex, and Commodities with Institutional-Grade Tools
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button 
                      onClick={handleLoginClick}
                      size="lg" 
                      className="text-lg px-8 h-14 rounded-full bg-gradient-to-r from-primary via-amber-300 to-amber-200 text-black font-bold hover:scale-[1.02] transition-transform"
                    >
                      Start Trading <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                    <Button
                      size="lg"
                      className="text-lg px-8 h-14 rounded-full border border-white/20 bg-white/5 text-white font-semibold hover:bg-white/10"
                    >
                      Learn More
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-6 text-sm">
                    {HERO_STATS.map((stat) => (
                      <div key={stat.label}>
                        <div className="text-3xl font-bold text-primary">{stat.value}</div>
                        <div className="text-gray-400 uppercase tracking-wide text-xs">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Carousel Controls */}
        <div className="absolute bottom-10 right-10 z-30 flex gap-4" role="navigation" aria-label="Carousel controls">
          <button onClick={prevSlide} aria-label="Previous slide" className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors backdrop-blur-sm">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button onClick={nextSlide} aria-label="Next slide" className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors backdrop-blur-sm">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
        
        <div aria-hidden className="absolute inset-0 z-10 pointer-events-none">
          <span className="absolute block w-72 h-72 rounded-full bg-gradient-to-br from-primary/10 to-amber-300/10 blur-3xl" style={{ top: '12%', left: '6%', animation: 'float1 24s linear infinite' }} />
          <span className="absolute block w-60 h-60 rounded-full bg-gradient-to-br from-primary/10 to-amber-300/10 blur-3xl" style={{ bottom: '8%', right: '10%', animation: 'float2 30s linear infinite' }} />
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <div className="bg-black/60 backdrop-blur-md border-t border-white/10">
            <div className="max-w-7xl mx-auto px-4 py-3 overflow-hidden">
              <HeroTicker prices={visiblePrices} />
            </div>
          </div>
        </div>
      </section>

      {/* Trust ribbon */}
      <section className="bg-black border-y border-white/5 py-6">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-sm uppercase tracking-[0.3em] text-gray-400">
          {TRUST_PILLARS.map((item) => (
            <div key={item.label} className="space-y-2">
              <p className="text-white">{item.value}</p>
              <p className="text-[10px] text-gray-500">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-24 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="group bg-white/5 hover:bg-white/10 p-8 rounded-3xl transition-all border border-white/10 hover:border-primary/40 hover:-translate-y-1">
              <Globe className="w-12 h-12 text-primary mb-6" />
              <h3 className="text-2xl font-bold mb-4 text-white">Multi-Asset Trading</h3>
              <p className="text-gray-400">Trade crypto, forex, commodities, and indices in one platform.</p>
            </div>
            <div className="group bg-white/5 hover:bg-white/10 p-8 rounded-3xl transition-all border border-white/10 hover:border-primary/40 hover:-translate-y-1">
              <BarChart2 className="w-12 h-12 text-primary mb-6" />
              <h3 className="text-2xl font-bold mb-4 text-white">Real-Time Analytics</h3>
              <p className="text-gray-400">TradingView integration with professional charting and indicators.</p>
            </div>
            <div className="group bg-white/5 hover:bg-white/10 p-8 rounded-3xl transition-all border border-white/10 hover:border-primary/40 hover:-translate-y-1">
              <Wallet className="w-12 h-12 text-primary mb-6" />
              <h3 className="text-2xl font-bold mb-4 text-white">Secure Wallets</h3>
              <p className="text-gray-400">Manage wallets with encryption, cold storage, and 2FA support.</p>
            </div>
            <div className="group bg-white/5 hover:bg-white/10 p-8 rounded-3xl transition-all border border-white/10 hover:border-primary/40 hover:-translate-y-1">
              <Users className="w-12 h-12 text-primary mb-6" />
              <h3 className="text-2xl font-bold mb-4 text-white">Multi-Role Platform</h3>
              <p className="text-gray-400">Trader, Support, and Admin roles with tailored workflows.</p>
            </div>
            <div className="group bg-white/5 hover:bg-white/10 p-8 rounded-3xl transition-all border border-white/10 hover:border-primary/40 hover:-translate-y-1">
              <Smartphone className="w-12 h-12 text-primary mb-6" />
              <h3 className="text-2xl font-bold mb-4 text-white">Mobile Responsive</h3>
              <p className="text-gray-400">Optimized for 768px and 1024px breakpoints and beyond.</p>
            </div>
            <div className="group bg-white/5 hover:bg-white/10 p-8 rounded-3xl transition-all border border-white/10 hover:border-primary/40 hover:-translate-y-1">
              <ShieldCheck className="w-12 h-12 text-primary mb-6" />
              <h3 className="text-2xl font-bold mb-4 text-white">Advanced Security</h3>
              <p className="text-gray-400">KYC and 2FA with secure, compliant infrastructure.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="fixed bottom-6 right-6 z-40">
        <Sheet open={chatOpen} onOpenChange={setChatOpen}>
          <SheetTrigger asChild>
            <Button aria-label="Live chat" className="rounded-full w-14 h-14 bg-primary text-black shadow-lg">
              <Headset />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-w-3xl mx-auto rounded-t-2xl">
            <div className="space-y-4">
              <h3 className="text-xl font-bold">Live Support</h3>
              <p className="text-gray-400">Start a chat with our concierge desk.</p>
              <div className="flex gap-4">
                <Button onClick={() => setLocation('/trader/support')} className="rounded-full">Start Chat</Button>
                <Button variant="outline" className="rounded-full" onClick={() => setChatOpen(false)}>Close</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <section className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-10 text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4"><Users className="w-6 h-6" /></div>
              <h3 className="text-xl font-bold mb-2">Sign Up & Verify</h3>
              <p className="text-gray-400">Create your account and complete KYC for secure access.</p>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4"><Wallet className="w-6 h-6" /></div>
              <h3 className="text-xl font-bold mb-2">Fund Your Account</h3>
              <p className="text-gray-400">Add funds via supported payment methods and start trading.</p>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4"><BarChart2 className="w-6 h-6" /></div>
              <h3 className="text-xl font-bold mb-2">Start Trading</h3>
              <p className="text-gray-400">Execute trades with real-time analytics and responsive UI.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-[#050505] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-10 text-center">Security & Compliance</h2>
          <div className="grid md:grid-cols-5 gap-6 text-center">
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
              <ShieldCheck className="w-8 h-8 text-primary mx-auto" />
              <div className="mt-2 text-sm text-gray-300">SSL Certified</div>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
              <Globe className="w-8 h-8 text-primary mx-auto" />
              <div className="mt-2 text-sm text-gray-300">Global Compliance</div>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
              <Lock className="w-8 h-8 text-primary mx-auto" />
              <div className="mt-2 text-sm text-gray-300">Encryption</div>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
              <KeyRound className="w-8 h-8 text-primary mx-auto" />
              <div className="mt-2 text-sm text-gray-300">2FA</div>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
              <Wallet className="w-8 h-8 text-primary mx-auto" />
              <div className="mt-2 text-sm text-gray-300">Cold Storage</div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 mb-6" role="tablist" aria-label="Platform preview views">
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setCurrentSlide(0)} aria-selected={currentSlide===0} aria-controls="view-chart">Charts</Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setCurrentSlide(1)} aria-selected={currentSlide===1} aria-controls="view-orders">Orders</Button>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setCurrentSlide(2)} aria-selected={currentSlide===2} aria-controls="view-portfolio">Portfolio</Button>
          </div>
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <div id="view-chart" className={cn(currentSlide===0 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2', 'transition-all duration-300') }>
              <TradingViewWidget symbol="BINANCE:BTCUSDT" theme="dark" height={420} />
            </div>
            <div className={cn(currentSlide===1 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2', 'transition-all duration-300 bg-white/5 p-8 rounded-3xl border border-white/10') } id="view-orders">
              <h3 className="text-2xl font-bold mb-6">Order Form (Simulated)</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Contact Email</Label>
                  <Input id="email" type="email" placeholder="you@company.com" aria-label="Contact email" />
                </div>
                <div>
                  <Label htmlFor="amount">Amount (USD)</Label>
                  <Input id="amount" type="number" min={1} defaultValue={100} aria-label="Order amount" />
                </div>
                <div>
                  <Label htmlFor="symbol">Symbol</Label>
                  <Input id="symbol" defaultValue="BINANCE:BTCUSDT" aria-label="Symbol" />
                </div>
                <div>
                  <Label htmlFor="direction">Direction</Label>
                  <Input id="direction" defaultValue="High" aria-label="Direction" />
                </div>
              </div>
              <div className="mt-6 flex gap-4">
                <Button className="rounded-full">Simulate Order</Button>
                <Button variant="outline" className="rounded-full">View Portfolio</Button>
              </div>
            </div>
            <div className={cn(currentSlide===2 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2', 'transition-all duration-300 bg-white/5 p-8 rounded-3xl border border-white/10') } id="view-portfolio">
              <h3 className="text-2xl font-bold mb-6">Portfolio (Preview)</h3>
              <div className="grid grid-cols-3 gap-4 text-sm text-gray-300">
                <div className="col-span-1">BTC/USDT</div>
                <div className="col-span-1">Qty 0.50</div>
                <div className="col-span-1">PnL +$230.12</div>
                <div className="col-span-1">ETH/USDT</div>
                <div className="col-span-1">Qty 3.00</div>
                <div className="col-span-1">PnL +$120.55</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-12">Verified Testimonials</h2>
          <Testimonials />
        </div>
      </section>

      <section className="py-24 bg-[#050505] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-10 text-center">Asset Classes</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
              <h3 className="text-xl font-bold mb-3">Crypto</h3>
              <p className="text-gray-400 mb-4">Top coins and pairs including BTC/USDT and ETH/USDT.</p>
              <div className="text-sm text-gray-300">BTC/USDT • ETH/USDT • SOL/USDT</div>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
              <h3 className="text-xl font-bold mb-3">Forex</h3>
              <p className="text-gray-400 mb-4">Major pairs with indicative spreads: {fxSpreadText || '—'}</p>
              <div className="text-sm text-gray-300">EUR/USD • USD/JPY • GBP/USD</div>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
              <h3 className="text-xl font-bold mb-3">Commodities</h3>
              <p className="text-gray-400 mb-4">Metals and energy markets including Gold and Oil.</p>
              <div className="text-sm text-gray-300">Gold • Crude Oil • Silver</div>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
              <h3 className="text-xl font-bold mb-3">Indices</h3>
              <p className="text-gray-400 mb-4">Global indices for diversified exposure.</p>
              <div className="text-sm text-gray-300">S&P 500 • NASDAQ • DAX</div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CTA Section */}
      <section className="py-24 bg-gradient-to-b from-black to-[#050505]">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-10">
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-xs uppercase tracking-[0.3em]">
            Premium Onboarding Window • Limited Slots Weekly
          </div>
          <h2 className="text-5xl font-bold leading-tight">Ready to Start Trading?</h2>
          <p className="text-lg text-gray-300 max-w-3xl mx-auto">
            Get instant access to the Binapex execution suite, institutional liquidity, and a dedicated success partner who optimizes every entry and exit you take.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button size="lg" className="h-16 px-10 text-lg font-bold bg-gradient-to-r from-primary via-amber-300 to-amber-100 text-black rounded-full flex items-center gap-3 shadow-[0_0_30px_rgba(245,158,11,0.45)] hover:scale-105 transition-transform">
              <ArrowRight className="w-5 h-5" />
              OPEN LIVE ACCOUNT
            </Button>
            <Button size="lg" className="h-16 px-8 text-lg font-bold bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center gap-3">
              Book VIP Call
            </Button>
          </div>
          <div className="max-w-xl mx-auto grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-center">
            <Label htmlFor="cta-email" className="sr-only">Email</Label>
            <Input id="cta-email" type="email" placeholder="you@company.com" aria-label="Email signup" />
            <Button className="h-10">Subscribe</Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 text-sm text-gray-400 justify-center">
            <span>• Instant verification</span>
            <span>• Dedicated success manager</span>
            <span>• Concierge funding support</span>
          </div>
          <div className="grid md:grid-cols-2 gap-6 text-left mt-10">
            <Button size="lg" className="h-auto py-6 px-8 flex flex-col items-start bg-white/5 hover:bg-white/10 rounded-3xl border border-white/10 text-left">
              <span className="text-sm uppercase tracking-[0.3em] text-gray-400">WhatsApp Desk</span>
              <span className="text-2xl font-bold text-white">Response in under 2 minutes</span>
            </Button>
            <Button size="lg" className="h-auto py-6 px-8 flex flex-col items-start bg-white/5 hover:bg-white/10 rounded-3xl border border-white/10 text-left">
              <span className="text-sm uppercase tracking-[0.3em] text-gray-400">Telegram Desk</span>
              <span className="text-2xl font-bold text-white">VIP Broadcast & Signals</span>
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button size="lg" className="h-16 px-8 text-lg font-bold bg-[#25D366] hover:bg-[#25D366]/90 text-white rounded-full flex items-center gap-3 shadow-[0_0_25px_rgba(37,211,102,0.35)]">
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="fill-white stroke-none"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              WHATSAPP
            </Button>
            <Button size="lg" className="h-16 px-8 text-lg font-bold bg-[#0088cc] hover:bg-[#0088cc]/90 text-white rounded-full flex items-center gap-3 shadow-[0_0_25px_rgba(0,136,204,0.35)]">
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="fill-white stroke-none"><path d="M21.636 3.004c.271-.076.571-.031.796.113.224.144.359.387.359.654 0 0-.342 18.337-.342 18.337 0 .18-.088.354-.235.468-.147.114-.339.151-.517.102l-7.388-2.067-3.602 4.266c-.156.185-.392.284-.633.266-.241-.018-.459-.151-.582-.356l-1.758-3.156-4.714-1.471c-.218-.068-.385-.242-.439-.461-.055-.219.011-.451.173-.611l18.882-15.178zM5.377 15.519l3.584 1.118 1.462 2.624 2.461-2.914-.959-3.248-6.548 2.42zm14.06-10.892L4.632 14.453l5.82 1.816 8.985-7.644z"/></svg>
              TELEGRAM
            </Button>
          </div>
        </div>
      </section>

      {/* 7. Footer & Legal */}
      <footer className="bg-black py-16 border-t border-white/5 text-xs text-gray-500 leading-relaxed">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
           <p>
             <strong>Uni Fin Invest</strong>, company registration number: C186509. Registration address: Rue De La Democratie, office 306, 3rd floor, Ebene Junction, Ebene 72201, Mauritius. Business address: 90 St Jean Road, Office Number 104, Palm Court Offices, 1st Floor, Quatre Bornes, Mauritius.
           </p>
           <p>
             <strong>iDinar LTD</strong>, registration number: HY00623410, international brokerage and clearing house license number: T2023320, issued by Mwali International Services Authority. Registered address: Bonovo Road – Fomboni, Island of Moheli, Comoros Union. Business address: Foti Kolakidi 16, 1st Floor, Agia Zoni, 3031, Limassol, Cyprus.
           </p>
           <p className="italic">
             The entities above are authorised to operate under the iDinar brand and trademarks.
           </p>
           <div className="h-px bg-white/5 my-6" />
           <p>
             <strong>Restricted Notice:</strong> Restricted regions: the entities above do not provide services including, but not limited to, citizens of the European Union and the United States of America and residents of Canada, the European Union, India, Iran, Myanmar, North Korea, Pakistan, the Philippines, the United Kingdom, and the United States of America. The content on this website does not constitute investment advice, nor does it constitute a recommendation or solicitation for any investment activities.
           </p>
           <p>
             <strong>Risk Disclaimer:</strong> Our services relate to complex derivative products that are traded over the counter. Trading with leverage involves a high level of risk and may not be suitable for all investors. Investing carries risks, and individuals should carefully consider their investment objectives, level of experience, and risk tolerance before making any investment decisions. Traders using arbitrage may be subject to overnight trading commissions. Trade fairly.
           </p>
           <div className="mt-12 text-center opacity-30">
             © 2025 BINAPEX. All rights reserved.
           </div>
        </div>
      </footer>
    </div>
  );
}

function Testimonials() {
  const toProxy = (url: string) => `/api/assets/proxy?url=${encodeURIComponent(url)}`;
  const list = [
    { name: 'Aisha Karim', title: 'Crypto Trader', rating: 5, text: 'The analytics and execution speed helped me scale my strategies.', img: 'https://images.unsplash.com/photo-1554151228-14d9def5cc1b?q=80&w=200&auto=format&fit=crop' },
    { name: 'David Chen', title: 'Commodities Specialist', rating: 5, text: 'Clean UI, reliable platform, and great support from the team.', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop' },
    { name: 'Sophia Martinez', title: 'Forex Analyst', rating: 5, text: 'Real-time charts with smooth performance across devices.', img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop' },
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setIdx((p) => (p + 1) % list.length), 5000);
    return () => window.clearInterval(t);
  }, [list.length]);
  return (
    <div className="relative">
      <div className="overflow-hidden">
        <div className="grid md:grid-cols-3 gap-8">
          {list.map((t, i) => (
            <div key={t.name} className={cn('bg-white/5 p-8 rounded-3xl border border-white/10 transition-opacity', idx === i ? 'opacity-100' : 'opacity-60') }>
              <div className="flex items-center gap-4 mb-4">
                <Avatar>
                  <AvatarImage src={toProxy(t.img)} alt={t.name} loading="lazy" />
                  <AvatarFallback>{t.name.split(' ').map((s) => s[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-bold">{t.name}</div>
                  <div className="text-sm text-gray-400">{t.title}</div>
                </div>
              </div>
              <div className="flex text-yellow-400 mb-3">
                {Array.from({ length: t.rating }).map((_, k) => (<Star key={k} className="fill-current w-5 h-5" />))}
              </div>
              <p className="text-gray-300">{t.text}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-8 flex justify-center gap-4" role="navigation" aria-label="Testimonials controls">
        <button onClick={() => setIdx((p) => (p - 1 + list.length) % list.length)} aria-label="Previous testimonial" className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10"><ChevronLeft className="w-5 h-5" /></button>
        <button onClick={() => setIdx((p) => (p + 1) % list.length)} aria-label="Next testimonial" className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10"><ChevronRight className="w-5 h-5" /></button>
      </div>
    </div>
  );
}
