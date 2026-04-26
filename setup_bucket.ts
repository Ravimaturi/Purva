import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function setup() {
  const { data, error } = await supabase.storage.createBucket('petty_cash_receipts', {
    public: true,
    fileSizeLimit: 10485760, // 10MB
  });
  if (error && error.message !== 'The resource already exists') {
    console.error('Bucket creation error:', error);
  } else {
    console.log('Bucket "petty_cash_receipts" is ready.');
  }
}
setup();
