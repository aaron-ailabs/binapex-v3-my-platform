import React, { useEffect, useRef, useState } from 'react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

interface TradingViewWidgetProps {
  symbol?: string;
  theme?: 'light' | 'dark';
  height?: number | string;
  overviewSymbols?: string[];
  overviewOptions?: Partial<Record<string, any>>;
  advancedSymbol?: string;
  advancedOptions?: Partial<Record<string, any>>;
  watchlist?: string[];
}

export default function TradingViewWidget({ symbol = "COMEX:GC1!", theme = "dark", height = 400, overviewSymbols, overviewOptions, advancedSymbol, advancedOptions, watchlist }: TradingViewWidgetProps) {
  const [blocked, setBlocked] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    timerRef.current = window.setTimeout(() => {
      if (!loaded) setBlocked(true);
    }, 2500);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [loaded]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
    if (overviewSymbols && overviewSymbols.length) {
      setLoaded(true);
      const inner = document.createElement('div');
      inner.className = 'tradingview-widget-container__widget';
      el.appendChild(inner);
      const copyright = document.createElement('div');
      copyright.className = 'tradingview-widget-copyright';
      const a = document.createElement('a');
      a.href = 'https://www.tradingview.com/markets/';
      a.rel = 'noopener nofollow';
      a.target = '_blank';
      a.innerHTML = '<span class="blue-text">World markets</span>';
      copyright.appendChild(a);
      el.appendChild(copyright);
      const s = document.createElement('script');
      s.type = 'text/javascript';
      s.async = true;
      s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';
      s.onerror = () => setBlocked(true);
      const config: Record<string, any> = {
        lineWidth: 2,
        lineType: 0,
        chartType: 'candlesticks',
        showVolume: true,
        fontColor: 'rgb(106, 109, 120)',
        gridLineColor: 'rgba(242, 242, 242, 0.06)',
        volumeUpColor: 'rgba(34, 171, 148, 0.5)',
        volumeDownColor: 'rgba(247, 82, 95, 0.5)',
        backgroundColor: '#0F0F0F',
        widgetFontColor: '#DBDBDB',
        upColor: '#22ab94',
        downColor: '#f7525f',
        borderUpColor: '#22ab94',
        borderDownColor: '#f7525f',
        wickUpColor: '#22ab94',
        wickDownColor: '#f7525f',
        colorTheme: 'dark',
        isTransparent: false,
        locale: 'en',
        chartOnly: false,
        scalePosition: 'right',
        scaleMode: 'Normal',
        fontFamily: '-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif',
        valuesTracking: '1',
        changeMode: 'price-and-percent',
        symbols: overviewSymbols.map((s) => [s]),
        dateRanges: ['1d|1','1m|30','3m|60','12m|1D','60m|1W','all|1M'],
        fontSize: '10',
        headerFontSize: 'medium',
        autosize: true,
        width: '100%',
        height: '100%',
        noTimeScale: false,
        hideDateRanges: false,
        showMA: true,
        maLength: 9,
        maLineColor: '#2962FF',
        maLineWidth: 1,
        hideMarketStatus: false,
        hideSymbolLogo: false,
      };
      Object.assign(config, overviewOptions || {});
      s.innerHTML = JSON.stringify(config);
      el.appendChild(s);
      return () => {
        while (el.firstChild) el.removeChild(el.firstChild);
      };
    } else if (advancedSymbol) {
      setLoaded(true);
      const inner = document.createElement('div');
      inner.className = 'tradingview-widget-container__widget';
      inner.style.height = 'calc(100% - 32px)';
      inner.style.width = '100%';
      el.appendChild(inner);
      const copyright = document.createElement('div');
      copyright.className = 'tradingview-widget-copyright';
      const a = document.createElement('a');
      a.href = `https://www.tradingview.com/symbols/${encodeURIComponent(advancedSymbol.split(':')[1] || advancedSymbol)}/`;
      a.rel = 'noopener nofollow';
      a.target = '_blank';
      a.innerHTML = '<span class="blue-text">Commodity chart</span><span class="trademark"> by TradingView</span>';
      copyright.appendChild(a);
      el.appendChild(copyright);
      const s = document.createElement('script');
      s.type = 'text/javascript';
      s.async = true;
      s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
      s.onerror = () => setBlocked(true);
      const config: Record<string, any> = {
        allow_symbol_change: true,
        calendar: false,
        details: false,
        hide_side_toolbar: false,
        hide_top_toolbar: false,
        hide_legend: false,
        hide_volume: false,
        hotlist: false,
        interval: '1D',
        locale: 'en',
        save_image: true,
        style: '1',
        symbol: advancedSymbol,
        theme: theme,
        timezone: 'Asia/Singapore',
        backgroundColor: '#0F0F0F',
        gridColor: 'rgba(242, 242, 242, 0.06)',
        watchlist: watchlist || [],
        withdateranges: true,
        compareSymbols: [],
        studies: ['RSI@tv-basicstudies','MACD@tv-basicstudies','BB@tv-basicstudies'],
        autosize: true,
      };
      Object.assign(config, advancedOptions || {});
      s.innerHTML = JSON.stringify(config);
      el.appendChild(s);
      return () => {
        while (el.firstChild) el.removeChild(el.firstChild);
      };
    }
  }, [overviewSymbols, overviewOptions, advancedSymbol, advancedOptions, watchlist, theme]);

  if (blocked && !overviewSymbols?.length && !advancedSymbol) {
    const data = Array.from({ length: 30 }, (_, i) => ({ x: i + 1, y: 100 + Math.round(Math.sin(i / 3) * 8 + Math.random() * 6) }));
    return (
      <div className="w-full overflow-hidden rounded-lg border border-border bg-card" style={{ height }}>
        <ChartContainer
          config={{ price: { label: 'Price', color: 'hsl(var(--primary))' } }}
          className="h-full"
        >
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="y" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
          </LineChart>
        </ChartContainer>
      </div>
    );
  }

  if (blocked) {
    const data = Array.from({ length: 60 }, (_, i) => ({ x: i + 1, y: 100 + Math.round(Math.sin(i / 3) * 8 + Math.random() * 6) }));
    return (
      <div className="w-full overflow-hidden rounded-lg border border-border bg-card" style={{ height }}>
        <ChartContainer
          config={{ price: { label: 'Price', color: 'hsl(var(--primary))' } }}
          className="h-full"
        >
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="y" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
          </LineChart>
        </ChartContainer>
      </div>
    );
  }
  if (overviewSymbols && overviewSymbols.length) {
    return <div ref={containerRef} className="tradingview-widget-container w-full overflow-hidden rounded-lg border border-border bg-card" style={{ height }} />;
  }
  if (advancedSymbol) {
    return <div ref={containerRef} className="tradingview-widget-container w-full overflow-hidden rounded-lg border border-border bg-card" style={{ height }} />;
  }

  return (
    <div className="tradingview-widget-container w-full overflow-hidden rounded-lg border border-border bg-card" style={{ height }}>
      <iframe
        src={`https://www.tradingview.com/widgetembed/?symbol=${symbol}&interval=1D&theme=${theme}&style=1&timezone=Etc%2FUTC&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&save_image=false&details=true&calendar=true&hotlist=true`}
        width="100%"
        height="100%"
        frameBorder="0"
        className="w-full h-full"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
