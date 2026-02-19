/**
 * Daily stock news update script
 * Standalone version of /api/cron route for GitHub Actions execution.
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
 *
 * Usage: npx tsx scripts/daily-update.ts
 */

import { createClient } from '@supabase/supabase-js';
import { ALL_STOCKS, getStocksByMarket } from '../src/config/stocks';
import type { MarketType } from '../src/types/stock';
import Parser from 'rss-parser';
import OpenAI from 'openai';

// ── Bootstrap ────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey || !openaiKey) {
  console.error('Missing required environment variables:');
  if (!supabaseUrl) console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  if (!openaiKey) console.error('  - OPENAI_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiKey });
const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'StockNewsBot/1.0' },
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildGoogleNewsURL(query: string, lang: 'ko' | 'en') {
  const hl = lang === 'ko' ? 'ko' : 'en';
  const gl = lang === 'ko' ? 'KR' : 'US';
  const ceid = lang === 'ko' ? 'KR:ko' : 'US:en';
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
}

function getSummaryPrompt(market: MarketType) {
  const expert = market === 'KOSPI' ? '한국 주식 뉴스 분석 전문가' : '미국 주식 뉴스 분석 전문가';
  return `당신은 ${expert}입니다.
주어진 뉴스 기사들을 분석하여 다음 JSON 형식으로 요약하세요:
{
  "summary": "한국어로 된 3-5문장 요약",
  "key_points": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
  "sentiment": "positive" | "negative" | "neutral"
}
반드시 유효한 JSON만 출력하세요.`;
}

function getAnalysisPrompt(market: MarketType) {
  const marketLabel = market === 'KOSPI' ? '한국 주식시장(KOSPI)' : '미국 주식시장(NASDAQ)';
  return `당신은 ${marketLabel} 분석 전문가입니다.
주어진 종목별 최근 뉴스를 분석하여, 가장 유망한 3개 종목을 선정하세요.
다음 JSON 형식으로만 출력하세요:
{
  "selected_stocks": [
    {"code": "종목코드", "name_ko": "종목명", "score": 85, "reason": "선정 이유 2-3문장"}
  ],
  "analysis_summary": "오늘의 종합 시장 분석 (한국어 3-5문장)"
}`;
}

async function translateNewsToKorean(
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

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const today = new Date().toISOString().split('T')[0];
  const results: { step: string; status: string; detail?: unknown }[] = [];

  console.log(`[daily-update] Starting daily update for ${today}`);

  // ===== Step 1: 뉴스 수집 (KOSPI + NASDAQ) =====
  console.log('[Step 1] Fetching news...');
  let totalInserted = 0;
  let totalSkipped = 0;

  for (const stock of ALL_STOCKS) {
    const isNasdaq = stock.market === 'NASDAQ';

    // 한국어 뉴스 (KOSPI만)
    if (!isNasdaq) {
      for (const keyword of stock.keywords_ko.slice(0, 1)) {
        try {
          const url = buildGoogleNewsURL(keyword, 'ko');
          const feed = await parser.parseURL(url);
          for (const item of feed.items.slice(0, 5)) {
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
            if (error) totalSkipped++;
            else totalInserted++;
          }
        } catch (err) {
          results.push({ step: `fetch:${stock.name_ko}:ko`, status: 'error', detail: String(err) });
        }
      }
    }

    // 영어 뉴스 (KOSPI + NASDAQ)
    for (const keyword of stock.keywords_en.slice(0, 1)) {
      try {
        const url = buildGoogleNewsURL(keyword, 'en');
        const feed = await parser.parseURL(url);
        const maxItems = isNasdaq ? 5 : 3;
        const rawItems = feed.items.slice(0, maxItems).filter((item) => item.title && item.link);

        if (isNasdaq && rawItems.length > 0) {
          const toTranslate = rawItems.map((item) => ({
            title: item.title!,
            description: item.contentSnippet?.slice(0, 500) || null,
          }));
          const translated = await translateNewsToKorean(toTranslate);

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
            if (error) totalSkipped++;
            else totalInserted++;
          }
        } else {
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
            if (error) totalSkipped++;
            else totalInserted++;
          }
        }
      } catch (err) {
        results.push({ step: `fetch:${stock.name_ko}:en`, status: 'error', detail: String(err) });
      }
    }
  }

  console.log(`[Step 1] Done - inserted: ${totalInserted}, skipped: ${totalSkipped}`);
  results.push({ step: 'fetch_news', status: 'ok', detail: { totalInserted, totalSkipped } });

  // ===== Step 2: 시장별 AI 분석 =====
  console.log('[Step 2] Running AI analysis...');
  let totalSummaryCost = 0;
  const markets: MarketType[] = ['KOSPI', 'NASDAQ'];

  for (const market of markets) {
    const marketStockCodes = getStocksByMarket(market).map((s) => s.code);

    const { data: stocks } = await supabase
      .from('stocks')
      .select('*')
      .eq('is_top_10', true)
      .eq('market', market);

    if (!stocks || stocks.length === 0) {
      console.log(`  [${market}] No stocks found, skipping`);
      results.push({ step: `analysis:${market}`, status: 'skipped', detail: 'No stocks found' });
      continue;
    }

    // Step 2a: 종목별 뉴스 요약
    console.log(`  [${market}] Summarizing news for ${stocks.length} stocks...`);
    for (const stock of stocks) {
      const { data: news } = await supabase
        .from('news_articles')
        .select('*')
        .eq('stock_code', stock.code)
        .order('published_at', { ascending: false })
        .limit(10);

      if (!news || news.length === 0) continue;

      const newsText = news
        .map((a: { title: string; description?: string }, i: number) =>
          `[${i + 1}] ${a.title}\n${(a.description || '').slice(0, 300)}`
        )
        .join('\n\n');

      const prompt = `종목: ${stock.name_ko} (${stock.code})\n\n최근 뉴스 ${news.length}건:\n${newsText}`;

      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: getSummaryPrompt(market) },
            { role: 'user', content: prompt },
          ],
          max_tokens: 500,
          temperature: 0.3,
        });

        const usage = completion.usage;
        const cost = usage
          ? usage.prompt_tokens * (0.15 / 1_000_000) + usage.completion_tokens * (0.6 / 1_000_000)
          : 0;
        totalSummaryCost += cost;

        const content = completion.choices[0]?.message?.content || '{}';
        let parsed;
        try {
          parsed = JSON.parse(content);
        } catch {
          parsed = { summary: content, key_points: [], sentiment: 'neutral' };
        }

        await supabase.from('ai_summaries').upsert(
          {
            stock_code: stock.code,
            summary_text: parsed.summary || content,
            key_points: parsed.key_points || [],
            sentiment_overall: parsed.sentiment || 'neutral',
            model: 'gpt-4o-mini',
            token_usage: usage?.total_tokens || 0,
            cost_usd: cost,
            date: today,
          },
          { onConflict: 'stock_code,date' }
        );

        console.log(`    ${stock.name_ko}: ${parsed.sentiment} ($${cost.toFixed(6)})`);
        results.push({
          step: `summary:${market}:${stock.name_ko}`,
          status: 'ok',
          detail: { sentiment: parsed.sentiment, tokens: usage?.total_tokens, cost: `$${cost.toFixed(6)}` },
        });
      } catch (err) {
        console.error(`    ${stock.name_ko}: ERROR - ${err}`);
        results.push({ step: `summary:${market}:${stock.name_ko}`, status: 'error', detail: String(err) });
      }
    }

    // Step 2b: 시장별 유망주 분석
    console.log(`  [${market}] Running potential stock analysis...`);
    try {
      const { data: allNews } = await supabase
        .from('news_articles')
        .select('*')
        .in('stock_code', marketStockCodes)
        .order('published_at', { ascending: false });

      const stockSummaries = stocks.map((stock: { code: string; name_ko: string; sector: string }) => {
        const stockNews = (allNews || []).filter((n: { stock_code: string }) => n.stock_code === stock.code);
        const headlines = stockNews
          .slice(0, 5)
          .map((n: { title: string }) => `- ${n.title}`)
          .join('\n');
        return `[${stock.code}] ${stock.name_ko} (${stock.sector})\n뉴스 ${stockNews.length}건:\n${headlines || '뉴스 없음'}`;
      });

      const marketLabel = market === 'KOSPI' ? 'KOSPI' : 'NASDAQ';
      const prompt = `오늘의 ${marketLabel} 주요 종목 뉴스:\n\n${stockSummaries.join('\n\n')}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: getAnalysisPrompt(market) },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1500,
        temperature: 0.3,
      });

      const usage = completion.usage;
      const cost = usage
        ? usage.prompt_tokens * (2.5 / 1_000_000) + usage.completion_tokens * (10 / 1_000_000)
        : 0;

      let content = completion.choices[0]?.message?.content || '{}';
      content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const analysis = JSON.parse(content);

      // 해당 시장의 기존 유망주 해제
      await supabase
        .from('stocks')
        .update({ is_high_potential: false, potential_score: null })
        .eq('is_high_potential', true)
        .eq('market', market);

      for (const selected of analysis.selected_stocks || []) {
        await supabase
          .from('stocks')
          .update({ is_high_potential: true, potential_score: selected.score })
          .eq('code', selected.code);
      }

      await supabase.from('daily_analysis').upsert(
        {
          analysis_date: today,
          market,
          selected_stocks: analysis.selected_stocks || [],
          analysis_summary: analysis.analysis_summary || '',
        },
        { onConflict: 'analysis_date,market' }
      );

      console.log(`  [${market}] Analysis done - ${(analysis.selected_stocks || []).length} stocks selected ($${cost.toFixed(6)})`);
      results.push({
        step: `potential_analysis:${market}`,
        status: 'ok',
        detail: {
          selected: analysis.selected_stocks,
          summary: analysis.analysis_summary,
          tokens: usage?.total_tokens,
          cost: `$${cost.toFixed(6)}`,
        },
      });

      await supabase.from('api_usage_log').insert([
        { service: 'openai', endpoint: `gpt-4o-mini:summaries:${market}`, tokens_used: 0, cost_usd: totalSummaryCost },
        { service: 'openai', endpoint: `gpt-4o:analysis:${market}`, tokens_used: usage?.total_tokens || 0, cost_usd: cost },
      ]);
    } catch (err) {
      console.error(`  [${market}] Analysis ERROR - ${err}`);
      results.push({ step: `potential_analysis:${market}`, status: 'error', detail: String(err) });
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  const errors = results.filter((r) => r.status === 'error');
  console.log(`\n[daily-update] Completed. ${results.length} steps, ${errors.length} errors.`);
  if (errors.length > 0) {
    console.log('Errors:');
    for (const e of errors) {
      console.log(`  - ${e.step}: ${e.detail}`);
    }
  }

  // Exit with error code if there were critical failures (analysis steps)
  const criticalErrors = errors.filter((e) => e.step.startsWith('potential_analysis'));
  if (criticalErrors.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[daily-update] Fatal error:', err);
  process.exit(1);
});
