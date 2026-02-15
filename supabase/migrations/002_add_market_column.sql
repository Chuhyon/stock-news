-- stocks 테이블에 market 컬럼 추가
ALTER TABLE stocks ADD COLUMN market VARCHAR(10) NOT NULL DEFAULT 'KOSPI';

-- daily_analysis 테이블에 market 컬럼 추가
ALTER TABLE daily_analysis ADD COLUMN market VARCHAR(10) NOT NULL DEFAULT 'KOSPI';

-- daily_analysis의 기존 unique constraint 제거 후 (analysis_date, market)으로 변경
ALTER TABLE daily_analysis DROP CONSTRAINT daily_analysis_analysis_date_key;
ALTER TABLE daily_analysis ADD CONSTRAINT daily_analysis_date_market_unique UNIQUE (analysis_date, market);
