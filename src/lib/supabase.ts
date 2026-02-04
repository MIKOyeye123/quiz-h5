import { createClient } from '@supabase/supabase-js';

// 请替换为你的 Supabase 项目 URL 和 anon key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL 或 Key 未配置，请设置环境变量 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Supabase 数据库类型定义
export type Database = {
  public: {
    Tables: {
      questions: {
        Row: {
          id: string;
          user_id: string;
          question: string;
          options: { A: string; B: string; C: string; D: string };
          answer: 'A' | 'B' | 'C' | 'D';
          option_explanations: { A: string; B: string; C: string; D: string };
          chapter_no: number;
          chapter_title: string | null;
          review: {
            chapter: string;
            concept: string;
            confusion_point: string;
            error_prone_point: string;
          };
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          question: string;
          options: { A: string; B: string; C: string; D: string };
          answer: 'A' | 'B' | 'C' | 'D';
          option_explanations: { A: string; B: string; C: string; D: string };
          chapter_no: number;
          chapter_title?: string | null;
          review: {
            chapter: string;
            concept: string;
            confusion_point: string;
            error_prone_point: string;
          };
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          question?: string;
          options?: { A: string; B: string; C: string; D: string };
          answer?: 'A' | 'B' | 'C' | 'D';
          option_explanations?: { A: string; B: string; C: string; D: string };
          chapter_no?: number;
          chapter_title?: string | null;
          review?: {
            chapter: string;
            concept: string;
            confusion_point: string;
            error_prone_point: string;
          };
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)

