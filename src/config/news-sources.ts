export interface RSSSource {
  name: string;
  language: 'ko' | 'en';
  buildUrl: (query: string) => string;
}

export const RSS_SOURCES: RSSSource[] = [
  {
    name: 'Google News KR',
    language: 'ko',
    buildUrl: (query: string) =>
      `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`,
  },
  {
    name: 'Google News EN',
    language: 'en',
    buildUrl: (query: string) =>
      `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en&gl=US&ceid=US:en`,
  },
  {
    name: 'Naver News',
    language: 'ko',
    buildUrl: (query: string) =>
      `https://news.google.com/rss/search?q=${encodeURIComponent(query)}+site:naver.com&hl=ko&gl=KR&ceid=KR:ko`,
  },
];

export const NEWSAPI_CONFIG = {
  baseUrl: 'https://newsapi.org/v2',
  dailyLimit: 100,
  pageSize: 10,
};

export const NEWS_FETCH_CONFIG = {
  maxArticlesPerStockPerSource: 5,
  maxDescriptionLength: 500,
  fetchIntervalHours: 24,
};
