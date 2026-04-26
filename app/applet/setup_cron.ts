import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

async function check() {
  const sql = `
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    SELECT cron.schedule('keep_active_cron', '0 0 * * *', 'SELECT 1;');
  `;
  const { data, error } = await supabase.rpc('execute_sql', { sql });
  console.log(error || 'done');
}
check();
