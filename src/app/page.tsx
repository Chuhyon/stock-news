import { createServerClient } from '@/lib/supabase/server';
import MarketTabs from '@/components/market/MarketTabs';

export const revalidate = 3600;

async function getStocks() {
  try {
    const supabase = createServerClient();
    const { data: stocks } = await supabase
      .from('stocks')
      .select('*')
      .or('is_top_10.eq.true,is_high_potential.eq.true')
      .order('code');

    if (!stocks) return [];

    const today = new Date().toISOString().split('T')[0];
    const { data: summaries } = await supabase
      .from('ai_summaries')
      .select('*')
      .eq('date', today);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return stocks.map((stock: any) => ({
      ...stock,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      latest_summary: summaries?.find((s: any) => s.stock_code === stock.code) || null,
    }));
  } catch {
    return [];
  }
}

async function getLatestNews() {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('news_articles')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(20);
    return data || [];
  } catch {
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getDailyAnalyses(): Promise<Record<string, any>> {
  try {
    const supabase = createServerClient();
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('daily_analysis')
      .select('*')
      .eq('analysis_date', today);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: Record<string, any> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const item of (data || []) as any[]) {
      result[item.market || 'KOSPI'] = item;
    }
    return result;
  } catch {
    return {};
  }
}

export default async function HomePage() {
  const [stocks, latestNews, dailyAnalyses] = await Promise.all([
    getStocks(),
    getLatestNews(),
    getDailyAnalyses(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">
          AI 주식 뉴스 분석
        </h1>
        <p className="mt-2 text-gray-400">
          KOSPI & NASDAQ 상위 10개 종목 뉴스를 수집하고, AI가 분석하여 매일 유망주를 선정합니다.
        </p>
      </div>

      <MarketTabs
        allStocks={stocks}
        allNews={latestNews}
        dailyAnalyses={dailyAnalyses}
      />
    </div>
  );
}
