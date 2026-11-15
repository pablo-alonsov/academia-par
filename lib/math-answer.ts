export type MathEntryKind = "fraction" | "power";
export type MathEntryResult = {text: string; error: null} | {text: null; error: string};

function integerPart(value: string, maxDigits: number): string | null {
  const normalized = value.trim().replace(/−/g, "-");
  return new RegExp(`^[+-]?\\d{1,${maxDigits}}$`).test(normalized) ? normalized : null;
}

/** Builds plain notation for an answer or procedure; it never calculates it. */
export function buildMathEntry(kind: MathEntryKind, first: string, second: string): MathEntryResult {
  if (kind !== "fraction" && kind !== "power") return {text: null, error: "Elige una fracción o una potencia."};
  const a = integerPart(first, 12), b = integerPart(second, kind === "power" ? 6 : 12);
  if (a === null) return {text: null, error: kind === "fraction" ? "Escribe un numerador entero de hasta 12 dígitos." : "Escribe una base entera de hasta 12 dígitos."};
  if (b === null) return {text: null, error: kind === "fraction" ? "Escribe un denominador entero de hasta 12 dígitos." : "Escribe un exponente entero de hasta 6 dígitos."};
  if (kind === "fraction") {
    if (/^[+-]?0+$/.test(b)) return {text: null, error: "El denominador no puede ser 0."};
    return {text: `${a}/${b}`, error: null};
  }
  return {text: `${a.startsWith("-") ? `(${a})` : a}^${b}`, error: null};
}

/** Same subject boundary as MathText: mathematical notation is contextual. */
export function isMathSubject(subject?: string): boolean {
  return /^(matematicas|fisica y quimica)(?:\b|$)/.test((subject || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
}

type MathInsertion = {value: string; start: number; end: number; inserted: boolean};

/**
 * Uses textarea UTF-16 selection offsets and its maxLength convention. Unknown
 * selections append. Failed insertion never clips or otherwise rewrites work.
 */
export function insertMathEntry(value: string, start: number | null, end: number | null, text: string, limit: number): MathInsertion {
  let from = value.length, to = value.length;
  if (start !== null && end !== null && Number.isFinite(start) && Number.isFinite(end)) {
    const a = Math.max(0, Math.min(value.length, Math.trunc(start))), b = Math.max(0, Math.min(value.length, Math.trunc(end)));
    from = Math.min(a, b); to = Math.max(a, b);
  }
  const unchanged = {value, start: from, end: to, inserted: false};
  if (!text || !Number.isFinite(limit) || limit < 0 || value.length - (to - from) + text.length > Math.floor(limit)) return unchanged;
  const next = value.slice(0, from) + text + value.slice(to), caret = from + text.length;
  return {value: next, start: caret, end: caret, inserted: true};
}
