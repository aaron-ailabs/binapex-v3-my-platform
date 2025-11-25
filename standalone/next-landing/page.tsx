"use client";
import dynamic from "next/dynamic";
import React from "react";
import {
  ArrowRight,
  ShieldCheck,
  Wallet,
  Smartphone,
  ChartCandlestick,
  Globe,
  Lock,
  Zap,
  Building,
} from "lucide-react";

const MotionDiv = dynamic(() => import("framer-motion").then(m => m.motion.div), { ssr: false });
const MotionSpan = dynamic(() => import("framer-motion").then(m => m.motion.span), { ssr: false });

export const metadata = {
  title: "Professional Multi-Asset Trading Platform | Binapex",
  description: "Trade Crypto, Forex, Commodities with institutional-grade tools and premium UX.",
};

export default function LandingPage() {
  const goldVars: React.CSSProperties = {
    ["--gold" as any]: "#FFD700",
    ["--gold-soft" as any]: "#FFC000",
    ["--gold-light" as any]: "#FFE27A",
  };

  const kpis = [
    { label: "24h Volume", value: "$1.25B" },
    { label: "Active Traders", value: "128,942" },
    { label: "Avg. Fill Time", value: "< 120ms" },
  ];

  const features = [
    { icon: ChartCandlestick, title: "Multi-Asset Trading", desc: "Crypto, Forex, Commodities" },
    { icon: Zap, title: "Real-Time Analytics", desc: "TradingView integration" },
    { icon: Wallet, title: "Secure Wallets", desc: "Cold storage segregation" },
    { icon: Building, title: "Multi-Role Platform", desc: "Trader, Support, Admin" },
    { icon: Smartphone, title: "Responsive Interface", desc: "Web + Mobile optimized" },
    { icon: ShieldCheck, title: "Advanced Security", desc: "2FA, KYC compliant" },
  ];

  const assets = [
    { title: "Crypto", items: ["BTC", "ETH", "SOL"], note: "Top liquidity pairs" },
    { title: "Forex", items: ["EUR/USD", "GBP/USD", "USD/JPY"], note: "Tier-1 FX" },
    { title: "Commodities", items: ["Gold", "Oil", "Silver"], note: "Futures-backed" },
    { title: "Indices", items: ["S&P 500", "NASDAQ", "DAX"], note: "Spot & futures" },
  ];

  return (
    <main style={goldVars} className="min-h-dvh w-full bg-gradient-to-b from-[#0b0f1a] via-[#0b0f1a] to-[#0a0d18] text-white">
      {/* LOGO PLACEHOLDER — Insert SVG later (preserve dimensions for brand consistency) */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <div aria-label="Brand" className="h-8 w-36 rounded-sm bg-white/5" />
        <nav className="hidden gap-6 md:flex">
          <a className="text-sm text-white/70 hover:text-white" href="#features">Features</a>
          <a className="text-sm text-white/70 hover:text-white" href="#preview">Preview</a>
          <a className="text-sm text-white/70 hover:text-white" href="#assets">Assets</a>
          <a className="text-sm text-white/70 hover:text-white" href="#security">Security</a>
        </nav>
        <a href="/auth/login" className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/80 hover:text-white">Sign In</a>
      </header>

      {/* HERO */}
      <section className="relative mx-auto w-full max-w-6xl px-6 pt-12 pb-10">
        <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">Professional Multi-Asset Trading Platform</h1>
          <p className="mt-4 max-w-2xl text-pretty text-white/75">Trade Crypto, Forex, and Commodities with institutional-grade tools, premium UX, and sub‑second execution.</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a href="/trader/live" className="inline-flex items-center rounded-lg bg-white text-black px-5 py-3 text-sm font-medium hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white">Start Trading <ArrowRight className="ml-2 h-4 w-4" /></a>
            <a href="/demo" className="inline-flex items-center rounded-lg border border-white/15 px-5 py-3 text-sm font-medium text-white/85 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40">View Demo</a>
          </div>
        </MotionDiv>

        {/* KPI BADGES — gold accents only */}
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-white/10 bg-[rgba(255,215,0,0.06)] p-4">
              <div className="text-xs text-white/60">{k.label}</div>
              <div className="mt-1 text-lg font-semibold" style={{ color: "var(--gold)" }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* MARKET TICKER */}
        <div aria-label="Live Ticker" className="mt-10 overflow-hidden rounded-lg border border-white/10">
          <div className="flex animate-[ticker_18s_linear_infinite] whitespace-nowrap">
            {[
              { s: "BTC", p: "$64,240", up: true },
              { s: "ETH", p: "$3,120", up: false },
              { s: "Gold", p: "$2,360", up: true },
              { s: "Oil", p: "$77.40", up: false },
              { s: "EUR/USD", p: "1.0823", up: true },
            ].map((t, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 text-sm">
                <span className="text-white/70">{t.s}</span>
                <span className={t.up ? "text-emerald-400" : "text-red-400"}>{t.p}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section id="features" className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-white/10 bg-[#0c1220] p-5">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5" style={{ color: "var(--gold)" }} />
                <div className="text-sm font-medium">{title}</div>
              </div>
              <div className="mt-2 text-sm text-white/70">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PLATFORM PREVIEW */}
      <section id="preview" className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="rounded-2xl border border-white/10 bg-[#0c1220] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-medium">Trading Interface Preview</div>
            <div className="text-xs text-white/60">Animated transitions showcase dashboard modules</div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2 rounded-lg border border-white/10 bg-black/20 p-4">
              <div className="h-48 w-full rounded-md bg-black/30" aria-label="Chart canvas placeholder" />
              <div className="mt-3 h-8 w-full rounded-md bg-black/30" aria-label="Timeframe toolbar placeholder" />
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-4">
              <div className="h-28 w-full rounded-md bg-black/30" aria-label="Order form placeholder" />
              <div className="mt-3 h-10 w-full rounded-md bg-black/30" aria-label="Submit button placeholder" />
            </div>
          </div>
        </div>
      </section>

      {/* ASSET CLASSES */}
      <section id="assets" className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
          {assets.map((a) => (
            <div key={a.title} className="rounded-xl border border-white/10 bg-[#0c1220] p-5">
              <div className="text-sm font-semibold" style={{ color: "var(--gold)" }}>{a.title}</div>
              <div className="mt-2 text-sm text-white/80">{a.items.join(" · ")}</div>
              <div className="mt-2 text-xs text-white/60">{a.note}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            { t: "Sign Up & Verify", i: Globe },
            { t: "Fund Your Account", i: Wallet },
            { t: "Start Trading", i: ChartCandlestick },
          ].map((s, idx) => (
            <div key={s.t} className="rounded-xl border border-white/10 bg-[#0c1220] p-5">
              <div className="flex items-center gap-3">
                <s.i className="h-5 w-5" style={{ color: "var(--gold)" }} />
                <div className="text-sm font-medium">Step {idx + 1}</div>
              </div>
              <div className="mt-2 text-sm">{s.t}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            { n: "Alex R.", role: "Crypto Scalper", text: "Fast fills and pro charts improved my edge." },
            { n: "Maya T.", role: "FX Swing", text: "Reliable execution with premium UX." },
            { n: "Daniel K.", role: "Commodities", text: "Great dashboard for futures monitoring." },
          ].map((t) => (
            <div key={t.n} className="rounded-xl border border-white/10 bg-[#0c1220] p-5">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-white/10" aria-hidden />
                <div>
                  <div className="text-sm font-medium">{t.n}</div>
                  <div className="text-xs text-white/60">{t.role}</div>
                </div>
              </div>
              <div className="mt-3 text-sm text-white/85">{t.text}</div>
              <div className="mt-3 flex gap-1" aria-label="5-star rating">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="inline-block h-3 w-3 rounded-full" style={{ background: i < 5 ? "var(--gold)" : "#333" }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECURITY & COMPLIANCE */}
      <section id="security" className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="rounded-2xl border border-white/10 bg-[#0c1220] p-6">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5" style={{ color: "var(--gold)" }} />
            <div className="text-sm font-medium">Security & Compliance</div>
          </div>
          <ul className="mt-4 grid list-disc grid-cols-1 gap-3 pl-5 text-sm text-white/85 sm:grid-cols-2">
            <li>2FA, role-based access control</li>
            <li>KYC/AML compliant onboarding</li>
            <li>Encrypted data at rest and in transit</li>
            <li>Regular audits and penetration testing</li>
          </ul>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {["SOC 2", "ISO 27001", "PCI DSS", "GDPR"].map((b) => (
              <div key={b} className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-center text-xs text-white/70">{b} Ready</div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="rounded-2xl border border-white/10 bg-[#0c1220] p-6">
          <div className="text-lg font-semibold">Ready to Start Trading?</div>
          <form className="mt-4 flex flex-col gap-3 sm:flex-row" action="/subscribe" method="post">
            <label className="sr-only" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required placeholder="Enter your email" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-white/40" />
            <button type="submit" className="rounded-lg bg-white px-5 py-3 text-sm font-medium text-black hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white">Sign Up</button>
            <a href="/demo" className="rounded-lg border border-white/15 px-5 py-3 text-sm font-medium text-white/85 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40">Open Demo Account</a>
          </form>
          <div className="mt-4" aria-live="polite">
            <span className="text-xs text-white/60">Live chat available 24/7</span>
          </div>
        </div>
      </section>

      {/* STYLE HOOKS — GOLD ACCENTS ONLY FOR KPI & HIGHLIGHTS */}
      <style jsx>{`
        @keyframes ticker { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
      `}</style>
    </main>
  );
}

