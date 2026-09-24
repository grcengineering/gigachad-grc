export function serializeQueryResult<T>(value: T): T {
  if (typeof value === 'bigint') {
    return Number(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializeQueryResult(item)) as T;
  }
  if (
    value &&
    typeof value === 'object' &&
    !(value instanceof Date) &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serializeQueryResult(item)])
    ) as T;
  }
  return value;
}
