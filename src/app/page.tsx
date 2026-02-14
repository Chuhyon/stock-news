import { createServerClient } from '@/lib/supabase/server';
import StockList from '@/components/stock/StockList';
import NewsFeed from '@/components/news/NewsFeed';
import { Sparkles, Newspaper, BarChart3 } from 'lucide-react';

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
      .limit(10);
    return data || [];
  } catch {
    return [];
  }
}

async function getDailyAnalysis() {
  try {
    const supabase = createServerClient();
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('daily_analysis')
      .select('*')
      .eq('analysis_date', today)
      .single();
    return data;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const [stocks, latestNews, dailyAnalysis] = await Promise.all([
    getStocks(),
    getLatestNews(),
    getDailyAnalysis(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const potentialStocks = stocks.filter((s: any) => s.is_high_potential);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const top10Stocks = stocks.filter((s: any) => s.is_top_10);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">
          KOSPI AI 뉴스 분석
        </h1>
        <p className="mt-2 text-gray-400">
          상위 10개 종목 뉴스를 수집하고, AI가 분석하여 매일 유망주를 선정합니다.
        </p>
      </div>

      {dailyAnalysis && (
        <section className="mb-10 rounded-xl border border-purple-500/20 bg-purple-500/5 p-6">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-bold text-white">오늘의 AI 시장 분석</h2>
          </div>
          <p className="text-sm leading-relaxed text-gray-300">
            {dailyAnalysis.analysis_summary}
          </p>
        </section>
      )}

      {potentialStocks.length > 0 && (
        <div className="mb-10">
          <StockList
            stocks={potentialStocks}
            title="AI 선정 유망주"
            description="오늘 AI가 뉴스 분석을 통해 선정한 유망 종목입니다"
          />
        </div>
      )}

      <div className="mb-10">
        <StockList
          stocks={top10Stocks}
          title="KOSPI TOP 10"
          description="시가총액 상위 10개 종목"
        />
      </div>

      {stocks.length === 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-12 text-center">
          <BarChart3 className="mx-auto mb-4 h-12 w-12 text-gray-600" />
          <h2 className="mb-2 text-lg font-semibold text-gray-300">
            데이터를 준비 중입니다
          </h2>
          <p className="text-sm text-gray-500">
            Supabase 데이터베이스를 설정하고 시드 데이터를 실행해주세요.
            <br />
            <code className="mt-2 inline-block rounded bg-gray-800 px-2 py-1 text-xs">
              supabase/seed.sql
            </code>
          </p>
        </div>
      )}

      <div className="mb-10">
        <div className="mb-4 flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold text-white">최신 뉴스</h2>
        </div>
        <NewsFeed articles={latestNews} showStockCode />
      </div>
    </div>
  );
}
