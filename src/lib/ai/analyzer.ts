import { complete } from './openai';
import { AI_CONFIG, POTENTIAL_STOCKS_COUNT } from '@/config/constants';
import type { NewsArticle } from '@/types/news';
import type { Stock } from '@/types/stock';

const ANALYSIS_SYSTEM_PROMPT = `당신은 한국 주식시장 분석 전문가입니다.
주어진 종목별 뉴스 데이터를 분석하여, 가장 유망한 ${POTENTIAL_STOCKS_COUNT}개 종목을 선정하세요.

다음 JSON 형식으로 출력하세요:
{
  "selected_stocks": [
    {
      "code": "종목코드",
      "name_ko": "종목명",
      "score": 0-100 점수,
      "reason": "선정 이유 (2-3문장)"
    }
  ],
  "analysis_summary": "오늘의 종합 시장 분석 (3-5문장, 한국어)"
}
반드시 유효한 JSON만 출력하세요.`;

export interface AnalysisResult {
  selected_stocks: {
    code: string;
    name_ko: string;
    score: number;
    reason: string;
  }[];
  analysis_summary: string;
  token_usage: number;
  cost_usd: number;
}

export async function analyzeAndSelectPotential(
  stocks: Stock[],
  newsByStock: Record<string, NewsArticle[]>
): Promise<AnalysisResult> {
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

  const prompt = `오늘의 KOSPI 주요 종목 뉴스:\n\n${stockSummaries.join('\n\n')}`;

  const result = await complete(
    prompt,
    ANALYSIS_SYSTEM_PROMPT,
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
