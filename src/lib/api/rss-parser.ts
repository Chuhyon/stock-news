import Parser from 'rss-parser';
import { RSS_SOURCES, NEWS_FETCH_CONFIG } from '@/config/news-sources';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'StockNewsBot/1.0',
  },
});

interface ParsedArticle {
  title: string;
  description: string | null;
  url: string;
  source: string;
  language: 'ko' | 'en';
  published_at: string;
}

export async function fetchRSSForStock(
  query: string,
  stockCode: string
): Promise<ParsedArticle[]> {
  const results: ParsedArticle[] = [];

  for (const source of RSS_SOURCES) {
    try {
      const url = source.buildUrl(query);
      const feed = await parser.parseURL(url);
      const items = feed.items.slice(0, NEWS_FETCH_CONFIG.maxArticlesPerStockPerSource);

      for (const item of items) {
        if (!item.title || !item.link) continue;

        results.push({
          title: item.title,
          description: item.contentSnippet?.slice(0, NEWS_FETCH_CONFIG.maxDescriptionLength) || null,
          url: item.link,
          source: source.name,
          language: source.language,
          published_at: item.isoDate || new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(`RSS fetch failed for ${source.name}:`, err);
    }
  }

  return results;
}

export function mapRSSArticle(article: ParsedArticle, stockCode: string) {
  return {
    stock_code: stockCode,
    title: article.title,
    description: article.description,
    url: article.url,
    source: article.source,
    language: article.language,
    published_at: article.published_at,
  };
}
