export interface IdempotencyRepository {
  hasProcessed(key: string): Promise<boolean>;
  markProcessed(key: string): Promise<void>;
}

/**
 * Good enough for dev/test. In prod, swap for PgIdempotencyRepository
 * backed by a table with a TTL cleanup job (we used 72h).
 */
export class InMemoryIdempotencyRepository implements IdempotencyRepository {
  private readonly keys = new Set<string>();

  async hasProcessed(key: string) {
    return this.keys.has(key);
  }

  async markProcessed(key: string) {
    this.keys.add(key);
  }
}
