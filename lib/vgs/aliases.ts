const tokenAliasPattern = /^(?:tok|vgs)_sandbox_[A-Za-z0-9-]+$/;
const cardAliasPattern = /^\d{13,19}$/;
const cvcAliasPattern = /^\d{3,4}$/;

function validAlias(value: unknown, numericAliasPattern: RegExp | null): value is string {
  return typeof value === "string" && (
    tokenAliasPattern.test(value) || Boolean(numericAliasPattern?.test(value))
  );
}

function aliasFromValue(value: unknown, numericAliasPattern: RegExp | null): string | null {
  if (validAlias(value, numericAliasPattern)) return value;
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (validAlias(record.alias, numericAliasPattern)) return record.alias;
  if (validAlias(record.value, numericAliasPattern)) return record.value;
  if (Array.isArray(record.aliases)) {
    for (const candidate of record.aliases) {
      const alias = aliasFromValue(candidate, numericAliasPattern);
      if (alias) return alias;
    }
  }
  return null;
}

export function findVgsFieldAlias(response: unknown, fieldName: string) {
  const numericAliasPattern = fieldName === "card-number" ? cardAliasPattern :
    fieldName === "card-cvc" ? cvcAliasPattern : null;
  if (typeof response === "string") {
    try {
      return findVgsFieldAlias(JSON.parse(response), fieldName);
    } catch {
      return null;
    }
  }
  if (!response || typeof response !== "object") return null;

  const queue: unknown[] = [response];
  const visited = new Set<object>();
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || visited.has(current)) continue;
    visited.add(current);

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    const record = current as Record<string, unknown>;
    if (fieldName in record) {
      const alias = aliasFromValue(record[fieldName], numericAliasPattern);
      if (alias) return alias;
    }

    const identifiesField = record.name === fieldName ||
      record.field_name === fieldName ||
      record.fieldName === fieldName ||
      (Array.isArray(record.classifiers) && record.classifiers.includes(fieldName));
    if (identifiesField) {
      const alias = aliasFromValue(record, numericAliasPattern);
      if (alias) return alias;
    }

    for (const value of Object.values(record)) {
      if (value && typeof value === "object") queue.push(value);
      if (typeof value === "string" && /^[\[{]/.test(value.trim())) {
        try { queue.push(JSON.parse(value)); } catch { /* Not JSON; ignore it. */ }
      }
    }
  }
  return null;
}

export function findVgsFieldValue(response: unknown, fieldName: string): string | null {
  if (typeof response === "string") {
    try { return findVgsFieldValue(JSON.parse(response), fieldName); } catch { return null; }
  }
  if (!response || typeof response !== "object") return null;

  const queue: unknown[] = [response];
  const visited = new Set<object>();
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || visited.has(current)) continue;
    visited.add(current);
    if (Array.isArray(current)) { queue.push(...current); continue; }

    const record = current as Record<string, unknown>;
    if (typeof record[fieldName] === "string") return record[fieldName];
    if (record[fieldName] && typeof record[fieldName] === "object") {
      const fieldRecord = record[fieldName] as Record<string, unknown>;
      if (typeof fieldRecord.value === "string") return fieldRecord.value;
    }
    const identifiesField = record.name === fieldName || record.field_name === fieldName ||
      record.fieldName === fieldName || (Array.isArray(record.classifiers) && record.classifiers.includes(fieldName));
    if (identifiesField && typeof record.value === "string") return record.value;
    for (const value of Object.values(record)) if (value && typeof value === "object") queue.push(value);
  }
  return null;
}

export function describeVgsResponseShape(response: unknown) {
  let normalized = response;
  if (typeof normalized === "string") {
    const stringValue = normalized;
    try { normalized = JSON.parse(stringValue); } catch {
      return [
        "root:string",
        `length:${stringValue.length}`,
        `hasTokenAlias:${/(?:tok|vgs)_sandbox_[A-Za-z0-9-]+/.test(stringValue)}`,
        `hasCardField:${stringValue.includes("card-number")}`,
        `hasExpirationField:${stringValue.includes("card-expiration")}`,
        `startsJson:${/^[\[{]/.test(stringValue.trim())}`,
      ].join(" ");
    }
  }
  if (!normalized || typeof normalized !== "object") return `root:${typeof normalized}`;
  const root = normalized as Record<string, unknown>;
  const rootKeys = Object.keys(root).sort().slice(0, 20).join(",");
  let data = root.data;
  if (typeof data === "string") {
    try { data = JSON.parse(data); } catch { return `root:{${rootKeys}} data:string`; }
  }
  if (Array.isArray(data)) {
    const itemKeys = data.slice(0, 5).map((item) =>
      item && typeof item === "object" ? Object.keys(item).sort().slice(0, 20).join("|") : typeof item,
    );
    return `root:{${rootKeys}} data:array items:[${itemKeys.join(";")}]`;
  }
  if (data && typeof data === "object") {
    return `root:{${rootKeys}} data:{${Object.keys(data).sort().slice(0, 20).join(",")}}`;
  }
  return `root:{${rootKeys}} data:${typeof data}`;
}
