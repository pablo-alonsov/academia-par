export type PdfCollection = "materials" | "exam-prep";
export type ExamMode = "class" | "independent" | "either";

/** Missing legacy classification remains ordinary material without a migration. */
export function isExamPreparation(resource: {collection?: unknown} | null | undefined): boolean {
  return resource?.collection === "exam-prep";
}

/** A use-context label, never a permission, assignment or learning assessment. */
export function examModeLabel(value: unknown, student = true): string {
  if (value === "class") return "En clase";
  if (value === "independent") return student ? "Por tu cuenta" : "Por su cuenta";
  return student ? "En clase o por tu cuenta" : "En clase o por su cuenta";
}
