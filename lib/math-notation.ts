export type MathTextToken =
  | {type: "text"; text: string}
  | {type: "fraction"; numerator: string; denominator: string; spoken: string}
  | {type: "power"; base: string; exponent: string; spoken: string}
  | {type: "root"; radicand: string; spoken: string};

type Range = {start: number; end: number};
const SIGN = "[+\\-−]?";
const INTEGER = `${SIGN}\\d+`;
const BASE = `(?:\\(${INTEGER}\\)|\\d+|[\\p{L}µμ]+)`;
const EXPONENT = `(?:\\(${INTEGER}\\)|${INTEGER}|□)`;
const FRACTION_PART = `(?:${INTEGER}|□)`;
const SUPER_DIGITS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const SUPER_NUMBER = `[⁺⁻]?[${SUPER_DIGITS}]+`;
const SUPER_VALUES: Record<string,string> = {"⁰":"0","¹":"1","²":"2","³":"3","⁴":"4","⁵":"5","⁶":"6","⁷":"7","⁸":"8","⁹":"9","⁻":"−","⁺":"+"};
const UNITS = new Set(["m","cm","mm","dm","km","nm","µm","μm","g","kg","mg","cg","dg","l","ml","dl","cl","s","min","h","a","k","mol","cd","hz","pa","n","j","w","v","c","ω"]);
const WORD = /[\p{L}\p{N}_]/u;
const SUPER = /[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]/u;
const SPACE = "[ \\t]*";

function unparenthesize(value: string): string {
  return value.startsWith("(") && value.endsWith(")") ? value.slice(1, -1) : value;
}
function integer(value: string, maxDigits = 12): boolean {
  return new RegExp(`^[+\\-−]?\\d{1,${maxDigits}}$`).test(value);
}
function signedSpoken(value: string): string {
  const raw = unparenthesize(value);
  return raw.replace(/^[-−]/, "menos ").replace(/^\+/, "más ");
}
function closingParenthesis(text: string, open: number): number {
  let depth = 0;
  for (let index = open; index < text.length; index++) {
    if (text[index] === "\n" || text[index] === "\r") return -1;
    if (text[index] === "(") depth++;
    if (text[index] === ")" && --depth === 0) return index;
  }
  return -1;
}

function protectedRanges(text: string): Range[] {
  const ranges: Range[] = [];
  const protect = (pattern: RegExp) => {
    for (const match of text.matchAll(pattern)) ranges.push({start: match.index, end: match.index + match[0].length});
  };
  // URLs (including ordinary domain/path links) and email addresses are literal.
  protect(/(?:[a-z][a-z0-9+.-]*:\/\/|www\.|(?:[a-z0-9-]+\.)+[a-z]{2,}\/|\/(?:api|assets|files|resources)\/)[^\s<>"']+/giu);
  protect(/[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+/gu);
  // Three-part dates/division chains, year/month and padded short dates are
  // ambiguous. Unpadded 3/4 remains a fraction unless a date label identifies it.
  protect(/\b\d{1,4}[ \t]*([/-])[ \t]*\d{1,2}[ \t]*\1[ \t]*\d{1,4}\b/gu);
  protect(/\b(?:19|20|21)\d{2}[/-](?:0?[1-9]|1[0-2])\b/gu);
  protect(/\b(?:0[1-9]\/\d{1,2}|\d{1,2}\/0[1-9])\b/gu);
  protect(/\b(?:fecha|día|examen|prueba|lunes|martes|miércoles|jueves|viernes|sábado|domingo|hasta|desde)(?:[ \t]+(?:del?|el|para))?[ \t]*:?[ \t]+\d{1,2}\/\d{1,2}\b/giu);

  // Leave compound exponents/radicands and parenthesized denominators intact,
  // rather than styling an inner fragment as a different-looking expression.
  for (const marker of text.matchAll(/[√^/][ \t]*\(/gu)) {
    const open = marker.index + marker[0].lastIndexOf("("), close = closingParenthesis(text, open);
    if (close < 0) { ranges.push({start: marker.index, end: text.length}); continue; }
    const inside = text.slice(open + 1, close);
    if (marker[0][0] === "/" || !integer(inside, marker[0][0] === "^" ? 6 : 12)) ranges.push({start: marker.index, end: close + 1});
  }
  for (const open of text.matchAll(/\(/gu)) {
    const close = closingParenthesis(text, open.index);
    if (close < 0 || integer(text.slice(open.index + 1, close))) continue;
    const outerPower = text.slice(close + 1).match(new RegExp(`^${SPACE}(?:\\^${SPACE}${EXPONENT}|${SUPER_NUMBER})`, "u"));
    if (outerPower) ranges.push({start: open.index, end: close + 1 + outerPower[0].length});
  }
  return ranges;
}

function boundary(text: string, start: number, end: number, unitPower: boolean): boolean {
  const previous = text[start - 1] || "", next = text[end] || "";
  if ((previous && (WORD.test(previous) || SUPER.test(previous) || previous === "□")) || (next && (WORD.test(next) || SUPER.test(next) || next === "□"))) return false;
  if ((/[.,]/.test(previous) && /\d/.test(text[start - 2] || "")) || (/[.,]/.test(next) && /\d/.test(text[end + 1] || ""))) return false;
  const before = text.slice(0, start).trimEnd().slice(-1), after = text.slice(end).trimStart()[0] || "";
  if (before === "^" || before === "√" || (before === "/" && !unitPower)) return false;
  return after !== "^" && after !== "/" && !SUPER.test(after);
}
function unarySign(text: string, start: number): boolean {
  const before = text.slice(0, start).trimEnd().slice(-1);
  return !before || !/[\p{L}\p{N}_)\]⁰¹²³⁴⁵⁶⁷⁸⁹]/u.test(before);
}

/**
 * Recognizes a deliberately small set of explicit school maths notation.
 * It does not evaluate, replace written numbers, parse arbitrary formulae, or
 * infer the subject. The caller decides which subject/context to render.
 * Unsupported or ambiguous fragments are returned verbatim as ordinary text.
 */
export function tokenizeMathText(text: string): MathTextToken[] {
  if (!text) return [];
  const pattern = new RegExp(`(?<root>√${SPACE}(?:\\(${INTEGER}\\)|\\d+))|(?<power>${BASE}${SPACE}\\^${SPACE}${EXPONENT})|(?<super>${BASE}${SUPER_NUMBER})|(?<fraction>${FRACTION_PART}${SPACE}/${SPACE}${FRACTION_PART})`, "gu");
  const ranges = protectedRanges(text), tokens: MathTextToken[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    let start = match.index;
    const end = start + match[0].length;
    if (ranges.some(range => start < range.end && end > range.start)) continue;
    let token: MathTextToken | undefined;
    let unitPower = false;
    if (match.groups?.fraction) {
      const parts = match[0].split("/").map(part => part.trim());
      let numerator = parts[0];
      if (/^[+\-−]/.test(numerator) && !unarySign(text, start)) { start++; numerator = numerator.slice(1); }
      if ((integer(numerator) || numerator === "□") && (integer(parts[1]) || parts[1] === "□")) token = {type:"fraction", numerator, denominator:parts[1], spoken:`${numerator === "□" ? "casilla" : signedSpoken(numerator)} dividido entre ${parts[1] === "□" ? "casilla" : signedSpoken(parts[1])}`};
    } else if (match.groups?.power || match.groups?.super) {
      const parts = match.groups.power ? match[0].split("^").map(part => part.trim()) : match[0].match(new RegExp(`^(${BASE})(${SUPER_NUMBER})$`, "u"))?.slice(1);
      if (!parts) continue;
      const base = parts[0], exponent = match.groups.super ? [...parts[1]].map(char => SUPER_VALUES[char]).join("") : unparenthesize(parts[1]);
      const rawBase = unparenthesize(base), numberBase = integer(rawBase), letterBase = /^[\p{L}µμ]+$/u.test(base);
      const unit = UNITS.has(base.toLowerCase());
      unitPower = letterBase && (base.length === 1 || unit);
      if ((numberBase || (unitPower && (!unit || !/^[-−]/.test(exponent)))) && (integer(exponent, 6) || exponent === "□")) token = {type:"power", base, exponent, spoken:`${signedSpoken(base)}${base.startsWith("(") ? " entre paréntesis" : ""} elevado ${exponent === "□" ? "al exponente que falta" : `a ${signedSpoken(exponent)}`}`};
    } else if (match.groups?.root) {
      const radicand = unparenthesize(match[0].slice(1).trim());
      if (integer(radicand)) token = {type:"root", radicand, spoken:`raíz cuadrada de ${signedSpoken(radicand)}`};
    }
    if (!token || !boundary(text, start, end, unitPower)) continue;
    if (start > cursor) tokens.push({type:"text", text:text.slice(cursor, start)});
    tokens.push(token);
    cursor = end;
  }
  if (cursor < text.length) tokens.push({type:"text", text:text.slice(cursor)});
  return tokens;
}
