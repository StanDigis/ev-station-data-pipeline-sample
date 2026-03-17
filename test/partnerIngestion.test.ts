import test from 'node:test';
import assert from 'node:assert/strict';
import { ingestPartnerStationUpdate } from '../src/services/partnerIngestion.js';
import { InMemoryIdempotencyRepository } from '../src/repositories/idempotencyRepository.js';
import type { PartnerStationPayload } from '../src/types/domain.js';

function makePayload(overrides?: Partial<PartnerStationPayload>): PartnerStationPayload {
  return {
    partner: 'plugnet',
    partnerStationId: 'PL-1',
    name: 'North Charger',
    latitude: 42.5,
    longitude: 19.2,
    connectors: ['CCS'],
    pricePerKwh: 0.45,
    currency: 'EUR',
    isAvailable: true,
    updatedAt: '2025-03-10T10:00:00.000Z',
    ...overrides,
  };
}

function makeDeps(idempotency: InMemoryIdempotencyRepository) {
  let upsertCalls = 0;
  let eventCalls = 0;

  const deps = {
    idempotency,
    stations: {
      async upsertCurrentState() {
        upsertCalls += 1;
        return 'station_1';
      },
      async searchNearby() {
        return [];
      }
    },
    stationEvents: {
      async appendStationUpdateEvent() {
        eventCalls += 1;
      }
    }
  };

  return { deps, getCounts: () => ({ upsertCalls, eventCalls }) };
}

test('skips duplicate payloads', async () => {
  const idempotency = new InMemoryIdempotencyRepository();
  const { deps, getCounts } = makeDeps(idempotency);
  const payload = makePayload();

  const first = await ingestPartnerStationUpdate(payload, deps);
  const second = await ingestPartnerStationUpdate(payload, deps);

  assert.equal(first.skipped, false);
  assert.equal(second.skipped, true);
  assert.equal(getCounts().upsertCalls, 1);
  assert.equal(getCounts().eventCalls, 1);
});

test('processes updates with different prices as separate events', async () => {
  const idempotency = new InMemoryIdempotencyRepository();
  const { deps, getCounts } = makeDeps(idempotency);

  await ingestPartnerStationUpdate(makePayload({ pricePerKwh: 0.40 }), deps);
  await ingestPartnerStationUpdate(makePayload({ pricePerKwh: 0.42 }), deps);

  assert.equal(getCounts().upsertCalls, 2);
  assert.equal(getCounts().eventCalls, 2);
});

test('rejects invalid coordinates', async () => {
  const idempotency = new InMemoryIdempotencyRepository();
  const { deps } = makeDeps(idempotency);

  await assert.rejects(
    () => ingestPartnerStationUpdate(makePayload({ latitude: 999 }), deps),
    (err: Error) => err.message.includes('too_big')
  );
});

test('continues ingestion when CH event append fails', async () => {
  const idempotency = new InMemoryIdempotencyRepository();
  const { deps } = makeDeps(idempotency);

  deps.stationEvents.appendStationUpdateEvent = async () => {
    throw new Error('CH timeout');
  };

  const result = await ingestPartnerStationUpdate(makePayload(), deps);

  // ingestion should succeed — CH failure is not blocking
  assert.equal(result.skipped, false);
  assert.equal(result.stationId, 'station_1');
});
