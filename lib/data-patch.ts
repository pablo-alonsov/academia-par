/** Merge affected rows without refetching the unchanged teaching catalogue. */
export function applyDataPatch(current: Record<string, any[]> | null, patch: Record<string, any[]> = {}, removed: Record<string, string[]> = {}) {
  if (!current) return current;
  const result = { ...current };
  for (const table of new Set([...Object.keys(patch), ...Object.keys(removed)])) {
    const deleted = new Set(removed[table] || []);
    const rows = new Map((current[table] || []).filter(row => !deleted.has(row.id)).map(row => [row.id, row]));
    for (const row of patch[table] || []) {
      const existing = rows.get(row.id);
      if (!existing?.updatedAt || !row.updatedAt || row.updatedAt >= existing.updatedAt) rows.set(row.id, row);
    }
    result[table] = Array.from(rows.values());
  }
  return result;
}
