import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error('Missing env');
}

const supabase = createClient(url, key);

(async () => {
  const { data, error } = await supabase.functions.invoke('stock-historical', {
    body: { symbol: 'CRWD', range: '1y' },
  });

  console.log('error', error);
  console.log('data length', data?.data?.length, 'source', data?.source);
})();
