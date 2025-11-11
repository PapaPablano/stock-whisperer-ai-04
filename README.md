# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/b8d442c0-ec4f-413a-b76b-8817e3790e8a

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/b8d442c0-ec4f-413a-b76b-8817e3790e8a) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (Backend & Edge Functions)

## Stock Data APIs

This application uses **Alpaca Market Data API** as the primary data source for professional-grade market data.

### Primary: Alpaca Market Data API ⭐
- Real-time stock quotes (IEX or SIP feeds)
- Historical and intraday OHLCV data (up to 2 years)
- WebSocket streaming for live price updates
- Real-time market news feed
- Cryptocurrency and options data support
- **Required Environment Variables**: `APCA_API_KEY_ID`, `APCA_API_SECRET_KEY`
- **Optional**: `ALPACA_STOCK_FEED` (values: `iex` or `sip`, default: `iex`)

### Features Powered by Alpaca:
✅ **Real-Time Streaming** - Live trades, quotes, and bars via WebSocket  
✅ **News Feed** - Real-time market news and analysis  
✅ **Smart Caching** - 45-second cache via Supabase for optimal performance  
✅ **Multiple Data Feeds** - IEX (free) or SIP (consolidated, paid)

### Supabase Integration

All data flows through **Supabase Edge Functions** for:
- Secure API key management
- Intelligent caching in PostgreSQL (`stock_cache` table)
- Real-time data synchronization
- Edge computing for low latency

**Supabase Project**: https://supabase.com/dashboard/project/iwwdxshzrxilpzehymeu

## Environment Variables

Add these to your [Supabase project settings](https://supabase.com/dashboard/project/iwwdxshzrxilpzehymeu/settings/api):

```bash
# Alpaca API Credentials (Required)
APCA_API_KEY_ID=your_alpaca_key_id
APCA_API_SECRET_KEY=your_alpaca_secret_key

# Data Feed Selection (Optional, default: iex)
ALPACA_STOCK_FEED=iex  # or 'sip' for premium consolidated feed
```

**Getting Started with Alpaca:**
1. Sign up at [Alpaca Markets](https://alpaca.markets)
2. Generate API keys from your dashboard
3. Add keys to Supabase Edge Functions secrets
4. Deploy/redeploy Edge Functions

See [docs/ALPACA_INTEGRATION.md](./docs/ALPACA_INTEGRATION.md) for detailed setup instructions.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/b8d442c0-ec4f-413a-b76b-8817e3790e8a) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
