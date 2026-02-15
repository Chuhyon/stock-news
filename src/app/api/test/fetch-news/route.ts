import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { ALL_STOCKS } from '@/config/stocks';
import Parser from 'rss-parser';
import OpenAI from 'openai';

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

async function translateNewsToKorean(
  openai: OpenAI,
  items: { title: string; description: string | null }[]
): Promise<{ title: string; description: string | null }[] | null> {
  if (items.length === 0) return [];
  try {
    const input = items.map((item, i) => ({
      id: i,
      title: item.title,
      description: item.description || '',
    }));
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator. Translate the following news titles and descriptions from English to Korean.
Return ONLY a JSON array in the same order:
[{"title": "한국어 제목", "description": "한국어 설명"}]
Keep company names, stock tickers, and proper nouns as-is. Translate naturally for Korean readers.`,
        },
        { role: 'user', content: JSON.stringify(input) },
      ],
      max_tokens: 1500,
      temperature: 0.2,
    });
    let content = completion.choices[0]?.message?.content || '[]';
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const translated = JSON.parse(content);
    if (!Array.isArray(translated) || translated.length !== items.length) return null;
    return translated.map((t: { title?: string; description?: string }, i: number) => ({
      title: t.title || items[i].title,
      description: t.description || items[i].description,
    }));
  } catch {
    return null;
  }
}

export async function GET() {
  const supabase = createServerClient();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const results: { stock: string; inserted: number; skipped: number; errors: string[] }[] = [];

  for (const stock of ALL_STOCKS) {
    const stockResult = { stock: `${stock.name_ko} (${stock.code})`, inserted: 0, skipped: 0, errors: [] as string[] };
    const isNasdaq = stock.market === 'NASDAQ';

    // 한국어 키워드로 RSS 수집 (KOSPI만)
    if (!isNasdaq) {
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
    }

    // 영어 키워드로 RSS 수집
    for (const keyword of stock.keywords_en.slice(0, 1)) {
      try {
        const url = buildGoogleNewsURL(keyword, 'en');
        const feed = await parser.parseURL(url);
        const maxItems = isNasdaq ? 5 : 3;
        const rawItems = feed.items.slice(0, maxItems).filter((item) => item.title && item.link);

        if (isNasdaq && rawItems.length > 0) {
          // NASDAQ: 번역 후 한국어로 저장
          const toTranslate = rawItems.map((item) => ({
            title: item.title!,
            description: item.contentSnippet?.slice(0, 500) || null,
          }));
          const translated = await translateNewsToKorean(openai, toTranslate);

          for (let i = 0; i < rawItems.length; i++) {
            const item = rawItems[i];
            const tr = translated ? translated[i] : null;
            const { error } = await supabase.from('news_articles').upsert(
              {
                stock_code: stock.code,
                title: tr?.title || item.title!,
                description: tr?.description || item.contentSnippet?.slice(0, 500) || null,
                url: item.link!,
                source: 'Google News EN',
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
        } else {
          // KOSPI 영어 뉴스: 원문 그대로 저장
          for (const item of rawItems) {
            const { error } = await supabase.from('news_articles').upsert(
              {
                stock_code: stock.code,
                title: item.title!,
                description: item.contentSnippet?.slice(0, 500) || null,
                url: item.link!,
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
