import OpenAI from 'openai';
import { AI_CONFIG } from '@/config/constants';

let openaiClient: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export interface CompletionResult {
  content: string;
  tokenUsage: number;
  costUsd: number;
}

const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
  'gpt-4o': { input: 2.5 / 1_000_000, output: 10 / 1_000_000 },
};

export async function complete(
  prompt: string,
  systemPrompt: string,
  model: string = AI_CONFIG.summaryModel,
  maxTokens: number = AI_CONFIG.maxTokensSummary
): Promise<CompletionResult> {
  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.3,
  });

  const usage = response.usage;
  const pricing = PRICING[model] || PRICING['gpt-4o-mini'];
  const cost = usage
    ? usage.prompt_tokens * pricing.input + usage.completion_tokens * pricing.output
    : 0;

  return {
    content: response.choices[0]?.message?.content || '',
    tokenUsage: usage?.total_tokens || 0,
    costUsd: cost,
  };
}
