import Link from 'next/link';
import { TrendingUp, TrendingDown, Minus, Brain, BookOpen } from 'lucide-react';
import type { StockWithSummary } from '@/types/stock';
import PotentialBadge from './PotentialBadge';

interface StockCardProps {
  stock: StockWithSummary;
  potentialReason?: string;
  crowdPsychology?: string;
  historicalPattern?: string;
}

export default function StockCard({ stock, potentialReason, crowdPsychology, historicalPattern }: StockCardProps) {
  const changePct = stock.price_change_pct ?? 0;
  const isUp = changePct > 0;
  const isDown = changePct < 0;

  const isNasdaq = stock.market === 'NASDAQ';

  const sentimentColor = {
    positive: 'text-green-400',
    negative: 'text-red-400',
    neutral: 'text-gray-400',
  };

  const sentimentLabel = {
    positive: '긍정',
    negative: '부정',
    neutral: '중립',
  };

  // KOSPI: 빨강(↑)/파랑(↓), NASDAQ: 초록(↑)/빨강(↓)
  const upColor = isNasdaq ? 'text-green-400' : 'text-red-400';
  const downColor = isNasdaq ? 'text-red-400' : 'text-blue-400';
  const currency = isNasdaq ? '$' : '원';

  const formatPrice = (price: number) => {
    if (isNasdaq) {
      return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return price.toLocaleString();
  };

  return (
    <Link href={`/stocks/${stock.code}`}>
      <div className="group rounded-xl border border-gray-800 bg-gray-900 p-5 transition hover:border-gray-600 hover:bg-gray-800/80">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white group-hover:text-blue-400">
              {stock.name_ko}
            </h3>
            <p className="text-xs text-gray-500">{stock.name_en}</p>
          </div>
          <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
            {stock.sector}
          </span>
        </div>

        {stock.is_high_potential && (
          <div className="mb-3">
            <PotentialBadge score={stock.potential_score} />
            {potentialReason && (
              <p className="mt-2 text-sm leading-relaxed text-amber-200/70">
                {potentialReason}
              </p>
            )}
            {crowdPsychology && (
              <div className="mt-2 flex gap-1.5 rounded-md bg-indigo-500/10 px-2.5 py-1.5">
                <Brain className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-400" />
                <p className="text-xs leading-relaxed text-indigo-300/80">
                  <span className="font-medium text-indigo-300">군중 심리</span> — {crowdPsychology}
                </p>
              </div>
            )}
            {historicalPattern && (
              <div className="mt-1.5 flex gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1.5">
                <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <p className="text-xs leading-relaxed text-emerald-300/80">
                  <span className="font-medium text-emerald-300">역사적 패턴</span> — {historicalPattern}
                </p>
              </div>
            )}
          </div>
        )}

        {stock.last_price && (
          <div className="mb-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {formatPrice(stock.last_price)}
            </span>
            {!isNasdaq && <span className="text-sm text-gray-500">{currency}</span>}
            <span
              className={`ml-auto flex items-center gap-1 text-sm font-medium ${
                isUp ? upColor : isDown ? downColor : 'text-gray-400'
              }`}
            >
              {isUp ? <TrendingUp className="h-4 w-4" /> : isDown ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
              {isUp ? '+' : ''}{changePct.toFixed(2)}%
            </span>
          </div>
        )}

        {stock.latest_summary && (
          <div className="border-t border-gray-800 pt-3">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">AI 분석</span>
              <span
                className={`text-xs ${sentimentColor[stock.latest_summary.sentiment_overall as keyof typeof sentimentColor] || 'text-gray-400'}`}
              >
                {sentimentLabel[stock.latest_summary.sentiment_overall as keyof typeof sentimentLabel] || '중립'}
              </span>
            </div>
            <p className="line-clamp-2 text-sm text-gray-300">
              {stock.latest_summary.summary_text}
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}
