import { createClient } from '@supabase/supabase-js';
import Alpaca from '@alpacahq/alpaca-trade-api';
import { RSI } from 'technicalindicators';

const supabaseAdmin = createClient(
  Deno.env.get('PROJECT_SUPABASE_URL') ?? '',
  Deno.env.get('PROJECT_SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const createDefaultAlpacaClient = () => {
  const keyId = Deno.env.get('APCA_API_KEY_ID');
  const secretKey = Deno.env.get('APCA_API_SECRET_KEY');

  if (!keyId || !secretKey) {
    throw new Error('Missing Alpaca credentials in environment variables');
  }

  return new Alpaca({
    keyId,
    secretKey,
    paper: (Deno.env.get('ALPACA_PAPER_TRADING') ?? 'true').toLowerCase() === 'true',
  });
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
};

const STOCK_FEED = (Deno.env.get('ALPACA_STOCK_FEED') ?? 'iex').toLowerCase() === 'sip' ? 'sip' : 'iex';
const MAX_DAILY_BARS = 100; // We need enough data for indicators

let sharedAlpacaClient: Alpaca | null = null;

const getAlpacaClient = (): Alpaca => {
  if (!sharedAlpacaClient) {
    sharedAlpacaClient = createDefaultAlpacaClient();
  }
  return sharedAlpacaClient;
};

const fetchAlpacaDailyBars = async (symbol: string) => {
  const client = getAlpacaClient();
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - MAX_DAILY_BARS * 1.5); // Fetch more to be safe

  const barsGen = client.getBars({
    symbol,
    timeframe: '1Day',
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    limit: MAX_DAILY_BARS,
    feed: STOCK_FEED,
    sort: 'asc',
  });

  const bars = [];
  for await (const bar of barsGen) {
    bars.push(bar);
  }
  return bars;
};

const generateSignal = (rsi: number) => {
  if (rsi > 70) return 'Sell';
  if (rsi < 30) return 'Buy';
  return 'Hold';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as { symbol?: string } | null;
    const symbol = body?.symbol;

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: 'Symbol is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const bars = await fetchAlpacaDailyBars(symbol.toUpperCase());
    if (bars.length < 15) { // Need at least 14 periods for default RSI
      return new Response(
        JSON.stringify({ error: 'Not enough historical data to generate a signal.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const closePrices = bars.map(bar => bar.ClosePrice);
    const rsi = RSI.calculate({ period: 14, values: closePrices });
    const latestRsi = rsi[rsi.length - 1];

    const signal = generateSignal(latestRsi);

    const responsePayload = {
      symbol: symbol.toUpperCase(),
      signal,
      rsi: latestRsi,
      timestamp: new Date().toISOString(),
      source: 'rsi_14_day',
    };

    return new Response(
      JSON.stringify(responsePayload),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error) {
    console.error('ML Signal generation failed', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
