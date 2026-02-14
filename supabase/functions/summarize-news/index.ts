// Supabase Edge Function: 뉴스 요약 (매일 03:00 KST)
// pg_cron: SELECT cron.schedule('summarize-news', '0 18 * * *', $$SELECT net.http_post(...)$$);

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUMMARY_PROMPT = `당신은 한국 주식 뉴스 분석 전문가입니다.
주어진 뉴스 기사들을 분석하여 다음 JSON 형식으로 요약하세요:
{
  "summary": "한국어로 된 3-5문장 요약",
  "key_points": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
  "sentiment": "positive" | "negative" | "neutral"
}
반드시 유효한 JSON만 출력하세요.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY')! });

    // 활성 종목 가져오기
    const { data: stocks } = await supabase
      .from('stocks')
      .select('*')
      .or('is_top_10.eq.true,is_high_potential.eq.true');

    if (!stocks) throw new Error('No stocks found');

    const today = new Date().toISOString().split('T')[0];
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let totalCost = 0;
    let totalTokens = 0;
    let summarized = 0;

    for (const stock of stocks) {
      // 최근 24시간 뉴스
      const { data: news } = await supabase
        .from('news_articles')
        .select('*')
        .eq('stock_code', stock.code)
        .gte('published_at', since)
        .order('published_at', { ascending: false })
        .limit(20);

      if (!news || news.length === 0) {
        // 뉴스 없으면 기본 요약 저장
        await supabase.from('ai_summaries').upsert({
          stock_code: stock.code,
          summary_text: `${stock.name_ko}에 대한 최근 24시간 이내 뉴스가 없습니다.`,
          key_points: [],
          sentiment_overall: 'neutral',
          model: 'none',
          token_usage: 0,
          cost_usd: 0,
          date: today,
        }, { onConflict: 'stock_code,date' });
        continue;
      }

      // 뉴스 10건 이상이면 GPT-4o, 아니면 GPT-4o-mini
      const model = news.length >= 10 ? 'gpt-4o' : 'gpt-4o-mini';
      const newsText = news
        .map((a, i) => `[${i + 1}] ${a.title}\n${(a.description || '').slice(0, 300)}`)
        .join('\n\n');

      const prompt = `종목: ${stock.name_ko} (${stock.code})\n\n최근 뉴스 ${news.length}건:\n${newsText}`;

      const completion = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: SUMMARY_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
        temperature: 0.3,
      });

      const usage = completion.usage;
      const pricing = model === 'gpt-4o'
        ? { input: 2.5 / 1_000_000, output: 10 / 1_000_000 }
        : { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 };
      const cost = usage
        ? usage.prompt_tokens * pricing.input + usage.completion_tokens * pricing.output
        : 0;

      totalCost += cost;
      totalTokens += usage?.total_tokens || 0;

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
        model,
        token_usage: usage?.total_tokens || 0,
        cost_usd: cost,
        date: today,
      }, { onConflict: 'stock_code,date' });

      summarized++;
    }

    // 비용 로깅
    await supabase.from('api_usage_log').insert({
      service: 'openai',
      endpoint: 'summarize-news',
      tokens_used: totalTokens,
      cost_usd: totalCost,
    });

    return new Response(
      JSON.stringify({
        success: true,
        summarized,
        total_cost_usd: totalCost,
        total_tokens: totalTokens,
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
