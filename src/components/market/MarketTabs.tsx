'use client';

import { useState } from 'react';
import { Sparkles, BarChart3, Newspaper } from 'lucide-react';
import type { StockWithSummary, MarketType, DailyAnalysis } from '@/types/stock';
import StockList from '@/components/stock/StockList';
import NewsFeed from '@/components/news/NewsFeed';

interface MarketTabsProps {
  allStocks: StockWithSummary[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allNews: any[];
  dailyAnalyses: Record<string, DailyAnalysis | null>;
}

const TABS: { key: MarketType; label: string }[] = [
  { key: 'KOSPI', label: 'KOSPI' },
  { key: 'NASDAQ', label: 'NASDAQ' },
];

export default function MarketTabs({ allStocks, allNews, dailyAnalyses }: MarketTabsProps) {
  const [activeTab, setActiveTab] = useState<MarketType>('KOSPI');

  const filteredStocks = allStocks.filter((s) => s.market === activeTab);
  const potentialStocks = filteredStocks.filter((s) => s.is_high_potential);
  const top10Stocks = filteredStocks.filter((s) => s.is_top_10);
  const dailyAnalysis = dailyAnalyses[activeTab];

  const stockCodes = filteredStocks.map((s) => s.code);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filteredNews = allNews.filter((n: any) => stockCodes.includes(n.stock_code));

  return (
    <>
      <div className="mb-8 flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {dailyAnalysis && (
        <section className="mb-10 rounded-xl border border-purple-500/20 bg-purple-500/5 p-6">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-bold text-white">
              오늘의 {activeTab} AI 시장 분석
            </h2>
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
            description={`오늘 AI가 ${activeTab} 뉴스 분석을 통해 선정한 유망 종목입니다`}
          />
        </div>
      )}

      <div className="mb-10">
        <StockList
          stocks={top10Stocks}
          title={`${activeTab} TOP 10`}
          description="시가총액 상위 10개 종목"
        />
      </div>

      {filteredStocks.length === 0 && (
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

      {filteredNews.length > 0 && (
        <div className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-blue-400" />
            <h2 className="text-xl font-bold text-white">{activeTab} 최신 뉴스</h2>
          </div>
          <NewsFeed articles={filteredNews.slice(0, 10)} showStockCode />
        </div>
      )}
    </>
  );
}
