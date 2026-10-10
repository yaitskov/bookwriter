export function deepMap(
  propertyName: string,
  fn: (value: unknown) => unknown,
  object: unknown,
): unknown {
  if (Array.isArray(object)) {
    for (const element of object) deepMap(propertyName, fn, element);
    return object;
  }
  if (object === null || typeof object !== "object") return object;
  const record = object as { [key: string]: unknown };
  for (const key of Object.keys(record)) {
    if (key === propertyName) record[key] = fn(record[key]);
    deepMap(propertyName, fn, record[key]);
  }
  return object;
}
