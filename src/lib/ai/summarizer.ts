import { complete } from './openai';
import { AI_CONFIG } from '@/config/constants';
import type { NewsArticle } from '@/types/news';

const SUMMARY_SYSTEM_PROMPT = `당신은 한국 주식 뉴스 분석 전문가입니다.
주어진 뉴스 기사들을 분석하여 다음 JSON 형식으로 요약하세요:
{
  "summary": "한국어로 된 3-5문장 요약",
  "key_points": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
  "sentiment": "positive" | "negative" | "neutral"
}
반드시 유효한 JSON만 출력하세요.`;

export interface SummaryResult {
  summary_text: string;
  key_points: string[];
  sentiment_overall: 'positive' | 'negative' | 'neutral';
  model: string;
  token_usage: number;
  cost_usd: number;
}

export async function summarizeNewsForStock(
  stockName: string,
  articles: NewsArticle[]
): Promise<SummaryResult> {
  if (articles.length === 0) {
    return {
      summary_text: `${stockName}에 대한 최근 뉴스가 없습니다.`,
      key_points: [],
      sentiment_overall: 'neutral',
      model: AI_CONFIG.summaryModel,
      token_usage: 0,
      cost_usd: 0,
    };
  }

  // 뉴스 10건 이상이면 GPT-4o 사용
  const model = articles.length >= 10 ? AI_CONFIG.analysisModel : AI_CONFIG.summaryModel;

  const newsText = articles
    .map((a, i) => `[${i + 1}] ${a.title}\n${a.description || ''}`.slice(0, 300))
    .join('\n\n');

  const prompt = `종목: ${stockName}\n\n최근 뉴스 ${articles.length}건:\n${newsText}`;

  const result = await complete(prompt, SUMMARY_SYSTEM_PROMPT, model, AI_CONFIG.maxTokensSummary);

  try {
    const parsed = JSON.parse(result.content);
    return {
      summary_text: parsed.summary || result.content,
      key_points: parsed.key_points || [],
      sentiment_overall: parsed.sentiment || 'neutral',
      model,
      token_usage: result.tokenUsage,
      cost_usd: result.costUsd,
    };
  } catch {
    return {
      summary_text: result.content,
      key_points: [],
      sentiment_overall: 'neutral',
      model,
      token_usage: result.tokenUsage,
      cost_usd: result.costUsd,
    };
  }
}
