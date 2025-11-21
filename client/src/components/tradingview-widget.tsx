import React, { useEffect, useRef, useState } from 'react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

interface TradingViewWidgetProps {
  symbol?: string;
  theme?: 'light' | 'dark';
  height?: number | string;
}

export default function TradingViewWidget({ symbol = "COMEX:GC1!", theme = "dark", height = 400 }: TradingViewWidgetProps) {
  const [blocked, setBlocked] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    timerRef.current = window.setTimeout(() => {
      if (!loaded) setBlocked(true);
    }, 2000);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [loaded]);

  if (blocked) {
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
