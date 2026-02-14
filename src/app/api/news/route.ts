import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const revalidate = 900;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '30');
    const offset = (page - 1) * limit;

    const supabase = createServerClient();

    const { data: news, error, count } = await supabase
      .from('news_articles')
      .select('*', { count: 'exact' })
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      articles: news || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch news' },
      { status: 500 }
    );
  }
}
