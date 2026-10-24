export function deepMap(
  fn: (value: string) => unknown,
  object: unknown,
  propertyName?: string,
): unknown {
  if (Array.isArray(object)) {
    for (const element of object) deepMap(fn, element, propertyName);
    return object;
  }
  if (object === null || typeof object !== "object") return object;
  const record = object as { [key: string]: unknown };
  if (
    record.property &&
    record.value &&
    typeof record.value === "string" &&
    (propertyName === undefined || record.property === propertyName)
  ) {
    record.value = fn(record.value);
  }
  for (const key of Object.keys(record)) {
    deepMap(fn, record[key], propertyName);
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
  if (record.property && record.property == propertyName && record.value && typeof record.value === "string") {
    values.push(record.value);
  }
  for (const key of Object.keys(record)) {
    const value = record[key];
    values.push(...deepTraverse(value, propertyName));
  }
  return values;
}
