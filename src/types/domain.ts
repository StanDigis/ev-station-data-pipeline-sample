export type PartnerName = 'chargeflow' | 'plugnet' | 'voltgrid';

/** Raw payload as it comes from the partner webhook / queue message */
export interface PartnerStationPayload {
  partner: PartnerName;
  partnerStationId: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  connectors: string[];
  pricePerKwh: number | null;
  currency: string | null;
  isAvailable: boolean;
  updatedAt: string; // ISO 8601
}

/** Cleaned-up version after validation + normalization */
export interface NormalizedStationUpdate {
  externalId: string;
  partner: PartnerName;
  stationName: string;
  lat: number;
  lon: number;
  address: string | null;
  connectors: string[];
  pricePerKwh: number | null;
  currency: string | null;
  isAvailable: boolean;
  sourceUpdatedAt: Date;
  receivedAt: Date;
}

export interface SearchStationsInput {
  lat: number;
  lon: number;
  radiusKm: number;
  connector?: string;
  onlyAvailable?: boolean;
  maxPricePerKwh?: number;
  limit?: number;
}

export interface StationSearchResult {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lon: number;
  connectors: string[];
  pricePerKwh: number | null;
  currency: string | null;
  isAvailable: boolean;
  distanceKm: number;
  updatedAt: Date;
}
