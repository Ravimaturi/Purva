import { createClient } from '@supabase/supabase-js';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (supabaseUrl.startsWith('/')) {
  supabaseUrl = window.location.origin + supabaseUrl;
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Please check your config.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Isolated client for admin operations like creating users without logging out
export const supabaseAdminAuth = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
