// ============================================
// Supabase Client Configuration
// ============================================
// This creates a connection to your Supabase database

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization to avoid build errors when env vars aren't available
let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase environment variables are not configured');
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
}

// Export a proxy that lazily initializes the client
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getSupabase();
    const value = client[prop as keyof SupabaseClient];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

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
