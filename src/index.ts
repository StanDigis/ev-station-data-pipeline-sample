import { InMemoryIdempotencyRepository } from './repositories/idempotencyRepository.js';
import { ingestPartnerStationUpdate } from './services/partnerIngestion.js';
import type { PartnerStationPayload } from './types/domain.js';

/**
 * Quick smoke test — runs the ingestion flow with in-memory stubs.
 * In prod, PG and CH adapters would come from createPgPool / createClickHouseClient.
 */
async function main() {
  const idempotency = new InMemoryIdempotencyRepository();

  const fakeStations = {
    async upsertCurrentState() {
      return 'station_123';
    },
    async searchNearby() {
      return [];
    }
  };

  const fakeEvents = {
    async appendStationUpdateEvent() {}
  };

  const payload: PartnerStationPayload = {
    partner: 'chargeflow',
    partnerStationId: 'CF-42',
    name: 'Central Mall Charger',
    latitude: 42.4411,
    longitude: 19.2627,
    address: 'Example Street 1',
    connectors: ['CCS', 'Type2'],
    pricePerKwh: 0.38,
    currency: 'EUR',
    isAvailable: true,
    updatedAt: new Date().toISOString()
  };

  const first = await ingestPartnerStationUpdate(payload, {
    idempotency,
    stations: fakeStations,
    stationEvents: fakeEvents
  });
  console.log('first:', first);

  // same payload again — should be skipped by idempotency guard
  const duplicate = await ingestPartnerStationUpdate(payload, {
    idempotency,
    stations: fakeStations,
    stationEvents: fakeEvents
  });
  console.log('duplicate:', duplicate);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
