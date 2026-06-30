import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase'; // We will generate this later

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ccslfismecxlvddqfxet.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.warn('VITE_SUPABASE_ANON_KEY is missing. Supabase will not function correctly on the frontend.');
}

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey || '');
