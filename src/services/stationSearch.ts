import type { SearchStationsInput, StationSearchResult } from '../types/domain.js';
import type { StationRepository } from '../repositories/stationRepository.js';

const MAX_RADIUS_KM = 200;
const DEFAULT_LIMIT = 20;

export class StationSearchService {
  constructor(private readonly stations: StationRepository) {}

  async search(input: SearchStationsInput): Promise<StationSearchResult[]> {
    if (input.radiusKm <= 0 || input.radiusKm > MAX_RADIUS_KM) {
      throw new Error(`radiusKm must be between 0 and ${MAX_RADIUS_KM}`);
    }

    return this.stations.searchNearby({
      ...input,
      limit: Math.min(input.limit ?? DEFAULT_LIMIT, 100)
    });
  }
}
