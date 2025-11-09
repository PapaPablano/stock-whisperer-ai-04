// Mock data for demonstration - will be replaced with real API calls

export const featuredStocks = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 178.45,
    change: 2.34,
    changePercent: 1.33,
    volume: "52.3M"
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corporation",
    price: 412.78,
    change: -1.23,
    changePercent: -0.30,
    volume: "28.9M"
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    price: 142.65,
    change: 3.21,
    changePercent: 2.30,
    volume: "31.2M"
  },
  {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    price: 178.35,
    change: -2.10,
    changePercent: -1.16,
    volume: "45.7M"
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc.",
    price: 242.84,
    change: 8.45,
    changePercent: 3.61,
    volume: "98.4M"
  },
  {
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    price: 875.28,
    change: 12.56,
    changePercent: 1.46,
    volume: "42.1M"
  }
];

export const generatePriceData = (days: number = 30) => {
  const data = [];
  const basePrice = 170;
  let currentPrice = basePrice;
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const change = (Math.random() - 0.5) * 5;
    currentPrice += change;
    
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: parseFloat(currentPrice.toFixed(2)),
      volume: Math.floor(Math.random() * 50000000) + 30000000,
      change: change
    });
  }
  
  return data;
};

export const technicalIndicators = [
  {
    name: "RSI (14)",
    value: 58.32,
    signal: "neutral" as const,
    description: "Relative Strength Index indicates neutral momentum"
  },
  {
    name: "MACD",
    value: 2.45,
    signal: "bullish" as const,
    description: "MACD shows bullish trend with positive crossover"
  },
  {
    name: "SMA (50)",
    value: 172.45,
    signal: "bullish" as const,
    description: "Price trading above 50-day moving average"
  },
  {
    name: "Bollinger Bands",
    value: 178.23,
    signal: "neutral" as const,
    description: "Price within normal Bollinger Band range"
  }
];

export const keyMetrics = {
  marketCap: "$2.75T",
  peRatio: "28.45",
  dividendYield: "0.52%",
  eps: "$6.27",
  fiftyTwoWeekHigh: "$198.23",
  fiftyTwoWeekLow: "$142.56",
  avgVolume: "52.3M",
  beta: "1.24"
};
