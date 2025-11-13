import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in your environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TEST_SYMBOL = 'AAPL';

interface TestConfig {
  functionName: string;
  payload: object;
  validateResponse: (data: any) => boolean;
}

const tests: TestConfig[] = [
  {
    functionName: 'stock-historical-v3',
    payload: { body: { symbol: TEST_SYMBOL, range: '1mo' } },
    validateResponse: (data) => Array.isArray(data.data) && data.data.length > 0,
  },
  {
    functionName: 'stock-intraday',
    payload: { body: { symbol: TEST_SYMBOL, interval: '15m', range: '1d' } },
    validateResponse: (data) => Array.isArray(data.data) && data.data.length > 0,
  },
  {
    functionName: 'stock-quote',
    payload: { body: { symbol: TEST_SYMBOL } },
    validateResponse: (data) => data.symbol === TEST_SYMBOL && typeof data.price === 'number',
  },
  {
    functionName: 'stock-news',
    payload: { body: { symbol: TEST_SYMBOL, limit: 5 } },
    validateResponse: (data) => Array.isArray(data.articles),
  },
  {
    functionName: 'ml-signals',
    payload: { body: { symbol: TEST_SYMBOL } },
    validateResponse: (data) => data.symbol === TEST_SYMBOL && ['Buy', 'Sell', 'Hold'].includes(data.signal),
  },
  {
    functionName: 'stock-search',
    payload: { body: { query: 'Apple' } },
    validateResponse: (data) => Array.isArray(data?.results) && data.results.some((d: { symbol: string }) => d.symbol === 'AAPL'),
  },
];

const runSmokeTests = async () => {
  console.log('🚀 Starting Supabase Edge Function Smoke Test...');
  let allTestsPassed = true;

  for (const test of tests) {
    process.stdout.write(`- Testing ${test.functionName}... `);
    try {
      const { data, error } = await supabase.functions.invoke(test.functionName, test.payload);

      if (error) {
        throw new Error(error.message);
      }

      if (test.validateResponse(data)) {
        console.log('✅ PASSED');
      } else {
        allTestsPassed = false;
        console.log('❌ FAILED (Invalid response structure)');
        console.log('   Response:', JSON.stringify(data, null, 2).substring(0, 300));
      }
    } catch (error) {
      allTestsPassed = false;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`❌ FAILED (${message})`);
    }
  }

  console.log('\n----------------------------------------');
  if (allTestsPassed) {
    console.log('🎉 All smoke tests passed successfully!');
  } else {
    console.log('🔥 Some smoke tests failed. Please review the logs.');
    process.exit(1);
  }
};

runSmokeTests();
