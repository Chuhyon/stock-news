-- stocks 테이블
CREATE TABLE stocks (
  code VARCHAR(10) PRIMARY KEY,
  name_ko VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  sector VARCHAR(50) NOT NULL,
  is_top_10 BOOLEAN DEFAULT false,
  is_high_potential BOOLEAN DEFAULT false,
  potential_score DECIMAL(5,2),
  last_price DECIMAL(12,2),
  price_change_pct DECIMAL(6,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- news_articles 테이블
CREATE TABLE news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_code VARCHAR(10) NOT NULL REFERENCES stocks(code) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL UNIQUE,
  source VARCHAR(100) NOT NULL,
  language VARCHAR(5) NOT NULL DEFAULT 'ko',
  sentiment VARCHAR(20),
  published_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_news_stock_code ON news_articles(stock_code);
CREATE INDEX idx_news_published_at ON news_articles(published_at DESC);
CREATE INDEX idx_news_stock_published ON news_articles(stock_code, published_at DESC);

-- ai_summaries 테이블
CREATE TABLE ai_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_code VARCHAR(10) NOT NULL REFERENCES stocks(code) ON DELETE CASCADE,
  summary_text TEXT NOT NULL,
  key_points JSONB NOT NULL DEFAULT '[]',
  sentiment_overall VARCHAR(20) NOT NULL DEFAULT 'neutral',
  model VARCHAR(50) NOT NULL,
  token_usage INTEGER,
  cost_usd DECIMAL(10,6),
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(stock_code, date)
);

CREATE INDEX idx_summaries_stock_date ON ai_summaries(stock_code, date DESC);

-- daily_analysis 테이블
CREATE TABLE daily_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_date DATE NOT NULL UNIQUE,
  selected_stocks JSONB NOT NULL DEFAULT '[]',
  analysis_summary TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- api_usage_log 테이블
CREATE TABLE api_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service VARCHAR(50) NOT NULL,
  endpoint VARCHAR(200) NOT NULL,
  tokens_used INTEGER,
  cost_usd DECIMAL(10,6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_log_date ON api_usage_log(created_at DESC);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stocks_updated_at
  BEFORE UPDATE ON stocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS 정책 (읽기 전용 공개)
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stocks_read" ON stocks FOR SELECT USING (true);
CREATE POLICY "news_read" ON news_articles FOR SELECT USING (true);
CREATE POLICY "summaries_read" ON ai_summaries FOR SELECT USING (true);
CREATE POLICY "analysis_read" ON daily_analysis FOR SELECT USING (true);
