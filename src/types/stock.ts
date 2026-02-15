export type MarketType = 'KOSPI' | 'NASDAQ';

export interface Stock {
  code: string;
  name_ko: string;
  name_en: string;
  sector: string;
  market: MarketType;
  is_top_10: boolean;
  is_high_potential: boolean;
  potential_score: number | null;
  last_price: number | null;
  price_change_pct: number | null;
  created_at: string;
  updated_at: string;
}

export interface StockWithSummary extends Stock {
  latest_summary?: AISummary | null;
  news_count?: number;
}

export interface AISummary {
  id: string;
  stock_code: string;
  summary_text: string;
  key_points: string[];
  sentiment_overall: 'positive' | 'negative' | 'neutral';
  model: string;
  token_usage: number | null;
  cost_usd: number | null;
  date: string;
  created_at: string;
}

export interface DailyAnalysis {
  id: string;
  analysis_date: string;
  market: MarketType;
  selected_stocks: SelectedStock[];
  analysis_summary: string;
  created_at: string;
}

export interface SelectedStock {
  code: string;
  name_ko: string;
  score: number;
  reason: string;
}
