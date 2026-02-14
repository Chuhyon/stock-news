// Supabase Edge Function: 유망주 분석 (매일 02:00 KST)
// pg_cron: SELECT cron.schedule('analyze-potential', '0 17 * * *', $$SELECT net.http_post(...)$$);

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANALYSIS_PROMPT = `당신은 한국 주식시장 분석 전문가입니다.
주어진 종목별 최근 뉴스를 분석하여, 가장 유망한 3개 종목을 선정하세요.

다음 JSON 형식으로만 출력하세요:
{
  "selected_stocks": [
    {"code": "종목코드", "name_ko": "종목명", "score": 85, "reason": "선정 이유"}
  ],
  "analysis_summary": "오늘의 종합 시장 분석 (한국어 3-5문장)"
}`;

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

    // 모든 종목 가져오기
    const { data: stocks } = await supabase.from('stocks').select('*');
    if (!stocks) throw new Error('No stocks found');

    // 최근 24시간 뉴스
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: news } = await supabase
      .from('news_articles')
      .select('*')
      .gte('published_at', since)
      .order('published_at', { ascending: false });

    // 종목별 뉴스 정리
    const stockSummaries = stocks.map((stock) => {
      const stockNews = (news || []).filter((n) => n.stock_code === stock.code);
      const headlines = stockNews.slice(0, 5).map((n) => `- ${n.title}`).join('\n');
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

    // 기존 유망주 해제
    await supabase
      .from('stocks')
      .update({ is_high_potential: false, potential_score: null })
      .eq('is_high_potential', true);

    // 새 유망주 설정
    for (const selected of analysis.selected_stocks || []) {
      await supabase
        .from('stocks')
        .update({
          is_high_potential: true,
          potential_score: selected.score,
        })
        .eq('code', selected.code);
    }

    // daily_analysis 저장
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('daily_analysis').upsert({
      analysis_date: today,
      selected_stocks: analysis.selected_stocks || [],
      analysis_summary: analysis.analysis_summary || '',
    }, { onConflict: 'analysis_date' });

    // 비용 로깅
    await supabase.from('api_usage_log').insert({
      service: 'openai',
      endpoint: 'gpt-4o:analyze-potential',
      tokens_used: usage?.total_tokens || 0,
      cost_usd: cost,
    });

    return new Response(
      JSON.stringify({
        success: true,
        selected: analysis.selected_stocks,
        cost_usd: cost,
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
