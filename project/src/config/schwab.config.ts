import { SchwabConfig } from '../schwab-api/types'

type PartialEnv = {
  SCHWAB_CLIENT_ID?: string
  SCHWAB_CLIENT_SECRET?: string
  SCHWAB_REDIRECT_URI?: string
  SCHWAB_SCOPE?: string
}

export function loadSchwabConfig(env: PartialEnv = process.env): SchwabConfig {
  const clientId = env.SCHWAB_CLIENT_ID
  const clientSecret = env.SCHWAB_CLIENT_SECRET
  const redirectUri = env.SCHWAB_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing Schwab OAuth environment variables.')
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    scope: env.SCHWAB_SCOPE ?? 'readonly',
  }
}
