// core/ — small JSON-validation primitives shared by the level and tuning
// loaders (both parse untrusted `unknown` data into typed shapes and must
// throw with a clear message on anything malformed, tech-spec §10).

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function requireFiniteNumber(value: unknown, namespace: string, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${namespace}: "${field}" must be a finite number, got ${JSON.stringify(value)}`);
  }
  return value;
}
