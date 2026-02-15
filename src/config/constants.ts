export const SITE_NAME = 'AI 주식 뉴스';
export const SITE_DESCRIPTION = 'KOSPI & NASDAQ 상위 종목 뉴스를 AI로 분석합니다';

export const REVALIDATE = {
  stocks: 3600,      // 1시간
  news: 900,         // 15분
  summary: 86400,    // 24시간
} as const;

export const AI_CONFIG = {
  summaryModel: 'gpt-4o-mini' as const,
  analysisModel: 'gpt-4o' as const,
  maxTokensSummary: 500,
  maxTokensAnalysis: 1500,
  dailyCostLimitUsd: 3,
  batchSize: 5,
} as const;

export const POTENTIAL_STOCKS_COUNT = 3;
