import type { Pool, QueryResultRow } from 'pg';
import type { NormalizedStationUpdate, SearchStationsInput, StationSearchResult } from '../types/domain.js';

export interface StationRepository {
  upsertCurrentState(update: NormalizedStationUpdate): Promise<string>;
  searchNearby(input: SearchStationsInput): Promise<StationSearchResult[]>;
}

export class PgStationRepository implements StationRepository {
  constructor(private readonly pg: Pool) {}

  async upsertCurrentState(update: NormalizedStationUpdate): Promise<string> {
    const sql = `
      INSERT INTO charging_stations (
        external_id, partner, name, latitude, longitude, address,
        connectors, price_per_kwh, currency, is_available,
        source_updated_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
      ON CONFLICT (external_id, partner) DO UPDATE SET
        name            = EXCLUDED.name,
        latitude        = EXCLUDED.latitude,
        longitude       = EXCLUDED.longitude,
        address         = EXCLUDED.address,
        connectors      = EXCLUDED.connectors,
        price_per_kwh   = EXCLUDED.price_per_kwh,
        currency        = EXCLUDED.currency,
        is_available    = EXCLUDED.is_available,
        source_updated_at = EXCLUDED.source_updated_at,
        updated_at      = NOW()
      RETURNING id;
    `;

    const { rows } = await this.pg.query<{ id: string }>(sql, [
      update.externalId,
      update.partner,
      update.stationName,
      update.lat,
      update.lon,
      update.address,
      update.connectors,
      update.pricePerKwh,
      update.currency,
      update.isAvailable,
      update.sourceUpdatedAt
    ]);

    return rows[0].id;
  }

  async searchNearby(input: SearchStationsInput): Promise<StationSearchResult[]> {
    // $1=lat $2=lon $3=radiusKm $4=limit — keep these fixed, optional filters go after
    const params: unknown[] = [input.lat, input.lon, input.radiusKm, input.limit ?? 20];
    const where: string[] = [
      `earth_distance(ll_to_earth(latitude, longitude), ll_to_earth($1, $2)) <= $3 * 1000`
    ];

    if (input.connector) {
      params.push(input.connector);
      where.push(`$${params.length} = ANY(connectors)`);
    }
    if (input.onlyAvailable) {
      where.push(`is_available = true`);
    }
    if (input.maxPricePerKwh != null) {
      params.push(input.maxPricePerKwh);
      where.push(`price_per_kwh <= $${params.length}`);
    }

    const sql = `
      SELECT
        id, name, address,
        latitude AS lat, longitude AS lon,
        connectors,
        price_per_kwh  AS "pricePerKwh",
        currency,
        is_available   AS "isAvailable",
        source_updated_at AS "updatedAt",
        earth_distance(ll_to_earth(latitude, longitude), ll_to_earth($1, $2)) / 1000 AS "distanceKm"
      FROM charging_stations
      WHERE ${where.join(' AND ')}
      ORDER BY "distanceKm"
      LIMIT $4
    `;

    return (await this.pg.query<StationSearchResult>(sql, params)).rows;
  }
}
