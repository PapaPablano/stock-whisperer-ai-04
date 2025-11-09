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

This application uses a three-tier fallback system for maximum data reliability:

### Primary: Marketstack API v2
- **End-of-day data**: `/eod/latest` (free tier)
- **Historical data**: `/eod` (with date range)
- **Intraday data**: `/intraday` (paid tier - for real-time updates)
- **Required Environment Variable**: `MARKETSTACK_API_KEY`

### Secondary: Yahoo Finance API
- Free, no API key required
- Used as fallback when Marketstack is unavailable
- Provides real-time quotes and historical data

### Tertiary: Polygon.io API
- **Required Environment Variable**: `POLYGON_API_KEY`
- Used as final fallback when other sources fail
- Provides comprehensive market data

## Environment Variables

Add these to your Supabase project settings:

```bash
MARKETSTACK_API_KEY=your_marketstack_api_key_here
POLYGON_API_KEY=your_polygon_api_key_here
```

**Note**: The application will work with any combination of these API keys, but having all three provides the most reliable data access.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/b8d442c0-ec4f-413a-b76b-8817e3790e8a) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
