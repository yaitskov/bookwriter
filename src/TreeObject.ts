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

export function deepTraverse(object: unknown, propertyName: string): string[] {
  const values: string[] = [];
  if (Array.isArray(object)) {
    for (const element of object) values.push(...deepTraverse(element, propertyName));
    return values;
  }
  if (object === null || typeof object !== "object") return values;
  const record = object as { [key: string]: unknown };
  for (const key of Object.keys(record)) {
    const value = record[key];
    if (key === propertyName && typeof value === "string") values.push(value);
    values.push(...deepTraverse(value, propertyName));
  }
  return values;
}

