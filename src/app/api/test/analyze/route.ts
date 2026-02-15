import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getStocksByMarket } from '@/config/stocks';
import type { MarketType } from '@/types/stock';
import OpenAI from 'openai';

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

export async function GET() {
  const supabase = createServerClient();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const today = new Date().toISOString().split('T')[0];

  const results: { step: string; status: string; detail?: unknown }[] = [];
  const markets: MarketType[] = ['KOSPI', 'NASDAQ'];

  for (const market of markets) {
    const marketStockCodes = getStocksByMarket(market).map((s) => s.code);

    // Step 1: 종목별 뉴스 요약 (GPT-4o-mini)
    const { data: stocks } = await supabase
      .from('stocks')
      .select('*')
      .eq('is_top_10', true)
      .eq('market', market);

    if (!stocks || stocks.length === 0) {
      results.push({ step: `${market}:stocks`, status: 'skipped', detail: 'No stocks found' });
      continue;
    }

    let totalSummaryCost = 0;

    for (const stock of stocks) {
      const { data: news } = await supabase
        .from('news_articles')
        .select('*')
        .eq('stock_code', stock.code)
        .order('published_at', { ascending: false })
        .limit(10);

      if (!news || news.length === 0) continue;

      const newsText = news
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((a: any, i: number) => `[${i + 1}] ${a.title}\n${(a.description || '').slice(0, 300)}`)
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
          step: `summary:${market}:${stock.name_ko}`,
          status: 'ok',
          detail: { sentiment: parsed.sentiment, tokens: usage?.total_tokens, cost: `$${cost.toFixed(6)}` },
        });
      } catch (err) {
        results.push({ step: `summary:${market}:${stock.name_ko}`, status: 'error', detail: String(err) });
      }
    }

    // Step 2: 유망주 분석 (GPT-4o)
    try {
      const { data: allNews } = await supabase
        .from('news_articles')
        .select('*')
        .in('stock_code', marketStockCodes)
        .order('published_at', { ascending: false });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stockSummaries = stocks.map((stock: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stockNews = (allNews || []).filter((n: any) => n.stock_code === stock.code);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const headlines = stockNews.slice(0, 5).map((n: any) => `- ${n.title}`).join('\n');
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

      // 새 유망주 설정
      for (const selected of analysis.selected_stocks || []) {
        await supabase
          .from('stocks')
          .update({ is_high_potential: true, potential_score: selected.score })
          .eq('code', selected.code);
      }

      // daily_analysis 저장
      await supabase.from('daily_analysis').upsert({
        analysis_date: today,
        market,
        selected_stocks: analysis.selected_stocks || [],
        analysis_summary: analysis.analysis_summary || '',
      }, { onConflict: 'analysis_date,market' });

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

      // 비용 로깅
      await supabase.from('api_usage_log').insert([
        { service: 'openai', endpoint: `gpt-4o-mini:summaries:${market}`, tokens_used: 0, cost_usd: totalSummaryCost },
        { service: 'openai', endpoint: `gpt-4o:analysis:${market}`, tokens_used: usage?.total_tokens || 0, cost_usd: cost },
      ]);
    } catch (err) {
      results.push({ step: `potential_analysis:${market}`, status: 'error', detail: String(err) });
    }
  }

  return NextResponse.json({
    success: true,
    results,
  });
}
