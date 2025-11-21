import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const rates: Record<string, number> = {
  USD: 1,
  USDT: 1,
  BTC: 50000,
  ETH: 3500,
  XAU: 2300,
};

export function toUSD(asset: string, amount: number): number {
  const r = rates[asset] || 1;
  return Math.round(amount * r * 100) / 100;
}

export function fmtUSD(v: number): string {
  return `$${v.toFixed(2)}`;
}
