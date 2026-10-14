export function normalizeLabel(value: string): string {
  return value.trim().toLowerCase();
}

export function parseLabels(raw?: string): string[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(/[,;]/)
    .map(part => part.trim())
    .filter(Boolean);
}

export function labelVariants(label: string): string[] {
  const trimmed = label.trim();
  if (!trimmed) {
    return [];
  }
  const lower = trimmed.toLowerCase();
  const titled = lower.charAt(0).toUpperCase() + lower.slice(1);
  return Array.from(new Set([trimmed, lower, titled]));
}

export function matchesAnyLabel(rawLabels: string | undefined, selected: string[]): boolean {
  if (selected.length === 0) {
    return true;
  }
  const issueLabels = parseLabels(rawLabels).map(normalizeLabel);
  const wanted = new Set(selected.map(normalizeLabel));
  return issueLabels.some(label => wanted.has(label));
}

export function uniqueLabels(rawValues: Array<string | undefined>): string[] {
  const byKey = new Map<string, string>();
  for (const raw of rawValues) {
    for (const label of parseLabels(raw)) {
      const key = normalizeLabel(label);
      if (key && !byKey.has(key)) {
        byKey.set(key, label);
      }
    }
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, 'en'));
}
