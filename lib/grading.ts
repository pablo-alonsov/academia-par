export type GradeResult = "correct" | "incorrect" | null;

// Exact rational parsing avoids floating-point equality and never executes expressions.
export function rational(value: unknown): [bigint, bigint] | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const input = String(value).trim().replace(/−/g, "-").replace(/,/g, ".");
  if (!/^[+-]?\d+(?:\.\d{1,8})?(?:\s*\/\s*[+-]?\d+(?:\.\d{1,8})?)?$/.test(input) || input.length > 100) return null;
  function decimal(part: string): [bigint, bigint] {
    const clean = part.trim();
    const decimals = clean.includes(".") ? clean.split(".")[1].length : 0;
    return [BigInt(clean.replace(".", "")), 10n ** BigInt(decimals)];
  }
  try {
    const [first, second] = input.split("/");
    const a = decimal(first);
    if (!second) return a;
    const b = decimal(second);
    if (b[0] === 0n) return null;
    return [a[0] * b[1], a[1] * b[0]];
  } catch { return null; }
}

export function grade(activity: Record<string, unknown>, answer: unknown): GradeResult {
  const expected = activity.answer ?? activity.expectedAnswer;
  if (expected === undefined || expected === null || answer === undefined) return null;
  if (["fraction", "numeric"].includes(String(activity.type))) {
    const actual = rational(answer), target = rational(expected);
    return actual && target && actual[0] * target[1] === target[0] * actual[1] ? "correct" : "incorrect";
  }
  if (activity.type === "choice" || (activity.type === "text" && activity.autoCheck === true)) {
    const normalize = (v: unknown) => String(v).normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
    // Accent marks are intentionally preserved, including when spelling is assessed.
    return normalize(answer) === normalize(expected) ? "correct" : "incorrect";
  }
  return null;
}
