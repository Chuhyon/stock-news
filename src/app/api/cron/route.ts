import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { KOSPI_TOP_10 } from '@/config/stocks';
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

const SUMMARY_PROMPT = `당신은 한국 주식 뉴스 분석 전문가입니다.
주어진 뉴스 기사들을 분석하여 다음 JSON 형식으로 요약하세요:
{
  "summary": "한국어로 된 3-5문장 요약",
  "key_points": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
  "sentiment": "positive" | "negative" | "neutral"
}
반드시 유효한 JSON만 출력하세요.`;

const ANALYSIS_PROMPT = `당신은 한국 주식시장 분석 전문가입니다.
주어진 종목별 최근 뉴스를 분석하여, 가장 유망한 3개 종목을 선정하세요.
다음 JSON 형식으로만 출력하세요:
{
  "selected_stocks": [
    {"code": "종목코드", "name_ko": "종목명", "score": 85, "reason": "선정 이유 2-3문장"}
  ],
  "analysis_summary": "오늘의 종합 시장 분석 (한국어 3-5문장)"
}`;

export async function GET(request: NextRequest) {
  // CRON_SECRET 검증
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const today = new Date().toISOString().split('T')[0];
  const results: { step: string; status: string; detail?: unknown }[] = [];

  // ===== Step 1: 뉴스 수집 =====
  let totalInserted = 0;
  let totalSkipped = 0;

  for (const stock of KOSPI_TOP_10) {
    // 한국어 뉴스
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

    // 영어 뉴스
    for (const keyword of stock.keywords_en.slice(0, 1)) {
      try {
        const url = buildGoogleNewsURL(keyword, 'en');
        const feed = await parser.parseURL(url);
        for (const item of feed.items.slice(0, 3)) {
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
          if (error) totalSkipped++;
          else totalInserted++;
        }
      } catch (err) {
        results.push({ step: `fetch:${stock.name_ko}:en`, status: 'error', detail: String(err) });
      }
    }
  }

  results.push({
    step: 'fetch_news',
    status: 'ok',
    detail: { totalInserted, totalSkipped },
  });

  // ===== Step 2: AI 분석 =====
  const { data: stocks } = await supabase
    .from('stocks')
    .select('*')
    .eq('is_top_10', true);

  if (!stocks || stocks.length === 0) {
    return NextResponse.json({
      success: false,
      error: 'No stocks found for analysis',
      results,
    }, { status: 500 });
  }

  let totalSummaryCost = 0;

  // Step 2a: 종목별 뉴스 요약
  for (const stock of stocks) {
    const { data: news } = await supabase
      .from('news_articles')
      .select('*')
      .eq('stock_code', stock.code)
      .order('published_at', { ascending: false })
      .limit(10);

    if (!news || news.length === 0) continue;

    const newsText = news
      .map((a: any, i: number) => `[${i + 1}] ${a.title}\n${(a.description || '').slice(0, 300)}`)
      .join('\n\n');

    const prompt = `종목: ${stock.name_ko} (${stock.code})\n\n최근 뉴스 ${news.length}건:\n${newsText}`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SUMMARY_PROMPT },
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

      await supabase.from('ai_summaries').upsert({
        stock_code: stock.code,
        summary_text: parsed.summary || content,
        key_points: parsed.key_points || [],
        sentiment_overall: parsed.sentiment || 'neutral',
        model: 'gpt-4o-mini',
        token_usage: usage?.total_tokens || 0,
        cost_usd: cost,
        date: today,
      }, { onConflict: 'stock_code,date' });

      results.push({
        step: `summary:${stock.name_ko}`,
        status: 'ok',
        detail: { sentiment: parsed.sentiment, tokens: usage?.total_tokens, cost: `$${cost.toFixed(6)}` },
      });
    } catch (err) {
      results.push({ step: `summary:${stock.name_ko}`, status: 'error', detail: String(err) });
    }
  }

  // Step 2b: 유망주 분석
  try {
    const { data: allNews } = await supabase
      .from('news_articles')
      .select('*')
      .order('published_at', { ascending: false });

    const stockSummaries = stocks.map((stock: any) => {
      const stockNews = (allNews || []).filter((n: any) => n.stock_code === stock.code);
      const headlines = stockNews.slice(0, 5).map((n: any) => `- ${n.title}`).join('\n');
      return `[${stock.code}] ${stock.name_ko} (${stock.sector})\n뉴스 ${stockNews.length}건:\n${headlines || '뉴스 없음'}`;
    });

    const prompt = `오늘의 KOSPI 주요 종목 뉴스:\n\n${stockSummaries.join('\n\n')}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: ANALYSIS_PROMPT },
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

    await supabase
      .from('stocks')
      .update({ is_high_potential: false, potential_score: null })
      .eq('is_high_potential', true);

    for (const selected of analysis.selected_stocks || []) {
      await supabase
        .from('stocks')
        .update({ is_high_potential: true, potential_score: selected.score })
        .eq('code', selected.code);
    }

    await supabase.from('daily_analysis').upsert({
      analysis_date: today,
      selected_stocks: analysis.selected_stocks || [],
      analysis_summary: analysis.analysis_summary || '',
    }, { onConflict: 'analysis_date' });

    results.push({
      step: 'potential_analysis',
      status: 'ok',
      detail: {
        selected: analysis.selected_stocks,
        summary: analysis.analysis_summary,
        tokens: usage?.total_tokens,
        cost: `$${cost.toFixed(6)}`,
      },
    });

    await supabase.from('api_usage_log').insert([
      { service: 'openai', endpoint: 'gpt-4o-mini:summaries', tokens_used: 0, cost_usd: totalSummaryCost },
      { service: 'openai', endpoint: 'gpt-4o:analysis', tokens_used: usage?.total_tokens || 0, cost_usd: cost },
    ]);

    return NextResponse.json({
      success: true,
      total_cost_usd: `$${(totalSummaryCost + cost).toFixed(6)}`,
      results,
    });
  } catch (err) {
    results.push({ step: 'potential_analysis', status: 'error', detail: String(err) });
    return NextResponse.json({ success: false, results }, { status: 500 });
  }
}
