import { ExternalLink, Clock } from 'lucide-react';
import type { NewsArticle } from '@/types/news';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface NewsCardProps {
  article: NewsArticle;
  showStockCode?: boolean;
}

export default function NewsCard({ article, showStockCode }: NewsCardProps) {
  const sentimentDot = {
    positive: 'bg-green-500',
    negative: 'bg-red-500',
    neutral: 'bg-gray-500',
  };

  const timeAgo = formatDistanceToNow(new Date(article.published_at), {
    addSuffix: true,
    locale: ko,
  });

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-lg border border-gray-800 bg-gray-900 p-4 transition hover:border-gray-600"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-sm font-medium text-gray-200 group-hover:text-blue-400">
          {article.title}
        </h3>
        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-600 group-hover:text-gray-400" />
      </div>

      {article.description && (
        <p className="mb-3 line-clamp-2 text-xs text-gray-500">
          {article.description}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="rounded bg-gray-800 px-1.5 py-0.5">{article.source}</span>
        {showStockCode && (
          <span className="rounded bg-gray-800 px-1.5 py-0.5">{article.stock_code}</span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {timeAgo}
        </span>
        {article.sentiment && (
          <span className="flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${sentimentDot[article.sentiment] || sentimentDot.neutral}`} />
            {article.language === 'ko' ? '한' : 'EN'}
          </span>
        )}
      </div>
    </a>
  );
}
