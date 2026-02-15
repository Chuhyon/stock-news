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
            selectedStocks={dailyAnalysis?.selected_stocks}
          />
          <details className="mt-3 rounded-lg border border-gray-700/50 bg-gray-800/30 px-4 py-3">
            <summary className="cursor-pointer text-xs font-medium text-gray-400 hover:text-gray-300">
              선정 기준 안내
            </summary>
            <div className="mt-2 space-y-2 text-xs leading-relaxed text-gray-500">
              <p><span className="font-medium text-gray-400">1. 뉴스 수집</span> — 매일 자정(KST) Google News에서 {activeTab} 상위 10개 종목의 최신 뉴스를 자동 수집합니다.</p>
              <p><span className="font-medium text-gray-400">2. AI 종합 분석</span> — GPT-4o가 종목별 뉴스 헤드라인을 읽고 다음 요소를 종합적으로 평가합니다.</p>
              <ul className="ml-4 space-y-0.5 list-disc">
                <li><span className="text-gray-400">뉴스 긍정도</span> — 호재성 뉴스(실적 개선, 수주 확대, 신사업 진출 등)와 악재성 뉴스(실적 악화, 소송, 규제 리스크 등)의 비율을 평가합니다.</li>
                <li><span className="text-gray-400">성장 모멘텀</span> — 단순한 주가 등락이 아니라, 기업의 미래 성장 가능성을 시사하는 뉴스 신호를 분석합니다. 구체적으로 신규 사업 확장, 대규모 투자 유치, 핵심 기술 개발, 글로벌 시장 진출, 전략적 파트너십 체결, 정부 정책 수혜, 산업 내 점유율 확대 등 중장기 성장 동력에 해당하는 이벤트가 뉴스에 언급되는지를 평가합니다.</li>
                <li><span className="text-gray-400">업종 전망</span> — 해당 종목이 속한 업종(반도체, 바이오, IT 등)의 전반적인 시장 흐름과 트렌드를 반영합니다.</li>
              </ul>
              <p className="mt-1"><span className="font-medium text-indigo-400">3. 군중 심리 분석 (심리학자 관점)</span> — 현재 뉴스가 대중 투자자의 어떤 심리를 자극하는지 분석합니다.</p>
              <ul className="ml-4 space-y-0.5 list-disc">
                <li>탐욕(Greed) · 공포(Fear) · FOMO(놓칠까 봐 두려운 심리) · 확증편향 등 투자 심리 상태를 진단합니다.</li>
                <li>미디어 과잉보도나 지나친 낙관론에 의한 과열 신호, 패닉셀이나 과도한 비관론에 의한 과매도 신호를 감지합니다.</li>
                <li>개인 투자자들의 매수·매도 쏠림 방향을 예측하여, 군중과 반대로 움직여야 할 역발상 타이밍인지 판단합니다.</li>
              </ul>
              <p className="mt-1"><span className="font-medium text-emerald-400">4. 역사적 패턴 분석 (역사학자 관점)</span> — 과거 유사 사례를 참고하여 현재 상황의 위치를 진단합니다.</p>
              <ul className="ml-4 space-y-0.5 list-disc">
                <li>과거 버블, 금리 전환기, 기술 패러다임 전환, 지정학 리스크 등 유사 이벤트 발생 시 시장이 어떻게 반응했는지를 참고합니다.</li>
                <li>현재 상황이 역사적으로 어떤 국면(초기 상승, 과열, 조정, 바닥)에 해당하는지 비교 분석합니다.</li>
                <li>역사적 유사성에 기반하여 향후 예상 전개 방향을 제시합니다.</li>
              </ul>
              <p><span className="font-medium text-gray-400">5. 점수 산출 및 선정</span> — 위 요소를 종합하여 각 종목을 0~100점으로 채점하고, 상위 3개 종목이 &lsquo;AI 유망주&rsquo;로 선정됩니다. 점수와 선정 사유가 함께 표시됩니다.</p>
              <p className="text-gray-600">* 본 분석은 AI가 뉴스 텍스트만을 기반으로 자동 생성한 결과이며, 재무제표·주가 차트 등 정량 데이터는 반영되지 않습니다. 투자 조언이 아니므로 투자 판단은 본인 책임하에 이루어져야 합니다.</p>
            </div>
          </details>
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
