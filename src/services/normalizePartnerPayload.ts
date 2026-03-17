import { z } from 'zod';
import type { NormalizedStationUpdate, PartnerStationPayload } from '../types/domain.js';

const SUPPORTED_PARTNERS = ['chargeflow', 'plugnet', 'voltgrid'] as const;

const payloadSchema = z.object({
  partner: z.enum(SUPPORTED_PARTNERS),
  partnerStationId: z.string().min(1),
  name: z.string().min(1),
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
  address: z.string().optional(),
  connectors: z.array(z.string()).default([]),
  pricePerKwh: z.number().nonnegative().nullable(),
  currency: z.string().length(3).nullable(),
  isAvailable: z.boolean(),
  updatedAt: z.string().min(1)
});

export function normalizePartnerPayload(raw: PartnerStationPayload): NormalizedStationUpdate {
  const p = payloadSchema.parse(raw);

  return {
    externalId: p.partnerStationId,
    partner: p.partner,
    stationName: p.name.trim(),
    lat: p.latitude,
    lon: p.longitude,
    address: p.address?.trim() ?? null,
    // deduplicate + lowercase connectors — partners sometimes send ["ccs","CCS"]
    connectors: [...new Set(p.connectors.map((c) => c.trim().toLowerCase()))],
    pricePerKwh: p.pricePerKwh,
    currency: p.currency?.toUpperCase() ?? null,
    isAvailable: p.isAvailable,
    sourceUpdatedAt: new Date(p.updatedAt),
    receivedAt: new Date()
  };
}
