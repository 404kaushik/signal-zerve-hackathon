# Signal
### *Real-Time World Pulse: What the World is Betting On, Right Now*

> **Purpose of this document:** A complete, detail-oriented reference for the Signal notebook. This document explains every data source, processing block, design decision, and API endpoint so that any developer, stakeholder, or collaborator can understand exactly what this system does and why it matters.

---

## Table of Contents

1. [What is Signal?](#what-is-Signal)
2. [Point of View & Philosophy](#point-of-view--philosophy)
3. [System Architecture Overview](#system-architecture-overview)
4. [Data Sources & Relevance](#data-sources--relevance)
5. [Pipeline Blocks — Deep Dive](#pipeline-blocks--deep-dive)
   - [Rate Limiter](#block-1-rate_limiter)
   - [Config & Helpers](#block-2-config--helpers)
   - [Polymarket Trending](#block-3-polymarket_trending)
   - [Categorizer](#block-4-categorizer)
   - [Market Parser](#block-5-market-parser--price-extraction)
   - [Enrichment Engine](#block-6-enrichment_engine)
   - [Signal Helpers](#block-7-signal_helpers)
   - [Analysis Engine](#block-8-analysis_engine)
   - [Daily Trending](#block-9-daily_trending)
   - [Sentiment Engine](#block-10-sentiment-engine)
   - [Final Output & Lite Reports](#block-11-final-output--lite-reports)
6. [The API Layer](#the-api-layer)
7. [Category Reference](#category-reference)
8. [Signal Scoring Model](#signal-scoring-model)
9. [Data Flow Diagram](#data-flow-diagram)
10. [Example Output Structures](#example-output-structures)
11. [Key Design Decisions](#key-design-decisions)
12. [Relevance to Signal Web App](#relevance-to-Signal-web-app)

---

## What is Signal?

Signal is an enhanced web application that surfaces **informed, real-time signals** about world events — what's happening, what people think will happen, and what the data actually shows. The Signal Engine (this notebook) is the **backend brain** of Signal.

It answers a deceptively simple question:

> *"Of everything happening in the world right now, what actually matters — and what does the collective intelligence of the market say about it?"*

The engine pulls data from **four independent real-world sources**, fuses them together per topic, assigns a composite signal score, and exposes everything through a clean REST API that the Signal frontend consumes.

---

## Point of View & Philosophy

### Prediction Markets as Ground Truth

Most news apps tell you *what happened*. Signal tells you *what the crowd thinks will happen* — and prices that belief in real money.

**Polymarket** is a decentralized prediction market where participants put real dollars on binary outcomes (Yes/No). The market price of "Yes" is a direct, continuously updated probability estimate. Because participants have financial skin in the game, these prices are significantly more accurate than polls or pundit opinions.

### Context is Everything

A raw probability number without context is incomplete. Knowing that "BTC > $100K by year-end" is trading at 72% YES means nothing without knowing:
- What is BTC's actual current price and 7-day trend?
- What is public search interest in Bitcoin right now?
- Is the 10-year Treasury yield rising (risk-off pressure on crypto)?

Signal layers macro data (FRED), market prices (Yahoo Finance), and public attention (Google Trends) on top of each prediction market signal — so users see the **full picture** in one place.

### Signal, Not Noise

With 200+ active prediction markets at any moment, most are low-volume curiosities. The engine uses volume, trend data, and attention scores to surface only the markets with genuine momentum — what the notebook calls "signal vs. noise" filtering.

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  Signal SIGNAL ENGINE v3              │
│                                                     │
│  DATA INGESTION          PROCESSING        OUTPUT   │
│  ─────────────           ──────────        ──────   │
│  Polymarket API   ──►   Categorizer  ──►           │
│  FRED API         ──►   Enrichment   ──►  FastAPI  │
│  Yahoo Finance    ──►   Scoring      ──►  REST API │
│  Google Trends    ──►   Sentiment    ──►           │
└─────────────────────────────────────────────────────┘
```

The pipeline runs sequentially through named blocks, each with a single responsibility. The final state is loaded into Signal variables and served by a FastAPI application.

---

## Data Sources & Relevance

### Why These Four Sources?

| Source | What It Provides | Why It Matters for Signal |
|--------|-----------------|--------------------------|
| **Polymarket** | Binary prediction market prices (Yes/No probabilities) + 24h volume | The core signal — collective real-money forecasts on world events |
| **FRED (Federal Reserve Economic Data)** | Macro indicators: 10Y yield, CPI, unemployment, oil price | Provides economic context to explain *why* markets are moving |
| **Yahoo Finance (yfinance)** | Equity (SPY, QQQ, GLD) and crypto (BTC, ETH) closing prices | Real asset prices that corroborate or contradict prediction market sentiment |
| **Google Trends** | Public search interest for keywords over past 7 days | Measures public attention — separates niche insider bets from mainstream awareness |

### FRED Series Used

| Series ID | Metric | Used For Category |
|-----------|--------|-------------------|
| `DGS10` | 10-Year Treasury Yield | Crypto, Economy, Politics, Tech |
| `CPIAUCSL` | Consumer Price Index (CPI) | Economy |
| `UNRATE` | U.S. Unemployment Rate | Economy |
| `DCOILWTICO` | WTI Crude Oil Price | Geopolitics |

**Why the 10Y yield appears in so many categories:** The 10-year Treasury is the risk-free rate benchmark of the global economy. Rising yields pressure equities, crypto, and tech valuations simultaneously — making it universally relevant context.

### Yahoo Finance Enrichment by Category

| Category | Equities Tracked | Crypto Tracked | Rationale |
|----------|-----------------|----------------|-----------|
| Crypto | — | BTC, ETH | Direct asset prices for crypto prediction markets |
| Economy | SPY (S&P 500 ETF) | — | Broad market sentiment proxy |
| Politics | SPY | — | Political events move markets |
| Geopolitics | GLD (Gold ETF) | — | Gold is the classic geopolitical hedge |
| Sports | — | — | Sports markets don't correlate with financial assets |
| Tech | QQQ (Nasdaq-100 ETF) | — | Tech sector benchmark |

---

## Pipeline Blocks — Deep Dive

### Block 1: `rate_limiter`

**Purpose:** Prevents hammering the Yahoo Finance unofficial API (yfinance), which has no formal rate limit documentation but will reject burst requests.

```python
LAST_MARKET_DATA_CALL = 0

def market_data_wait():
    elapsed = time.time() - LAST_MARKET_DATA_CALL
    if elapsed < 0.35:
        time.sleep(0.35 - elapsed)
    LAST_MARKET_DATA_CALL = time.time()
```

A minimum **350ms gap** is enforced between consecutive Yahoo Finance calls. This is a "polite" global singleton — any fetch function calls `market_data_wait()` before executing.

---

### Block 2: Config & Helpers

**Purpose:** Centralizes all API configuration and defines the three core data-fetching helpers.

**Configuration constants:**

| Constant | Value | Meaning |
|----------|-------|---------|
| `FRED_KEY` | `c7f527d...` | St. Louis Fed API key |
| `REPORTS_LIMIT` | 200 | Max markets in full signal feed |

**Helper: `fetch_fred(series_id, limit=40)`**

Fetches the 40 most recent observations of a FRED series, converts to a clean DataFrame, and validates for NaN values. Returns rows sorted descending by date.

**Helper: `_yf_close_history(yahoo_ticker, label)`**

Fetches 3 months of daily closing price history from Yahoo Finance for any ticker. Enforces a minimum of 7 data points for statistical reliability. All crypto tickers follow the `{SYMBOL}-USD` convention.

**Crypto tickers tracked:**

| Symbol | Yahoo Ticker |
|--------|-------------|
| BTC | BTC-USD |
| ETH | ETH-USD |
| XRP | XRP-USD |
| SOL | SOL-USD |
| DOGE | DOGE-USD |

**Helper: `fetch_trends(keyword, timeframe="now 7-d")`**

Queries Google Trends for a keyword over the past 7 days and returns:
- `current_interest` — today's interest score (0–100)
- `7d_trend` — "rising", "falling", or "flat"
- `7d_avg` — average interest over the week
- `daily_delta` — change from yesterday to today
- `daily_direction` — "up", "down", or "flat"

---

### Block 3: `polymarket_trending`

**Purpose:** Fetches the top 200 most-active prediction markets from Polymarket's public API, sorted by 24h trading volume.

**API call:**
```
GET https://gamma-api.polymarket.com/markets
  ?active=true&closed=false&limit=200&order=volume24hr&ascending=false
```

Only **active, non-closed** markets are fetched. Ordering by `volume24hr` descending ensures the most liquid (and therefore most meaningful) markets come first.

**Example top markets by 24h volume:**

| Market Question | 24h Volume |
|----------------|-----------|
| Will the Fed cut rates in June 2025? | $8.2M |
| BTC price above $100K on Dec 31? | $5.7M |
| Will Trump sign the tax bill before Q3? | $4.1M |
| Will Nvidia stock close above $950? | $2.8M |
| Ukraine ceasefire before July 1? | $1.9M |

---

### Block 4: `categorizer`

**Purpose:** Uses GPT-4o-mini to classify every market question into one of six categories. Falls back to keyword scoring if the AI call fails.

**The six categories:**

| Category | Emoji | Color | Description |
|----------|-------|-------|-------------|
| `crypto` | ₿ | `#F7931A` | Bitcoin, Ethereum, DeFi, NFTs, exchanges |
| `economy` | 📈 | `#4FC3F7` | Fed, inflation, CPI, GDP, stock markets, tariffs |
| `politics` | 🗳️ | `#EF5350` | Elections, congress, legislation, executive orders |
| `geopolitics` | 🌍 | `#AB47BC` | Wars, NATO, China, Russia, Middle East, sanctions |
| `sports` | 🏆 | `#66BB6A` | NBA, NFL, MLB, UFC, F1, soccer, tennis |
| `tech` | 🤖 | `#26C6DA` | AI companies, big tech, semiconductors, EVs, space |

**AI Classification Architecture:**

```
200 markets
    │
    ▼  (batches of 20)
GPT-4o-mini (temperature=0, JSON mode)
    │
    ├── success → validated category dict
    └── failure → keyword_fallback()
```

The system prompt forces deterministic JSON output with exactly one category per market question. Batches of 20 questions are sent per API call — a sweet spot balancing cost and latency.

**Fallback keyword scoring** uses pre-defined keyword lists per category. Every word in the market title is scored against each category's keyword set; the highest-scoring category wins.

**Example fallback keywords by category:**

| Category | Sample Keywords |
|----------|----------------|
| crypto | bitcoin, btc, ethereum, defi, nft, solana, xrp |
| economy | fed, fomc, inflation, cpi, gdp, tariff, nasdaq |
| politics | trump, biden, election, congress, senate, democrat |
| geopolitics | ukraine, russia, china, israel, iran, nato, war |
| sports | nba, nfl, ufc, f1, championship, finals, super bowl |
| tech | ai, openai, chatgpt, nvidia, tesla, spacex, llm |

Markets categorized as `other` are **excluded** from all downstream processing. This is intentional — Signal focuses on the six high-signal verticals only.

---

### Block 5: Market Parser & Price Extraction

**Purpose:** Converts the raw Polymarket market JSON (which has inconsistent price field formats across different market types) into a clean, normalized structure.

**The parser handles four different price formats:**

| Format | Field | Notes |
|--------|-------|-------|
| A | `clobTokenIds` + token array | CLOB (Central Limit Order Book) markets |
| B | Named token objects with `outcome: "YES"/"NO"` | Standard binary markets |
| C | `outcomePrices` string or list | Sometimes arrives as JSON string |
| D | `lastTradePrice`, `price`, `bestBid` | Fallback top-level fields |

If all formats fail, the price defaults to **50% (0.5)** — the maximum uncertainty position. A sanity check flags if more than 50% of markets land at exactly 50%, which would indicate a parsing regression.

**Output schema per parsed market:**

```json
{
  "id": "market-uuid",
  "title": "Will BTC close above $100K?",
  "yes_price": 0.72,
  "no_price": 0.28,
  "volume24h": 5700000.00,
  "total_volume": 22000000.00,
  "end_date": "2025-12-31",
  "category": "crypto",
  "category_confidence": 1.0,
  "sub_category": null,
  "ambiguous": false
}
```

**Filtering rules applied after parsing:**

| Filter | Threshold | Reason |
|--------|-----------|--------|
| Category | Must not be `other` | Only signal-relevant verticals |
| 24h Volume | Must exceed `$500` | Eliminates illiquid, meaningless markets |

After filtering, up to **200 markets** enter the full feed and **12 curated markets** (2 per category + top overall) enter the deep enrichment pipeline.

---

### Block 6: `enrichment_engine`

**Purpose:** Attaches real-world macro, equity, crypto, and attention data to each curated market. All four sources are cached to avoid redundant API calls.

**Caching strategy:**

| Cache | Key | Scope |
|-------|-----|-------|
| `fred_cache` | FRED series ID (e.g., `DGS10`) | Shared across all markets needing same indicator |
| `equity_cache` | Ticker symbol (e.g., `SPY`) | Per-symbol |
| `crypto_cache` | Symbol (e.g., `BTC`) | Per-symbol |
| `trends_cache` | Mapped keyword string | Shared if multiple markets map to same keyword |

**FRED enrichment output per series:**

```json
{
  "DGS10": {
    "latest": 4.287,
    "date": "2025-04-25",
    "7d_change": 0.042,
    "30d_change": -0.115,
    "7d_pct": 0.988
  }
}
```

**Yahoo Finance enrichment output:**

```json
{
  "SPY": {
    "close": 521.34,
    "7d_change": -8.21,
    "7d_pct": -1.55,
    "date": "2025-04-25"
  }
}
```

**A smoke test** runs on 3 sample markets before the full enrichment loop begins. If any enrichment call fails during the smoke test, the error is logged and the block halts — preventing wasted API calls on a broken configuration.

**Yahoo Finance call limit:** `YFINANCE_CALL_LIMIT = 30`. Since the unofficial API has undocumented rate limits, the engine tracks calls and raises a clear error if the limit is reached, preventing silent failures.

**Google Trends keyword mapping** maps market title text to stable, canonical search terms:

| Market Title Contains | Trends Keyword Used |
|----------------------|---------------------|
| "bitcoin", "btc" | `bitcoin` |
| "fed", "fomc", "rate" | `federal reserve` |
| "inflation", "cpi" | `inflation` |
| "ukraine", "russia" | `ukraine war` |
| "nba" | `nba` |
| "ai", "artificial intelligence" | `artificial intelligence` |
| "tariff", "trade war" | `tariff` |

If no keyword matches, the first 4 words of the title are used as a fallback query.

---

### Block 7: `signal_helpers`

**Purpose:** Computes non-AI signal metadata from raw probabilities and volume numbers.

**Signal strength classification:**

| Yes Probability | Strength |
|----------------|----------|
| > 82% or < 18% | `very strong` |
| > 65% or < 35% | `strong` |
| > 55% or < 45% | `moderate` |
| 45%–55% | `uncertain` |

**Volume context classification:**

| 24h Volume | Context Label |
|-----------|---------------|
| > $50M | `massive — top 1% of all markets` |
| > $10M | `very high` |
| > $1M | `high` |
| ≤ $1M | `moderate` |

**Crowd read label examples:**

| Condition | Crowd Read Label |
|-----------|-----------------|
| Yes price > 65% | `"Strong YES (72%)"` |
| Yes price < 35% | `"Strong NO (71%)"` |
| 45%–55% | `"Uncertain (51% YES)"` |

---

### Block 8: `analysis_engine`

**Purpose:** Combines everything for the 12 curated markets into full signal reports.

Each report bundles:
- Market metadata (ID, title, category, end date)
- Probability (yes/no with raw floats and display strings)
- Volume (raw USD, display string, context label)
- Signal fields (strength, crowd read)
- Live data (FRED, equity, crypto snapshots)
- Public attention (Google Trends summary)
- Timestamps

This is the richest data structure in the system — it's what powers the Signal "deep dive" view on a single market.

---

### Block 9: `daily_trending`

**Purpose:** Computes a composite trending score for each market and aggregates category-level trending data.

**Trending score formula (0–100):**

| Component | Weight | Source |
|-----------|--------|--------|
| Volume rank (normalized to $50M = 100) | 40% | Polymarket 24h volume |
| Public attention (current_interest, 0–100) | 25% | Google Trends |
| Daily attention delta (centered at 50) | 20% | Google Trends day-over-day |
| Signal strength (very strong=100, uncertain=25) | 15% | Computed yes_price |

**Formula:**
```
score = vol_score × 0.40
      + current_interest × 0.25
      + normalize(daily_delta) × 0.20
      + signal_score × 0.15
```

**Category-level aggregation** rolls up individual market scores into per-category summaries:
- Total 24h volume across all category markets
- Average attention score
- Average trending score
- Attention direction (up/down/flat based on majority of daily_direction values)
- Top market title

**Rising markets** are flagged when both conditions hold:
- `daily_direction == "up"` (attention increasing)
- `trending_score > 50` (above-average composite score)

---

### Block 10: Sentiment Engine

**Purpose:** Computes a global sentiment overview across all active categories.

The sentiment headline synthesizes:
- Which category has the highest total 24h volume
- Overall market risk appetite (risk-on vs risk-off, inferred from crypto/equity trends vs gold/yield data)
- Count of active signals per category

**Example global sentiment output:**

```json
{
  "headline": "Crypto leads today with $18M in 24h volume — markets pricing in political risk",
  "total_24h_volume": "$47.2M",
  "category_breakdown": {
    "crypto":      { "markets": 42, "volume": "$18.1M" },
    "economy":     { "markets": 31, "volume": "$12.4M" },
    "politics":    { "markets": 28, "volume": "$9.7M" },
    "geopolitics": { "markets": 19, "volume": "$4.2M" },
    "tech":        { "markets": 22, "volume": "$2.1M" },
    "sports":      { "markets": 14, "volume": "$0.7M" }
  }
}
```

---

### Block 11: Final Output & Lite Reports

**Purpose:** Generates two output feeds:

| Feed | Variable Name | Size | Contents |
|------|--------------|------|----------|
| Full signal feed | `signal_reports` | Up to 200 markets | All parsed + categorized markets with lite signal fields |
| Curated vol-tre feed | `signal_reports_vol_tre` | 12 markets | Deeply enriched high-signal markets |

**Lite reports** cover all 200 markets but carry a reduced payload (no FRED/equity/crypto/trends raw data) to keep API response sizes manageable. Signal fields, probability, volume context, and trending score are all included.

---

## The API Layer

The `main.py` block exposes everything through a **FastAPI** application served by Signal's runtime.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | API root — lists all available endpoints |
| `GET` | `/signals` | All 200 enriched market signals, sorted by 24h volume |
| `GET` | `/signals/vol-tre` | Curated 12 high-signal markets |
| `GET` | `/signals/{category}` | Filter by category + trending context for that category |
| `GET` | `/signal/{signal_id}` | Deep-dive on a single market by ID |
| `GET` | `/sentiment` | Global sentiment overview |
| `GET` | `/top` | Top 5 signals by 24h volume |
| `GET` | `/trending/daily` | Daily trending — categories + markets ranked by composite score |
| `GET` | `/search` | Search markets by query string across title, category, sub-category |
| `GET` | `/health` | Health check — confirms signals, sentiment, and trending are loaded |

### Search Endpoint Detail

`GET /search?q=bitcoin&category=crypto&limit=10`

| Parameter | Required | Default | Notes |
|-----------|----------|---------|-------|
| `q` | ✅ | — | Min 1 character. Searches title, category, category_label, sub_category |
| `category` | ❌ | None | Optional filter to a single category |
| `limit` | ❌ | 10 | Range: 1–50 |

Results are sorted by `trending_score` descending — the most relevant and active markets surface first.

### CORS Configuration

The API allows requests from all origins (`*`) — required for the Signal frontend (likely a separate domain) to call this backend directly from the browser.

---

## Category Reference

| Category Key | Display Label | Emoji | Hex Color | FRED Sources | Equity/Crypto |
|-------------|--------------|-------|-----------|-------------|---------------|
| `crypto` | Crypto & Digital Assets | ₿ | `#F7931A` | DGS10 | BTC, ETH |
| `economy` | Macroeconomics & Markets | 📈 | `#4FC3F7` | DGS10, CPIAUCSL, UNRATE | SPY |
| `politics` | Politics & Policy | 🗳️ | `#EF5350` | DGS10 | SPY |
| `geopolitics` | Geopolitics & Global Risk | 🌍 | `#AB47BC` | DCOILWTICO | GLD |
| `sports` | Sports & Entertainment | 🏆 | `#66BB6A` | — | — |
| `tech` | Technology & AI | 🤖 | `#26C6DA` | DGS10 | QQQ |

---

## Signal Scoring Model

The trending score is the primary ranking signal across the entire Signal app. Here's how the same market might score differently depending on context:

**Example: "Will BTC close above $100K by Dec 31?"**

| Component | Raw Value | Normalized | Weight | Contribution |
|-----------|-----------|-----------|--------|-------------|
| 24h Volume ($5.7M) | $5.7M / $50M × 100 | 11.4 | 40% | 4.56 |
| Google Trends interest | 78 | 78 | 25% | 19.5 |
| Daily delta (+12 pts) | 12×5+50=110→clamp→100 | 100 | 20% | 20.0 |
| Signal strength (strong) | 75 | 75 | 15% | 11.25 |
| **Trending Score** | | | | **55.31** |

**Example: "Who wins the Masters golf tournament?"**

| Component | Raw Value | Normalized | Weight | Contribution |
|-----------|-----------|-----------|--------|-------------|
| 24h Volume ($120K) | $120K / $50M × 100 | 0.24 | 40% | 0.096 |
| Google Trends interest | 35 | 35 | 25% | 8.75 |
| Daily delta (-3 pts) | -3×5+50=35 | 35 | 20% | 7.0 |
| Signal strength (uncertain) | 25 | 25 | 15% | 3.75 |
| **Trending Score** | | | | **19.60** |

This design means a high-probability, high-attention crypto market will always outrank a niche sports market — regardless of how interesting either is in isolation.

---

## Data Flow Diagram

```
POLYMARKET API (200 markets)
         │
         ▼
   [polymarket_trending]
         │  raw_markets[]
         ▼
   [categorizer]
    GPT-4o-mini (batches of 20)
    + keyword fallback
         │  ai_categories{}
         ▼
   [market parser]
    Price extraction (4 formats)
    Filter: category≠other, vol>$500
         │
         ├──► all_selected (up to 200) ──────────────────────────┐
         │                                                        │
         └──► curated_selected (12)                              │
                    │                                             │
         ┌──────────┴──────────┐                                 │
         │                     │                                  │
    [enrich_fred]      [enrich_equity/crypto]                    │
    FRED REST API      Yahoo Finance (yfinance)                  │
         │                     │                                  │
         └──────────┬──────────┘                                 │
                    │                                             │
            [enrich_trends]                                       │
            Google Trends                                         │
                    │                                             │
                    ▼                                             │
         [analysis_engine]                                        │
         full_reports[] (12)                                      │
                    │                                             │
         [daily_trending]                                         │
         scored_reports, category_trending                        │
                    │                                             │
         [sentiment_engine]                                       │
         global_sentiment{}                                       │
                    │                                             │
         [final_output]                                           │
         signal_reports_vol_tre (12) ◄───────────────────────────┘
         signal_reports (200) ◄─────── build_lite_report()
                    │
                    ▼
           FastAPI REST API
         /signals, /trending, /sentiment ...
                    │
                    ▼
           Signal Web App (frontend)
```

---

## Example Output Structures

### Full Signal Report (curated market)

```json
{
  "id": "0x1a2b3c4d",
  "title": "Will BTC close above $100K by December 31, 2025?",
  "category": "crypto",
  "category_label": "Crypto & Digital Assets",
  "category_emoji": "₿",
  "category_color": "#F7931A",
  "sub_category": null,
  "category_confidence": 1.0,
  "ambiguous": false,
  "market_probability": {
    "yes": "72.0%",
    "no": "28.0%",
    "raw_yes": 0.72
  },
  "volume": {
    "24h_usd": 5700000.00,
    "24h_display": "$5.70M",
    "context": "high"
  },
  "signal": {
    "strength": "strong",
    "crowd_read": "Strong YES (72%)",
    "why_it_matters": []
  },
  "live_data": {
    "fred": {
      "DGS10": {
        "latest": 4.287,
        "date": "2025-04-25",
        "7d_change": 0.042,
        "30d_change": -0.115,
        "7d_pct": 0.988
      }
    },
    "equity": {},
    "crypto": {
      "BTC": { "close": 94320.00, "7d_change": 3100.00, "7d_pct": 3.40 },
      "ETH": { "close": 3210.00,  "7d_change": -85.00,  "7d_pct": -2.58 }
    }
  },
  "public_attention": {
    "keyword": "bitcoin",
    "current_interest": 78,
    "7d_trend": "rising",
    "7d_avg": 61.4,
    "daily_delta": 12.0,
    "daily_direction": "up"
  },
  "end_date": "2025-12-31",
  "last_updated": "2025-04-28T14:32:11.000Z",
  "trending_score": 55.31
}
```

### Global Sentiment Structure

```json
{
  "headline": "Crypto leads with $18M in 24h volume — markets pricing elevated political risk",
  "total_24h_volume": "$47.2M",
  "hottest_category": "crypto",
  "hottest_label": "Crypto & Digital Assets",
  "risk_appetite": "moderate",
  "category_counts": {
    "crypto": 42,
    "economy": 31,
    "politics": 28,
    "tech": 22,
    "geopolitics": 19,
    "sports": 14
  }
}
```

### Daily Trending Category Entry

```json
{
  "category": "crypto",
  "label": "Crypto & Digital Assets",
  "emoji": "₿",
  "color": "#F7931A",
  "volume24h_usd": 18100000.00,
  "volume_display": "$18.10M",
  "market_count": 2,
  "avg_attention": 73.5,
  "avg_trending_score": 61.2,
  "attention_direction": "up",
  "top_market_title": "Will BTC close above $100K by December 31, 2025?",
  "markets": [ ... ]
}
```

---

## Key Design Decisions

### Why GPT-4o-mini for Classification?

`gpt-4o-mini` at `temperature=0` with JSON mode is deterministic, fast, and cheap — approximately **$0.15 per million tokens**. At batch size 20 and 200 markets, a full run costs under $0.01. The keyword fallback ensures zero classification gaps even if the OpenAI API goes down.

### Why Two Feeds (200 vs 12)?

The **200-market full feed** serves the Signal markets listing page — users browsing all active signals by category. The **12-market curated feed** powers the hero dashboard and "What's Moving" widget where deep contextual data (FRED, equity, crypto, trends) is displayed per signal. Running full enrichment on 200 markets would require ~200 API calls and take several minutes; the 12-market curated approach is near-instant.

### Why Hard-Cap Yahoo Finance at 30 Calls?

`yfinance` is an unofficial library wrapping Yahoo Finance's internal API — it has no SLA or documented rate limits. The 30-call cap (with 350ms spacing) ensures the pipeline never triggers a temporary IP ban. Since all equity/crypto data is cached, 30 calls comfortably covers all 6 categories with headroom.

### Why Include Sports Despite No Financial Enrichment?

Sports markets represent high-engagement, broad-public prediction activity (NBA Finals, Super Bowl, UFC title fights). Google Trends data is still attached — a spike in "nba" search volume contextualizes a trending championship market even without macro data. Sports is also a category that drives casual user engagement on Signal.

### Confidence Score

Every market carries a `category_confidence` field: `1.0` if classified into a valid category by AI, `0.0` if it fell through to "other" and was excluded. This field is reserved for future use — e.g., UI labels like "High confidence: Crypto" on the Signal card.

---

## Relevance to Signal Web App

This notebook is the **complete data backbone** of Signal. Here is how each output maps to Signal UI features:

| Signal UI Feature | Data Source |
|-----------------|-------------|
| **Markets Feed** — full list by category | `GET /signals` → `signal_reports` (200 markets) |
| **Dashboard / What's Hot** | `GET /signals/vol-tre` → `signal_reports_vol_tre` (12 curated) |
| **Category Pages** | `GET /signals/{category}` |
| **Single Market Deep Dive** | `GET /signal/{signal_id}` |
| **Global Pulse / Sentiment Bar** | `GET /sentiment` → `sentiment_overview` |
| **Trending Now Widget** | `GET /trending/daily` → `daily_trending` |
| **Search** | `GET /search?q=...` |
| **Macro Context Chip** (e.g., "10Y: 4.29% ▲") | `live_data.fred.DGS10` |
| **Crypto Price Ticker** | `live_data.crypto.BTC` / `live_data.crypto.ETH` |
| **Public Buzz Indicator** | `public_attention.current_interest` + `daily_direction` |
| **Signal Strength Badge** | `signal.strength` + `signal.crowd_read` |
| **Category Color Coding** | `category_color` per market |

### Informed Decision Layer

Signal's core value proposition is that every piece of data shown to the user is **contextually corroborated**. When a user sees "72% YES on BTC > $100K," they also see:
- BTC's actual current price (+3.4% this week)
- 10Y Treasury yield (rising = headwind for crypto)
- Google Trends interest (78/100, trending up)
- Volume context ("high — $5.7M traded in 24h")

This multi-layer context is what transforms raw prediction market data into a genuine decision-support tool — the defining feature of Signal.

---

*Document generated for Signal. For questions about the pipeline architecture, data sources, or API design, refer to the inline block comments in the source notebook.*