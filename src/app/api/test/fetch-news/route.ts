import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { KOSPI_TOP_10 } from '@/config/stocks';
import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'StockNewsBot/1.0' },
});

function buildGoogleNewsURL(query: string, lang: 'ko' | 'en') {
  const hl = lang === 'ko' ? 'ko' : 'en';
  const gl = lang === 'ko' ? 'KR' : 'US';
  const ceid = lang === 'ko' ? 'KR:ko' : 'US:en';
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
}

export async function GET() {
  const supabase = createServerClient();
  const results: { stock: string; inserted: number; skipped: number; errors: string[] }[] = [];

  for (const stock of KOSPI_TOP_10) {
    const stockResult = { stock: `${stock.name_ko} (${stock.code})`, inserted: 0, skipped: 0, errors: [] as string[] };

    // 한국어 키워드로 RSS 수집
    for (const keyword of stock.keywords_ko.slice(0, 1)) {
      try {
        const url = buildGoogleNewsURL(keyword, 'ko');
        const feed = await parser.parseURL(url);
        const items = feed.items.slice(0, 5);

        for (const item of items) {
          if (!item.title || !item.link) continue;

          const { error } = await supabase.from('news_articles').upsert(
            {
              stock_code: stock.code,
              title: item.title,
              description: item.contentSnippet?.slice(0, 500) || null,
              url: item.link,
              source: 'Google News KR',
              language: 'ko',
              published_at: item.isoDate || new Date().toISOString(),
            },
            { onConflict: 'url', ignoreDuplicates: true }
          );

          if (error) {
            stockResult.skipped++;
          } else {
            stockResult.inserted++;
          }
        }
      } catch (err) {
        stockResult.errors.push(`KR RSS error: ${err}`);
      }
    }

    // 영어 키워드로 RSS 수집
    for (const keyword of stock.keywords_en.slice(0, 1)) {
      try {
        const url = buildGoogleNewsURL(keyword, 'en');
        const feed = await parser.parseURL(url);
        const items = feed.items.slice(0, 3);

        for (const item of items) {
          if (!item.title || !item.link) continue;

          const { error } = await supabase.from('news_articles').upsert(
            {
              stock_code: stock.code,
              title: item.title,
              description: item.contentSnippet?.slice(0, 500) || null,
              url: item.link,
              source: 'Google News EN',
              language: 'en',
              published_at: item.isoDate || new Date().toISOString(),
            },
            { onConflict: 'url', ignoreDuplicates: true }
          );

          if (error) {
            stockResult.skipped++;
          } else {
            stockResult.inserted++;
          }
        }
      } catch (err) {
        stockResult.errors.push(`EN RSS error: ${err}`);
      }
    }

    results.push(stockResult);
  }

  const totalInserted = results.reduce((sum, r) => sum + r.inserted, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);

  return NextResponse.json({
    success: true,
    summary: { totalInserted, totalSkipped, stocksProcessed: results.length },
    details: results,
  });
}
