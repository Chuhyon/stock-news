import type { MarketType } from '@/types/stock';

export async function fetchStockPrice(code: string, market: MarketType = 'KOSPI'): Promise<{
  price: number;
  changePct: number;
} | null> {
  try {
    const exchange = market === 'NASDAQ' ? 'NASDAQ' : 'KRX';
    const url = `https://www.google.com/finance/quote/${code}:${exchange}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!res.ok) return null;

    const html = await res.text();

    const priceMatch = html.match(/data-last-price="([^"]+)"/);
    const changeMatch = html.match(/data-last-normal-market-change-percent="([^"]+)"/);

    if (!priceMatch) return null;

    return {
      price: parseFloat(priceMatch[1]),
      changePct: changeMatch ? parseFloat(changeMatch[1]) : 0,
    };
  } catch {
    console.error(`Failed to fetch price for ${code}`);
    return null;
  }
}
