import { createHash } from 'node:crypto';
import { normalizePartnerPayload } from './normalizePartnerPayload.js';
import { logger } from '../utils/logger.js';
import { withRetry } from '../queue/retry.js';
import type { PartnerStationPayload } from '../types/domain.js';
import type { IdempotencyRepository } from '../repositories/idempotencyRepository.js';
import type { StationRepository } from '../repositories/stationRepository.js';
import type { StationEventRepository } from '../repositories/stationEventRepository.js';

export interface PartnerIngestionDeps {
  idempotency: IdempotencyRepository;
  stations: StationRepository;
  stationEvents: StationEventRepository;
}

// TODO: accept PartnerStationPayload[] and batch-insert to CH in one call
export async function ingestPartnerStationUpdate(
  payload: PartnerStationPayload,
  deps: PartnerIngestionDeps
): Promise<{ stationId: string; skipped: boolean }> {
  const normalized = normalizePartnerPayload(payload);

  const idempotencyKey = hashPayloadFields({
    partner: normalized.partner,
    externalId: normalized.externalId,
    sourceUpdatedAt: normalized.sourceUpdatedAt.toISOString(),
    pricePerKwh: normalized.pricePerKwh,
    isAvailable: normalized.isAvailable
  });

  if (await deps.idempotency.hasProcessed(idempotencyKey)) {
    logger.info('Duplicate station update skipped', {
      partner: normalized.partner,
      externalId: normalized.externalId
    });

    return { stationId: `${normalized.partner}:${normalized.externalId}`, skipped: true };
  }

  const stationId = await withRetry(
    () => deps.stations.upsertCurrentState(normalized),
    { maxAttempts: 3, initialDelayMs: 200 }
  );

  // CH append is best-effort — we still mark idempotency even if this fails
  // after retries, so we don't re-upsert PG on the next attempt
  try {
    await withRetry(
      () => deps.stationEvents.appendStationUpdateEvent(stationId, normalized),
      { maxAttempts: 3, initialDelayMs: 200 }
    );
  } catch (err) {
    logger.error('Failed to append CH event, will not block ingestion', {
      stationId,
      error: String(err)
    });
  }

  await deps.idempotency.markProcessed(idempotencyKey);

  logger.info('Station update processed', {
    stationId,
    partner: normalized.partner,
    externalId: normalized.externalId
  });

  return { stationId, skipped: false };
}

function hashPayloadFields(fields: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(fields)).digest('hex');
}
