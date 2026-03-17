import type { ClickHouseClient } from '@clickhouse/client';
import type { NormalizedStationUpdate } from '../types/domain.js';

export interface StationEventRepository {
  appendStationUpdateEvent(stationId: string, update: NormalizedStationUpdate): Promise<void>;
}

export class ClickHouseStationEventRepository implements StationEventRepository {
  constructor(private readonly ch: ClickHouseClient) {}

  async appendStationUpdateEvent(stationId: string, update: NormalizedStationUpdate): Promise<void> {
    // TODO: batch these via a short flush timer instead of inserting one-by-one
    await this.ch.insert({
      table: 'station_update_events',
      values: [
        {
          station_id: stationId,
          external_id: update.externalId,
          partner: update.partner,
          station_name: update.stationName,
          lat: update.lat,
          lon: update.lon,
          price_per_kwh: update.pricePerKwh,
          currency: update.currency,
          is_available: update.isAvailable ? 1 : 0,
          source_updated_at: update.sourceUpdatedAt.toISOString(),
          received_at: update.receivedAt.toISOString()
        }
      ],
      format: 'JSONEachRow'
    });
  }
}
