import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Globe, 
  ShieldCheck, 
  Zap, 
  Headset, 
  Star, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  Menu,
  X
} from 'lucide-react';
import { useLocation } from 'wouter';
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

const CRYPTO_ASSETS = [
  { name: "Bitcoin", symbol: "BTC", price: "$64,230.10", change: "+2.4%" },
  { name: "Ethereum", symbol: "ETH", price: "$3,450.20", change: "+1.8%" },
  { name: "Gold", symbol: "XAU", price: "$2,340.50", change: "+0.5%" },
  { name: "Solana", symbol: "SOL", price: "$145.30", change: "+5.2%" },
  { name: "Ripple", symbol: "XRP", price: "$0.62", change: "-0.1%" },
  { name: "Cardano", symbol: "ADA", price: "$0.45", change: "+1.2%" },
  { name: "Dogecoin", symbol: "DOGE", price: "$0.16", change: "+8.4%" },
  { name: "Tether", symbol: "USDT", price: "$1.00", change: "0.0%" },
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

const TRUST_QUOTES = [
  {
    name: "Mohd. Ikwan shah",
    loc: "Kuala Lumpur, Malaysia",
    text: "“Alhamdulilahh. Dapat pakai belanje bulan bulan..”"
  },
  {
    name: "Syed abdul malik",
    loc: "Sabah, Malaysia",
    text: "“Admin fast respon..very helpful..masyukkkk”"
  },
  {
    name: "Che Rozia",
    loc: "Johor, Malaysia",
    text: "“Alhamdulilahh. Dapat pakai belanje bulan bulan..”"
  }
];

export default function LandingPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [imgReady, setImgReady] = useState<Record<string, boolean>>({});

  const toProxy = (url: string) => `/api/assets/proxy?url=${encodeURIComponent(url)}`;

  useEffect(() => {
    const timers: number[] = [];
    CAROUSEL_SLIDES.forEach((s) => {
      if (imgReady[s.image]) return;
      const img = new Image();
      img.onload = () => setImgReady((prev) => ({ ...prev, [s.image]: true }));
      img.onerror = () => setImgReady((prev) => ({ ...prev, [s.image]: false }));
      img.src = toProxy(s.image);
      const t = window.setTimeout(() => {
        setImgReady((prev) => ({ ...prev, [s.image]: prev[s.image] ?? false }));
      }, 1500);
      timers.push(t);
    });
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

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
              <button className="hover:text-primary transition-colors">Markets</button>
              <button className="hover:text-primary transition-colors">Products</button>
              <button className="hover:text-primary transition-colors">Institutional</button>
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
                  <h1 className="text-5xl sm:text-7xl font-bold text-white leading-tight">
                    Elite Black & <span className="text-primary">Gold</span> Trading for Ambitious Portfolios
                  </h1>
                  <p className="text-xl text-gray-300 border-l-4 border-primary/60 pl-6">
                    Institutional-grade execution, concierge-level service, and instant onboarding designed for traders who demand more than a standard exchange.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button 
                      onClick={handleLoginClick}
                      size="lg" 
                      className="text-lg px-8 h-14 rounded-full bg-gradient-to-r from-primary via-amber-300 to-amber-200 text-black font-bold hover:scale-[1.02] transition-transform"
                    >
                      Open Live Account <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                    <Button
                      size="lg"
                      className="text-lg px-8 h-14 rounded-full border border-white/20 bg-white/5 text-white font-semibold hover:bg-white/10"
                    >
                      Book Strategy Call
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
        <div className="absolute bottom-10 right-10 z-20 flex gap-4">
          <button onClick={prevSlide} className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors backdrop-blur-sm">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button onClick={nextSlide} className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors backdrop-blur-sm">
            <ChevronRight className="w-6 h-6" />
          </button>
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

      {/* 3. Features Grid */}
      <section className="py-24 bg-[#050505] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Feature 1 */}
            <div className="group bg-gradient-to-b from-white/5 to-transparent hover:from-white/10 p-8 rounded-3xl transition-all border border-white/5 hover:border-primary/40 hover:-translate-y-1">
              <ShieldCheck className="w-12 h-12 text-primary mb-6" />
              <h3 className="text-2xl font-bold mb-4 text-white">Licensed and Regulated Broker</h3>
              <p className="text-gray-400 leading-relaxed">
                We are a licensed and regulated broker, providing a secure and transparent trading environment for our clients. The company is operating under the brand name iDinar are licensed by MISA in the Comoro Islands and FSCA in South Africa.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group bg-gradient-to-b from-white/5 to-transparent hover:from-white/10 p-8 rounded-3xl transition-all border border-white/5 hover:border-primary/40 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-primary">
                 <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Secure Platform</h3>
              <p className="text-gray-400 leading-relaxed">
                Our platform is built with state-of-the-art security protocols, including end-to-end encryption, multi-factor authentication, and advanced threat detection, ensuring that your digital assets and personal information are always protected against unauthorized access and cyber threats.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group bg-gradient-to-b from-white/5 to-transparent hover:from-white/10 p-8 rounded-3xl transition-all border border-white/5 hover:border-primary/40 hover:-translate-y-1">
              <Zap className="w-12 h-12 text-primary mb-6" />
              <h3 className="text-2xl font-bold mb-4 text-white">Instant Transactions</h3>
              <p className="text-gray-400 leading-relaxed">
                Experience lightning-fast execution of trades and transfers, powered by our high-performance infrastructure designed to handle thousands of transactions per second with minimal latency—ensuring you never miss a market opportunity.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group bg-gradient-to-b from-white/5 to-transparent hover:from-white/10 p-8 rounded-3xl transition-all border border-white/5 hover:border-primary/40 hover:-translate-y-1">
              <Headset className="w-12 h-12 text-green-400 mb-6" />
              <h3 className="text-2xl font-bold mb-4 text-white">24/7 Support</h3>
              <p className="text-gray-400 leading-relaxed">
                Our dedicated and professional support team is available 24/7 to assist you with any questions or issues, providing fast, reliable help whenever you need it—so you can trade with confidence and peace of mind.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Trust & Testimonials */}
      <section className="py-24 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-4">Traders around the world trust us</h2>
          <div className="flex items-center justify-center gap-2 mb-16">
            <div className="flex text-yellow-400">
              <Star className="fill-current w-5 h-5" />
              <Star className="fill-current w-5 h-5" />
              <Star className="fill-current w-5 h-5" />
              <Star className="fill-current w-5 h-5" />
              <Star className="fill-current w-5 h-5" />
            </div>
            <span className="text-xl font-medium">4.8 / 5.0 Rating based on 10,434 reviews</span>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {TRUST_QUOTES.map((t, i) => (
              <div key={i} className="bg-gradient-to-b from-white/5 to-transparent p-8 rounded-3xl border border-white/10 text-left">
                <p className="text-lg italic text-gray-300 mb-6">{t.text}</p>
                <div>
                  <h4 className="font-bold text-primary">{t.name}</h4>
                  <p className="text-sm text-gray-500">{t.loc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Crypto Assets Ticker */}
      <section className="py-16 bg-[#050505] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <h2 className="text-3xl font-bold mb-10 text-center">Buy Bitcoin, Ethereum and more cryptocurrencies</h2>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {CRYPTO_ASSETS.map((asset) => (
               <div key={asset.symbol} className="bg-white/5 p-4 rounded-2xl flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
                 <div>
                   <div className="font-bold">{asset.symbol}</div>
                   <div className="text-xs text-gray-400">{asset.name}</div>
                 </div>
                 <div className="text-right">
                   <div className="font-mono">{asset.price}</div>
                   <div className={cn("text-xs", asset.change.startsWith('+') ? "text-green-400" : asset.change === '0.0%' ? "text-gray-400" : "text-red-400")}>
                     {asset.change}
                   </div>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </section>

      {/* 6. CTA Section */}
      <section className="py-24 bg-gradient-to-b from-black to-[#050505]">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-10">
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-xs uppercase tracking-[0.3em]">
            Premium Onboarding Window • Limited Slots Weekly
          </div>
          <h2 className="text-5xl font-bold leading-tight">
            Ready to move from <span className="text-primary">good</span> returns to remarkable performance?
          </h2>
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
