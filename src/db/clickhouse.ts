import { createClient, type ClickHouseClient } from '@clickhouse/client';

export function createClickHouseClient(url: string): ClickHouseClient {
  return createClient({
    url,
    request_timeout: 30_000,
    clickhouse_settings: {
      async_insert: 1,
      wait_for_async_insert: 0,
    },
  });
}
