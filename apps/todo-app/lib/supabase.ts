// ============================================
// Supabase Client Configuration
// ============================================
// This creates a connection to your Supabase database

import { createClient } from '@supabase/supabase-js';

// These come from environment variables (set in .env.local)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create the Supabase client
// This is what we use to interact with the database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// TypeScript type for our Todo items (matches the database schema)
export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  category: 'personal' | 'work' | 'shopping' | 'other';
  due_date: string | null;
  created_at: string;
  source: 'manual' | 'email';
}
