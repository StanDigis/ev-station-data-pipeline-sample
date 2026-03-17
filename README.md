# ev-station-data-pipeline

Backend piece from an EV charging station discovery project. Handles partner data ingestion, station search, and stores event history in ClickHouse for analytics.

This is a cleaned-up extract — no secrets, no infra configs, no proprietary schemas.

## What's here

- **Partner ingestion** — accepts station updates from external partners (price changes, availability, new stations), normalizes them, deduplicates via idempotency keys, writes current state to PostgreSQL and appends events to ClickHouse.
- **Station search** — geo-based search against PostgreSQL with filters (connector type, availability, price).
- **Retry with backoff + jitter** — wraps unreliable calls (partner APIs, DB writes during spikes).

## Why two databases

PostgreSQL holds the current state of every station — what the user sees when they search. Works great for transactional upserts and geo queries (via `earthdistance`).

ClickHouse stores the event stream — every price change, availability flip, sync result. Useful for analytics dashboards, partner SLA tracking, and debugging ingestion issues. Appending millions of rows is cheap there, and aggregation queries over months of data stay fast.

## Structure

```
src/
  api/             — HTTP handler (search endpoint)
  db/              — PG and CH client setup
  repositories/    — data access (PG for stations, CH for events, in-memory idempotency)
  services/        — business logic (ingestion flow, search, normalization)
  types/           — shared domain types
  utils/           — logger
  queue/           — retry wrapper
test/              — node:test based tests
```

## Running locally

```bash
cp .env.example .env
# fill in PG and CH connection strings
npm install
npm run build
npm start        # runs a demo ingestion
npm test
```

## Notes

- Idempotency is in-memory here for simplicity. In prod this was a PG table with TTL cleanup.
- The ClickHouse insert is per-event. In prod we batched inserts on a short timer (~500ms) to avoid hammering CH with tiny inserts.
- Search uses `earth_distance` extension — good enough for moderate scale. If you need sub-10ms at millions of stations, PostGIS or a dedicated search index would be the next step.
