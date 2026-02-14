export interface NewsArticle {
  id: string;
  stock_code: string;
  title: string;
  description: string | null;
  url: string;
  source: string;
  language: 'ko' | 'en';
  sentiment: 'positive' | 'negative' | 'neutral' | null;
  published_at: string;
  created_at: string;
}

export interface NewsSource {
  name: string;
  type: 'newsapi' | 'rss';
  language: 'ko' | 'en';
  url?: string;
}

export interface ApiUsageLog {
  id: string;
  service: string;
  endpoint: string;
  tokens_used: number | null;
  cost_usd: number | null;
  created_at: string;
}
