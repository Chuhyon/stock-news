export interface Database {
  public: {
    Tables: {
      stocks: {
        Row: {
          code: string;
          name_ko: string;
          name_en: string;
          sector: string;
          is_top_10: boolean;
          is_high_potential: boolean;
          potential_score: number | null;
          last_price: number | null;
          price_change_pct: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          name_ko: string;
          name_en: string;
          sector: string;
          is_top_10?: boolean;
          is_high_potential?: boolean;
          potential_score?: number | null;
          last_price?: number | null;
          price_change_pct?: number | null;
        };
        Update: Partial<Database['public']['Tables']['stocks']['Insert']>;
      };
      news_articles: {
        Row: {
          id: string;
          stock_code: string;
          title: string;
          description: string | null;
          url: string;
          source: string;
          language: string;
          sentiment: string | null;
          published_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          stock_code: string;
          title: string;
          description?: string | null;
          url: string;
          source: string;
          language: string;
          sentiment?: string | null;
          published_at: string;
        };
        Update: Partial<Database['public']['Tables']['news_articles']['Insert']>;
      };
      ai_summaries: {
        Row: {
          id: string;
          stock_code: string;
          summary_text: string;
          key_points: string[];
          sentiment_overall: string;
          model: string;
          token_usage: number | null;
          cost_usd: number | null;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          stock_code: string;
          summary_text: string;
          key_points: string[];
          sentiment_overall: string;
          model: string;
          token_usage?: number | null;
          cost_usd?: number | null;
          date: string;
        };
        Update: Partial<Database['public']['Tables']['ai_summaries']['Insert']>;
      };
      daily_analysis: {
        Row: {
          id: string;
          analysis_date: string;
          selected_stocks: Record<string, unknown>[];
          analysis_summary: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          analysis_date: string;
          selected_stocks: Record<string, unknown>[];
          analysis_summary: string;
        };
        Update: Partial<Database['public']['Tables']['daily_analysis']['Insert']>;
      };
      api_usage_log: {
        Row: {
          id: string;
          service: string;
          endpoint: string;
          tokens_used: number | null;
          cost_usd: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          service: string;
          endpoint: string;
          tokens_used?: number | null;
          cost_usd?: number | null;
        };
        Update: Partial<Database['public']['Tables']['api_usage_log']['Insert']>;
      };
    };
  };
}
