import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const revalidate = 3600;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const supabase = createServerClient();

    const { data: stock, error } = await supabase
      .from('stocks')
      .select('*')
      .eq('code', code)
      .single();

    if (error || !stock) {
      return NextResponse.json({ error: 'Stock not found' }, { status: 404 });
    }

    const { data: summary } = await supabase
      .from('ai_summaries')
      .select('*')
      .eq('stock_code', code)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    const { count } = await supabase
      .from('news_articles')
      .select('*', { count: 'exact', head: true })
      .eq('stock_code', code);

    const stockObj = stock as Record<string, unknown>;

    return NextResponse.json({
      ...stockObj,
      latest_summary: summary || null,
      news_count: count || 0,
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch stock' },
      { status: 500 }
    );
  }
}
