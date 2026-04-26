# Live X Feed

## Required environment variables

Add these to `signal-frontend/.env.local`:

- `XAI_API_KEY`: xAI API key used by `app/api/x/generate/route.ts`
- `XAI_MODEL`: optional model override (default `grok-4-0709`)
- `X_BEARER_TOKEN`: X/Twitter API v2 bearer token for tweet correlation and trends.
- `OPENAI_API_KEY`: openai api key for openai-agents.

## Flow

1. 
