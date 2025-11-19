import React from 'react';

interface TradingViewWidgetProps {
  symbol?: string;
  theme?: 'light' | 'dark';
  height?: number | string;
}

export default function TradingViewWidget({ symbol = "COMEX:GC1!", theme = "dark", height = 400 }: TradingViewWidgetProps) {
  return (
    <div className="tradingview-widget-container w-full overflow-hidden rounded-lg border border-border bg-card" style={{ height }}>
      <iframe
        src={`https://www.tradingview.com/widgetembed/?symbol=${symbol}&interval=1D&theme=${theme}&style=1&timezone=Etc%2FUTC&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&save_image=false&details=true&calendar=true&hotlist=true`}
        width="100%"
        height="100%"
        frameBorder="0"
        allowTransparency
        scrolling="no"
        className="w-full h-full"
      />
    </div>
  );
}
