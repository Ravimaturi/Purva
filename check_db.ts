import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error, count } = await supabase.from('petty_cash').select('*', { count: 'exact' });
  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Total rows in DB: ${count}`);
    const distinctUsers = [...new Set(data.map(d => d.raised_by_name))];
    console.log(`Distinct Users: ${distinctUsers.join(', ')}`);
  }
}

check();
