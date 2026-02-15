import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import AISummary from '@/components/news/AISummary';
import NewsFeed from '@/components/news/NewsFeed';
import PotentialBadge from '@/components/stock/PotentialBadge';
import type { Metadata } from 'next';

export const revalidate = 3600;

interface Props {
  params: Promise<{ stockCode: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { stockCode } = await params;
  const supabase = createServerClient();
  const { data: stock } = await supabase
    .from('stocks')
    .select('name_ko, name_en')
    .eq('code', stockCode)
    .single();

  if (!stock) return { title: '종목을 찾을 수 없습니다' };

  return {
    title: `${stock.name_ko} (${stockCode}) | AI 주식 뉴스`,
    description: `${stock.name_ko} (${stock.name_en}) 관련 뉴스와 AI 분석을 확인하세요.`,
  };
}

async function getStockData(code: string) {
  const supabase = createServerClient();

  const [stockResult, summaryResult, newsResult] = await Promise.all([
    supabase.from('stocks').select('*').eq('code', code).single(),
    supabase
      .from('ai_summaries')
      .select('*')
      .eq('stock_code', code)
      .order('date', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('news_articles')
      .select('*')
      .eq('stock_code', code)
      .order('published_at', { ascending: false })
      .limit(30),
  ]);

  return {
    stock: stockResult.data,
    summary: summaryResult.data,
    news: newsResult.data || [],
  };
}

export default async function StockDetailPage({ params }: Props) {
  const { stockCode } = await params;
  const { stock, summary, news } = await getStockData(stockCode);

  if (!stock) notFound();

  const changePct = stock.price_change_pct ?? 0;
  const isUp = changePct > 0;
  const isDown = changePct < 0;
  const isNasdaq = stock.market === 'NASDAQ';

  const upColor = isNasdaq ? 'text-green-400' : 'text-red-400';
  const downColor = isNasdaq ? 'text-red-400' : 'text-blue-400';

  const formatPrice = (price: number) => {
    if (isNasdaq) {
      return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return price.toLocaleString();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        대시보드로 돌아가기
      </Link>

      <div className="mb-8">
        <div className="flex flex-wrap items-start gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white">{stock.name_ko}</h1>
            <p className="text-sm text-gray-500">
              {stock.name_en} &middot; {stock.code} &middot; {stock.sector}
              {stock.market && <> &middot; {stock.market}</>}
            </p>
          </div>
          {stock.is_high_potential && (
            <PotentialBadge score={stock.potential_score} />
          )}
        </div>

        {stock.last_price && (
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-4xl font-bold text-white">
              {formatPrice(stock.last_price)}
            </span>
            {!isNasdaq && <span className="text-lg text-gray-500">원</span>}
            <span
              className={`flex items-center gap-1 text-lg font-medium ${
                isUp ? upColor : isDown ? downColor : 'text-gray-400'
              }`}
            >
              {isUp ? <TrendingUp className="h-5 w-5" /> : isDown ? <TrendingDown className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
              {isUp ? '+' : ''}{changePct.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {summary && (
        <div className="mb-8">
          <AISummary summary={summary} />
        </div>
      )}

      <NewsFeed
        articles={news}
        title={`${stock.name_ko} 관련 뉴스 (${news.length}건)`}
      />
    </div>
  );
}
