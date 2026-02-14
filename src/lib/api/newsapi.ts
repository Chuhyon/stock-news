import { NEWSAPI_CONFIG } from '@/config/news-sources';

interface NewsAPIArticle {
  title: string;
  description: string | null;
  url: string;
  source: { name: string };
  publishedAt: string;
}

interface NewsAPIResponse {
  status: string;
  totalResults: number;
  articles: NewsAPIArticle[];
}

export async function fetchFromNewsAPI(
  query: string,
  pageSize: number = NEWSAPI_CONFIG.pageSize
): Promise<NewsAPIArticle[]> {
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) throw new Error('NEWSAPI_KEY not configured');

  const url = new URL(`${NEWSAPI_CONFIG.baseUrl}/everything`);
  url.searchParams.set('q', query);
  url.searchParams.set('pageSize', String(pageSize));
  url.searchParams.set('sortBy', 'publishedAt');
  url.searchParams.set('language', 'en');
  url.searchParams.set('apiKey', apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`NewsAPI error: ${res.status} ${error}`);
  }

  const data: NewsAPIResponse = await res.json();
  return data.articles || [];
}

export function mapNewsAPIArticle(article: NewsAPIArticle, stockCode: string) {
  return {
    stock_code: stockCode,
    title: article.title,
    description: article.description?.slice(0, 500) || null,
    url: article.url,
    source: `NewsAPI:${article.source.name}`,
    language: 'en' as const,
    published_at: article.publishedAt,
  };
}
