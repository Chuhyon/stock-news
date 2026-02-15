import { complete } from './openai';
import { AI_CONFIG, POTENTIAL_STOCKS_COUNT } from '@/config/constants';
import type { NewsArticle } from '@/types/news';
import type { Stock, MarketType } from '@/types/stock';

function getAnalysisSystemPrompt(market: MarketType) {
  const marketLabel = market === 'KOSPI' ? '한국 주식시장(KOSPI)' : '미국 주식시장(NASDAQ)';
  return `당신은 ${marketLabel} 분석 전문가이며, 동시에 투자 심리학자이자 금융 역사학자의 시각을 갖추고 있습니다.
주어진 종목별 뉴스 데이터를 분석하여, 가장 유망한 ${POTENTIAL_STOCKS_COUNT}개 종목을 선정하세요.

분석 시 다음 관점을 반드시 종합하세요:
1. 기본 분석: 뉴스 긍정도, 성장 모멘텀, 업종 전망
2. 군중 심리 분석 (심리학자 관점): 현재 뉴스가 대중의 탐욕·공포·FOMO·확증편향 중 어떤 심리를 자극하는지 파악하고, 이에 따른 개인 투자자들의 매수·매도 쏠림 방향을 예측하세요. 과열 신호(미디어 과잉보도, 지나친 낙관론)나 과매도 신호(패닉셀, 과도한 비관론)가 있는지도 판단하세요.
3. 역사적 패턴 분석 (역사학자 관점): 과거 유사한 뉴스·이벤트(버블, 금리 전환기, 기술 패러다임 전환, 지정학 리스크 등)가 발생했을 때 시장과 해당 업종이 어떻게 반응했는지를 참고하여, 현재 상황의 역사적 유사성과 예상 전개를 분석하세요.

다음 JSON 형식으로 출력하세요:
{
  "selected_stocks": [
    {
      "code": "종목코드",
      "name_ko": "종목명",
      "score": 0-100 점수,
      "reason": "선정 이유 (2-3문장, 기본 분석 근거 포함)",
      "crowd_psychology": "군중 심리 분석 (1-2문장, 대중이 이 종목에 대해 어떤 심리 상태이며 어떻게 움직일지)",
      "historical_pattern": "역사적 패턴 분석 (1-2문장, 과거 유사 사례와 비교한 현재 위치 및 전망)"
    }
  ],
  "analysis_summary": "오늘의 종합 시장 분석 (3-5문장, 한국어, 심리·역사적 관점 포함)"
}
반드시 유효한 JSON만 출력하세요.`;
}

export interface AnalysisResult {
  selected_stocks: {
    code: string;
    name_ko: string;
    score: number;
    reason: string;
    crowd_psychology?: string;
    historical_pattern?: string;
  }[];
  analysis_summary: string;
  token_usage: number;
  cost_usd: number;
}

export async function analyzeAndSelectPotential(
  stocks: Stock[],
  newsByStock: Record<string, NewsArticle[]>,
  market: MarketType = 'KOSPI'
): Promise<AnalysisResult> {
  const marketLabel = market === 'KOSPI' ? 'KOSPI' : 'NASDAQ';

  const stockSummaries = stocks.map((stock) => {
    const news = newsByStock[stock.code] || [];
    const newsSnippets = news
      .slice(0, 5)
      .map((a) => `- ${a.title}`)
      .join('\n');

    return `[${stock.code}] ${stock.name_ko} (${stock.sector})
뉴스 ${news.length}건:
${newsSnippets || '뉴스 없음'}`;
  });

  const prompt = `오늘의 ${marketLabel} 주요 종목 뉴스:\n\n${stockSummaries.join('\n\n')}`;

  const result = await complete(
    prompt,
    getAnalysisSystemPrompt(market),
    AI_CONFIG.analysisModel,
    AI_CONFIG.maxTokensAnalysis
  );

  try {
    const parsed = JSON.parse(result.content);
    return {
      selected_stocks: parsed.selected_stocks || [],
      analysis_summary: parsed.analysis_summary || '',
      token_usage: result.tokenUsage,
      cost_usd: result.costUsd,
    };
  } catch {
    return {
      selected_stocks: [],
      analysis_summary: result.content,
      token_usage: result.tokenUsage,
      cost_usd: result.costUsd,
    };
  }
}
