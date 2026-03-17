import type { SearchStationsInput } from '../types/domain.js';
import { StationSearchService } from '../services/stationSearch.js';

export async function handleSearchRequest(
  query: Record<string, string | undefined>,
  service: StationSearchService
) {
  const lat = Number(query.lat);
  const lon = Number(query.lon);

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    throw new Error('lat and lon are required and must be valid numbers');
  }

  const input: SearchStationsInput = {
    lat,
    lon,
    radiusKm: Number(query.radiusKm) || 10,
    connector: query.connector,
    onlyAvailable: query.onlyAvailable === 'true',
    maxPricePerKwh: query.maxPricePerKwh ? Number(query.maxPricePerKwh) : undefined,
    limit: query.limit ? Number(query.limit) : undefined
  };

  return service.search(input);
}
