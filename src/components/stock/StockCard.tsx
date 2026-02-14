import Link from 'next/link';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { StockWithSummary } from '@/types/stock';
import PotentialBadge from './PotentialBadge';

interface StockCardProps {
  stock: StockWithSummary;
}

export default function StockCard({ stock }: StockCardProps) {
  const changePct = stock.price_change_pct ?? 0;
  const isUp = changePct > 0;
  const isDown = changePct < 0;

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
          </div>
        )}

        {stock.last_price && (
          <div className="mb-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {stock.last_price.toLocaleString()}
            </span>
            <span className="text-sm text-gray-500">원</span>
            <span
              className={`ml-auto flex items-center gap-1 text-sm font-medium ${
                isUp ? 'text-red-400' : isDown ? 'text-blue-400' : 'text-gray-400'
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
