import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const revalidate = 3600;

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const market = request.nextUrl.searchParams.get('market');

    let query = supabase
      .from('stocks')
      .select('*')
      .or('is_top_10.eq.true,is_high_potential.eq.true')
      .order('is_high_potential', { ascending: false })
      .order('code', { ascending: true });

    if (market) {
      query = query.eq('market', market);
    }

    const { data: stocks, error } = await query;

    if (error) throw error;

    const today = new Date().toISOString().split('T')[0];
    const { data: summaries } = await supabase
      .from('ai_summaries')
      .select('*')
      .eq('date', today);

    const summaryList = (summaries || []) as Array<{ stock_code: string; [key: string]: unknown }>;
    const stockList = (stocks || []) as Array<Record<string, unknown> & { code: string }>;

    const stocksWithSummary = stockList.map((stock) => ({
      ...stock,
      latest_summary: summaryList.find((s) => s.stock_code === stock.code) || null,
    }));

    return NextResponse.json(stocksWithSummary);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch stocks' },
      { status: 500 }
    );
  }
}
