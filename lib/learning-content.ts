/** Learning scope only. Exam calendars deliberately keep every school subject. */
export type LearningItem = Record<string, any>;
const normalized = (value: unknown) => typeof value === "string" ? value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").replace(/ł/g, "l").trim() : "";
const english = (value: unknown) => /\b(?:ingles|inglesa|english)\b/.test(normalized(value));

export function learningSubjectEnabled(studentId: string, subject: unknown): boolean {
  return studentId !== "alejandra" || !english(subject);
}

export function learningContentAllowed(item: LearningItem, studentId: string): boolean {
  const owns = item.studentId ? item.studentId === studentId : !item.suggestedStudentIds?.length || item.suggestedStudentIds.includes(studentId);
  return Boolean(owns && learningSubjectEnabled(studentId, item.subject || item.subjectId || item.skillId));
}

/** A linked English file must not reappear as an unlabelled attachment choice. */
export function learningFileAllowed(fileId: string, studentId: string, records: LearningItem[]): boolean {
  if (studentId !== "alejandra") return true;
  const linked = records.filter(item => {
    const owns = item.studentId ? item.studentId === studentId : !item.suggestedStudentIds?.length || item.suggestedStudentIds.includes(studentId);
    if (!owns) return false;
    if (item.fileId === fileId || Array.isArray(item.fileIds) && item.fileIds.includes(fileId)) return true;
    if (typeof item.url === "string") try { return new URL(item.url, "https://academy.invalid").pathname === `/api/files/${encodeURIComponent(fileId)}`; } catch {}
    return false;
  });
  return !linked.length || linked.some(item => learningSubjectEnabled(studentId, item.subject || item.subjectId || item.skillId));
}

/** Project the current study plan without mutating historical or teacher-written data. */
export function learningStudentView<T extends LearningItem>(student: T): T {
  if (student.id !== "alejandra") return student;
  const result: LearningItem = { ...student };
  for (const key of ["priorities", "curriculumFocus", "secondTermSubjects"]) if (Array.isArray(result[key])) result[key] = result[key].filter((value: unknown) => !english(value));
  if (Array.isArray(result.subjectPlan)) result.subjectPlan = result.subjectPlan.filter((plan: LearningItem) => learningSubjectEnabled(student.id, plan?.subject));
  if (english(result.nextStep)) result.nextStep = "";
  return result as T;
}
