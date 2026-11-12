export type LocalFormKind = "question" | "word";
export type LocalFormCopy = { studentId: string; kind: LocalFormKind; id: string; value: Record<string, any>; updatedAt: string };
type FormStorage = Pick<Storage, "length" | "key" | "getItem" | "setItem" | "removeItem">;
const FORM_PREFIX = "arp-local-form-v1:";
export const localFormKey = (studentId: string, kind: LocalFormKind, id: string) => `${FORM_PREFIX}${encodeURIComponent(studentId)}:${kind}:${encodeURIComponent(id)}`;

export function readLocalForms(storage: FormStorage, studentId: string, kind: LocalFormKind): LocalFormCopy[] {
  const copies: LocalFormCopy[] = [], prefix = `${FORM_PREFIX}${encodeURIComponent(studentId)}:${kind}:`;
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index); if (!key?.startsWith(prefix)) continue;
    try {
      const copy = JSON.parse(storage.getItem(key) || "null");
      const meaningful = kind === "question" ? String(copy?.value?.question || "").trim() : ["original", "corrected", "reason", "sentence"].some(field => String(copy?.value?.[field] || "").trim());
      if (meaningful && copy?.studentId === studentId && copy.kind === kind && typeof copy.id === "string" && copy.id && copy.value && typeof copy.value === "object") copies.push(copy);
    } catch { /* One damaged record must not hide the other pending forms. */ }
  }
  return copies.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

export function writeLocalForm(storage: FormStorage, copy: LocalFormCopy) {
  storage.setItem(localFormKey(copy.studentId, copy.kind, copy.id), JSON.stringify(copy));
}

/** Remove only the version that was actually saved, preserving a newer edit in another tab. */
export function removeLocalForm(storage: FormStorage, copy: LocalFormCopy) {
  const key = localFormKey(copy.studentId, copy.kind, copy.id), current = storage.getItem(key);
  if (!current) return true;
  try { if (JSON.stringify(JSON.parse(current).value) !== JSON.stringify(copy.value)) return false; } catch { return false; }
  storage.removeItem(key); return true;
}

export function insertMathSymbol(value: string, start: number | null, end: number | null, symbol: string, limit = 1000) {
  const from = Math.max(0, Math.min(value.length, start ?? value.length)), to = Math.max(from, Math.min(value.length, end ?? from));
  const next = `${value.slice(0, from)}${symbol}${value.slice(to)}`;
  if (next.length > limit) return { value, cursor: from };
  return { value: next, cursor: from + symbol.length };
}

export function mayResumeStudentDraft(expectedProfile: string, detail: any, pending: boolean, blocked: boolean) {
  return detail?.profile === expectedProfile && Boolean(detail.snapshot) && pending && !blocked;
}
