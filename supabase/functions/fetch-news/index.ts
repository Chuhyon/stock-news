// Supabase Edge Function: 뉴스 수집 (매일 00:00 KST)
// pg_cron: SELECT cron.schedule('fetch-news', '0 15 * * *', $$SELECT net.http_post(...)$$);
// (00:00 KST = 15:00 UTC 전일)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RSSItem {
  title: string;
  link: string;
  contentSnippet?: string;
  isoDate?: string;
}

const STOCKS_KEYWORDS: Record<string, { ko: string[]; en: string[] }> = {
  '005930': { ko: ['삼성전자'], en: ['Samsung Electronics'] },
  '000660': { ko: ['SK하이닉스'], en: ['SK Hynix'] },
  '373220': { ko: ['LG에너지솔루션'], en: ['LG Energy Solution'] },
  '207940': { ko: ['삼성바이오로직스'], en: ['Samsung Biologics'] },
  '005380': { ko: ['현대차', '현대자동차'], en: ['Hyundai Motor'] },
  '051910': { ko: ['LG화학'], en: ['LG Chem'] },
  '006400': { ko: ['삼성SDI'], en: ['Samsung SDI'] },
  '035420': { ko: ['네이버', 'NAVER'], en: ['Naver'] },
  '035720': { ko: ['카카오'], en: ['Kakao'] },
  '028260': { ko: ['삼성물산'], en: ['Samsung C&T'] },
};

async function fetchGoogleNewsRSS(query: string, lang: string): Promise<RSSItem[]> {
  const hl = lang === 'ko' ? 'ko' : 'en';
  const gl = lang === 'ko' ? 'KR' : 'US';
  const ceid = lang === 'ko' ? 'KR:ko' : 'US:en';
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;

  try {
    const res = await fetch(url);
    const xml = await res.text();
    return parseRSSXML(xml);
  } catch (e) {
    console.error(`RSS fetch error: ${e}`);
    return [];
  }
}

function parseRSSXML(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = extractTag(itemXml, 'title');
    const link = extractTag(itemXml, 'link');
    const pubDate = extractTag(itemXml, 'pubDate');
    const description = extractTag(itemXml, 'description');

    if (title && link) {
      items.push({
        title: decodeHTMLEntities(title),
        link,
        contentSnippet: description ? decodeHTMLEntities(description).slice(0, 500) : undefined,
        isoDate: pubDate ? new Date(pubDate).toISOString() : undefined,
      });
    }
  }

  return items.slice(0, 5);
}

function extractTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([^<]*)</${tag}>`));
  return match ? (match[1] || match[2] || '').trim() : null;
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 모든 활성 종목 가져오기
    const { data: stocks } = await supabase
      .from('stocks')
      .select('code')
      .or('is_top_10.eq.true,is_high_potential.eq.true');

    if (!stocks || stocks.length === 0) {
      return new Response(JSON.stringify({ message: 'No stocks to fetch' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalInserted = 0;
    let totalSkipped = 0;

    for (const stock of stocks) {
      const keywords = STOCKS_KEYWORDS[stock.code];
      if (!keywords) continue;

      // 한국어 + 영어 뉴스 수집
      const allArticles: Array<{
        stock_code: string;
        title: string;
        description: string | null;
        url: string;
        source: string;
        language: string;
        published_at: string;
      }> = [];

      for (const keyword of keywords.ko) {
        const items = await fetchGoogleNewsRSS(keyword, 'ko');
        for (const item of items) {
          allArticles.push({
            stock_code: stock.code,
            title: item.title,
            description: item.contentSnippet || null,
            url: item.link,
            source: 'Google News KR',
            language: 'ko',
            published_at: item.isoDate || new Date().toISOString(),
          });
        }
      }

      for (const keyword of keywords.en) {
        const items = await fetchGoogleNewsRSS(keyword, 'en');
        for (const item of items) {
          allArticles.push({
            stock_code: stock.code,
            title: item.title,
            description: item.contentSnippet || null,
            url: item.link,
            source: 'Google News EN',
            language: 'en',
            published_at: item.isoDate || new Date().toISOString(),
          });
        }
      }

      // 중복 제거 후 삽입
      for (const article of allArticles) {
        const { error } = await supabase.from('news_articles').upsert(article, {
          onConflict: 'url',
          ignoreDuplicates: true,
        });

        if (error) {
          totalSkipped++;
        } else {
          totalInserted++;
        }
      }
    }

    // API 사용량 로깅
    await supabase.from('api_usage_log').insert({
      service: 'rss',
      endpoint: 'google-news',
      tokens_used: 0,
      cost_usd: 0,
    });

    return new Response(
      JSON.stringify({
        success: true,
        inserted: totalInserted,
        skipped: totalSkipped,
        stocks_processed: stocks.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
