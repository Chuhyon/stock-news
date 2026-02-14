import type { NewsArticle } from '@/types/news';
import NewsCard from './NewsCard';

interface NewsFeedProps {
  articles: NewsArticle[];
  title?: string;
  showStockCode?: boolean;
}

export default function NewsFeed({ articles, title, showStockCode }: NewsFeedProps) {
  return (
    <section>
      {title && <h2 className="mb-4 text-xl font-bold text-white">{title}</h2>}
      {articles.length === 0 ? (
        <p className="rounded-lg border border-gray-800 bg-gray-900 p-8 text-center text-sm text-gray-500">
          아직 수집된 뉴스가 없습니다.
        </p>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <NewsCard
              key={article.id}
              article={article}
              showStockCode={showStockCode}
            />
          ))}
        </div>
      )}
    </section>
  );
}
