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
const FUTURES_TEST_SYMBOL = process.env.FUTURES_TEST_SYMBOL ?? 'MESZ2025';
const ENABLE_FUTURES_TESTS =
  (process.env.ENABLE_FUTURES_TESTS ?? 'false').trim().toLowerCase() === 'true';

interface TestConfig {
  functionName: string;
  payload: object;
  validateResponse: (data: unknown) => boolean;
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

if (ENABLE_FUTURES_TESTS) {
  console.log(`🔁 Futures smoke tests enabled for ${FUTURES_TEST_SYMBOL}`);
  tests.push(
    {
      functionName: 'stock-historical-v3',
      payload: { body: { symbol: FUTURES_TEST_SYMBOL, range: '1mo', instrumentType: 'future' } },
      validateResponse: (data) =>
        data?.instrumentType === 'future' && Array.isArray(data?.data) && data.data.length > 0,
    },
    {
      functionName: 'stock-intraday',
      payload: {
        body: { symbol: FUTURES_TEST_SYMBOL, interval: '15m', range: '1d', instrumentType: 'future' },
      },
      validateResponse: (data) =>
        data?.instrumentType === 'future' && Array.isArray(data?.data) && data.data.length > 0,
    },
  );
} else {
  console.log('⚠️ Futures smoke tests disabled (set ENABLE_FUTURES_TESTS=true to enable).');
}

const runSmokeTests = async () => {
  console.log('🚀 Starting Supabase Edge Function Smoke Test...');
  let allTestsPassed = true;

  for (const test of tests) {
    process.stdout.write(`- Testing ${test.functionName}... `);
    try {
      const { data, error } = await supabase.functions.invoke(test.functionName, test.payload);

      if (error) {
        allTestsPassed = false;
        console.log(`❌ FAILED (${error.message})`);
        const context = (error as { context?: { body?: unknown } }).context;
        if (context?.body) {
          try {
            const errorBody = await new Response(context.body as BodyInit).text();
            console.log('   Error response:', errorBody.substring(0, 500));
          } catch (streamError) {
            console.log('   Error response could not be read:', streamError);
          }
        }
        if (data) {
          console.log('   Response payload:', JSON.stringify(data, null, 2).substring(0, 500));
        }
        continue;
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
