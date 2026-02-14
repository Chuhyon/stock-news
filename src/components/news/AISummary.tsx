import { Brain, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { AISummary as AISummaryType } from '@/types/stock';

interface AISummaryProps {
  summary: AISummaryType;
}

export default function AISummary({ summary }: AISummaryProps) {
  const sentimentConfig = {
    positive: {
      icon: TrendingUp,
      label: '긍정적',
      color: 'text-green-400',
      bg: 'bg-green-500/10 border-green-500/20',
    },
    negative: {
      icon: TrendingDown,
      label: '부정적',
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/20',
    },
    neutral: {
      icon: Minus,
      label: '중립',
      color: 'text-gray-400',
      bg: 'bg-gray-500/10 border-gray-500/20',
    },
  };

  const sentiment = sentimentConfig[summary.sentiment_overall as keyof typeof sentimentConfig] || sentimentConfig.neutral;
  const SentimentIcon = sentiment.icon;

  return (
    <div className={`rounded-xl border p-5 ${sentiment.bg}`}>
      <div className="mb-3 flex items-center gap-2">
        <Brain className="h-5 w-5 text-purple-400" />
        <h3 className="font-semibold text-white">AI 분석 요약</h3>
        <span className={`ml-auto flex items-center gap-1 text-sm ${sentiment.color}`}>
          <SentimentIcon className="h-4 w-4" />
          {sentiment.label}
        </span>
      </div>

      <p className="mb-4 text-sm leading-relaxed text-gray-300">
        {summary.summary_text}
      </p>

      {summary.key_points.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-medium text-gray-500">핵심 포인트</h4>
          <ul className="space-y-1.5">
            {summary.key_points.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex items-center gap-3 text-xs text-gray-600">
        <span>모델: {summary.model}</span>
        <span>분석일: {summary.date}</span>
      </div>
    </div>
  );
}
