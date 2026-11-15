export type StudentNotificationKind =
  | "response.submitted" | "resource.used"
  | "exam.created" | "exam.updated" | "exam.deleted"
  | "doubt.created" | "word.created" | "word.updated" | "word.deleted"
  | "preferences.updated" | "draft.saved" | "draft.deleted"
  | "file.uploaded" | "profile.photo.updated";

type Row = Record<string, unknown>;
export type StudentNotificationEvent = {
  id: string;
  studentId: "rocio" | "alejandra";
  studentName: string;
  kind: StudentNotificationKind;
  title: string;
  summary: string;
  details: Array<{label: string; value: string}>;
  occurredAt: string;
  entityType: "response" | "exam" | "doubt" | "word" | "preferences" | "draft" | "file";
  entityId: string;
  groupKey?: string;
};

export type StudentNotificationInput = {
  /** Authenticated server role, never a role supplied in an action payload. */
  profile: string;
  action: string;
  data?: Row;
  result?: Row;
  before?: Row | null;
  after?: Row | null;
  related?: {activity?: Row; resource?: Row; assignment?: Row};
  /** Server clock for the operation, used for display and hourly aggregation. */
  occurredAt: string;
};

const NAMES = {rocio: "Rocío", alejandra: "Alejandra"} as const;
const PROCEDURE_KEYS = ["data", "question", "calculation", "unitsAnswer"] as const;
const EXAM_FIELDS = {title: "Título", date: "Fecha", subject: "Asignatura", topics: "Temas"};
const WORD_FIELDS = {original: "Palabra original", corrected: "Corrección", reason: "Explicación", sentence: "Frase", reviewDate: "Próximo repaso"};
const DRAFT_FIELDS = {answer: "Respuesta", comment: "Comentario", procedure: "Procedimiento", hintsUsed: "Pistas", fileIds: "Archivos", selfAssessment: "Autoevaluación"};

function line(value: unknown, max = 240): string {
  return typeof value === "string"
    ? value.normalize("NFC").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/gu, " ").trim().slice(0, max)
    : "";
}
function timestamp(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : undefined;
}
function date(value: unknown): string {
  const input = line(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return "";
  const parsed = new Date(`${input}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === input ? input.split("-").reverse().join("/") : "";
}
function ids(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((v): v is string => typeof v === "string" && Boolean(v.trim())))].sort() : [];
}
function hints(value: unknown): number[] {
  return Array.isArray(value) ? [...new Set(value.filter((v): v is number => Number.isInteger(v) && Number(v) >= 0))].sort((a,b) => a-b) : [];
}
function assessment(value: unknown): string {
  return ({easy: "Fácil", some_doubt: "Con alguna duda", need_help: "Necesito ayuda", "Fácil": "Fácil", "Con alguna duda": "Con alguna duda", "Necesito ayuda": "Necesito ayuda"} as Record<string,string>)[String(value)] || "";
}
function procedure(value: unknown): string[] {
  const record = value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
  return PROCEDURE_KEYS.map(key => typeof record[key] === "string" ? record[key] as string : "");
}
function semantic(row: Row | null | undefined, key: string): unknown {
  const value = row?.[key];
  if (key === "fileIds" || key === "favoriteResourceIds") return ids(value);
  if (key === "hintsUsed") return hints(value);
  if (key === "procedure") return procedure(value);
  if (key === "selfAssessment") return assessment(value);
  return value == null ? "" : value;
}
function changed(before: Row | null | undefined, after: Row, fields: Record<string,string>): string[] {
  return Object.keys(fields).filter(key => JSON.stringify(semantic(before, key)) !== JSON.stringify(semantic(after, key)));
}
/** Compact identity discriminator only; the outbox applies its own SHA-256. */
function changeIdentity(before: Row, after: Row, fields: Record<string,string>): string {
  const content = JSON.stringify(Object.keys(fields).map(key => [key, semantic(before, key), semantic(after, key)]));
  let first = 0x811c9dc5, second = 0x9e3779b9;
  for (let index = 0; index < content.length; index++) {
    const unit = content.charCodeAt(index);
    first = Math.imul(first ^ unit, 0x01000193);
    second = Math.imul(second ^ unit, 0x85ebca6b);
  }
  return `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`;
}
function meaningfulDraft(row: Row): boolean {
  return Boolean(line(row.answer) || line(row.comment) || procedure(row.procedure).some(value => line(value)) || ids(row.fileIds).length || hints(row.hintsUsed).length || assessment(row.selfAssessment));
}
function allowedRelated(row: Row | undefined, studentId: string): row is Row {
  if (!row || (row.studentId !== undefined && row.studentId !== null && row.studentId !== studentId)) return false;
  return !Array.isArray(row.suggestedStudentIds) || !row.suggestedStudentIds.length || row.suggestedStudentIds.includes(studentId);
}
function context(row: Row, input: StudentNotificationInput, studentId: string): Array<{label:string;value:string}> {
  const details: Array<{label:string;value:string}> = [];
  const related = input.related;
  const activity = allowedRelated(related?.activity, studentId) && related.activity.id === row.activityId ? related.activity : undefined;
  const resource = allowedRelated(related?.resource, studentId) && related.resource.id === row.resourceId ? related.resource : undefined;
  if (activity) details.push({label: "Actividad", value: line(activity.title)});
  else if (resource) details.push({label: "Recurso", value: line(resource.title)});
  const subject = line(activity?.subject || resource?.subject, 150);
  if (subject) details.push({label: "Asignatura", value: subject});
  const assignment = related?.assignment;
  if (assignment && assignment.id === row.assignmentId && assignment.studentId === studentId && assignment.activityId === row.activityId && ["Para hacer en clase", "Para casa", "Opcionales"].includes(String(assignment.category))) details.push({label: "Destino", value: String(assignment.category)});
  return details.filter(detail => detail.value);
}
function workDetails(row: Row): Array<{label:string;value:string}> {
  const details: Array<{label:string;value:string}> = [];
  const feeling = assessment(row.selfAssessment);
  if (feeling) details.push({label: "Autoevaluación", value: feeling});
  if (hints(row.hintsUsed).length) details.push({label: "Pistas utilizadas", value: String(hints(row.hintsUsed).length)});
  if (ids(row.fileIds).length) details.push({label: "Archivos adjuntos", value: String(ids(row.fileIds).length)});
  if (procedure(row.procedure).some(value => line(value))) details.push({label: "Procedimiento", value: "Incluido"});
  if (line(row.comment)) details.push({label: "Comentario o duda", value: "Incluido"});
  return details;
}

/**
 * Builds a bounded, allowlisted description without reading client `data`.
 * `before` is the stored row; `after` must be the server-validated row, with the
 * version generated by the server for the write. It may be prospective only when the
 * caller inserts the event and write in the SAME atomic batch, guarded by that
 * write's success/nonce. This pure function cannot establish a DB commit.
 * Provider delivery, recipient configuration and aggregation belong elsewhere.
 */
export function describeStudentNotification(input: StudentNotificationInput): StudentNotificationEvent | null {
  if (input.profile !== "rocio" && input.profile !== "alejandra") return null;
  const studentId = input.profile;
  const studentName = NAMES[studentId];
  const occurredAt = timestamp(input.occurredAt);
  if (!occurredAt || input.result?.ok === false || ["alreadySubmitted", "alreadySaved", "alreadyUploaded", "conflict", "alreadyClosed"].some(key => input.result?.[key] === true)) return null;
  const before = input.before, after = input.after;
  const deleting = ["deleteExam", "deleteWord", "deleteDraft"].includes(input.action);
  const row = deleting ? before : after;
  if (!row || typeof row.id !== "string" || !row.id || row.id.length > 400 || (deleting && after)) return null;
  const preferences = input.action === "updatePreferences";
  const own = (candidate: Row) => preferences ? candidate.id === studentId && (candidate.studentId == null || candidate.studentId === studentId) : candidate.studentId === studentId;
  if (!own(row) || (before && (!own(before) || before.id !== row.id)) || (after && (!own(after) || after.id !== row.id))) return null;
  if (typeof input.result?.id === "string" && input.result.id !== row.id) return null;
  let version = timestamp(row.updatedAt) || timestamp(row.createdAt);
  if (!version) return null;
  let kind: StudentNotificationKind, entityType: StudentNotificationEvent["entityType"], title: string, summary: string;
  let details: StudentNotificationEvent["details"] = [];
  let groupKey: string | undefined;

  if (input.action === "submitResponse" || input.action === "useResource") {
    if (before || !after || (input.action === "submitResponse" ? !line(row.activityId, 400) : !line(row.resourceId, 400))) return null;
    kind = input.action === "submitResponse" ? "response.submitted" : "resource.used";
    entityType = "response";
    title = input.action === "submitResponse" ? "Actividad entregada" : "Uso de recurso registrado";
    summary = `${studentName} ${input.action === "submitResponse" ? "entregó una respuesta. Está disponible para revisar" : "registró su trabajo con un recurso. Los resultados de webs externas requieren revisión"}.`;
    details = [...context(row, input, studentId), ...workDetails(row)];
    if (input.action === "submitResponse" && ["correct", "incorrect"].includes(String(row.autoResult))) details.push({label: "Comprobación automática", value: row.autoResult === "correct" ? "Respuesta correcta" : "Respuesta para revisar"});
  } else if (input.action === "upsertExam" || input.action === "deleteExam") {
    const fields = after ? changed(before, after, EXAM_FIELDS) : [];
    if (!deleting && (!line(row.title) || !date(row.date) || (before && !fields.length))) return null;
    if (before && after && !deleting) version += `:${changeIdentity(before, after, EXAM_FIELDS)}`;
    kind = deleting ? "exam.deleted" : before ? "exam.updated" : "exam.created";
    entityType = "exam";
    title = deleting ? "Examen eliminado" : before ? "Examen actualizado" : "Examen anotado";
    summary = `${studentName} ${deleting ? "eliminó un examen del calendario" : before ? "actualizó un examen de su calendario" : "anotó un examen en el calendario"}.`;
    details = [{label: "Examen", value: line(row.title)}, {label: "Fecha", value: date(row.date)}, {label: "Asignatura", value: line(row.subject, 150)}, {label: "Temas", value: line(row.topics)}];
    if (before && !deleting) details.push({label: "Cambios", value: fields.map(key => EXAM_FIELDS[key as keyof typeof EXAM_FIELDS]).join(", ")});
  } else if (input.action === "saveDoubt") {
    if (before || !line(row.question)) return null;
    kind = "doubt.created"; entityType = "doubt"; title = "Nueva duda";
    summary = `${studentName} guardó una duda para retomarla en clase.`;
    details = [{label: "Duda", value: line(row.question)}];
  } else if (input.action === "upsertWord" || input.action === "deleteWord") {
    const fields = after ? changed(before, after, WORD_FIELDS) : [];
    if (!deleting && (!line(row.original) || !line(row.corrected) || (before && !fields.length))) return null;
    if (before && after && !deleting) version += `:${changeIdentity(before, after, WORD_FIELDS)}`;
    kind = deleting ? "word.deleted" : before ? "word.updated" : "word.created";
    entityType = "word"; title = deleting ? "Palabra retirada" : before ? "Palabra actualizada" : "Palabra para practicar";
    summary = `${studentName} ${deleting ? "retiró una palabra de su colección" : before ? "revisó una palabra de su colección" : "añadió una palabra a su colección de práctica"}.`;
    details = [{label: "Original", value: line(row.original, 150)}, {label: "Corrección", value: line(row.corrected, 150)}, {label: "Próximo repaso", value: date(row.reviewDate)}];
    if (before && !deleting) details.push({label: "Cambios", value: fields.map(key => WORD_FIELDS[key as keyof typeof WORD_FIELDS]).join(", ")});
  } else if (preferences) {
    if (!before || !after) return null;
    const fields = changed(before, after, {color: "Color", avatar: "Avatar", avatarFileId: "Foto guardada", favoriteResourceIds: "Recursos favoritos"});
    if (!fields.length) return null;
    const baseVersion = timestamp(before.updatedAt) || timestamp(before.createdAt);
    if (!baseVersion) return null;
    // Field patches preserve concurrent unrelated profile edits. Two requests
    // based on the same version and desired preferences describe the same event.
    version = `${baseVersion}:${JSON.stringify(fields.map(key => [key, semantic(after, key)]))}`;
    kind = "preferences.updated"; entityType = "preferences"; title = "Preferencias actualizadas";
    summary = `${studentName} personalizó su perfil.`;
    const labels: Record<string,string> = {color: "Color", avatar: "Avatar", avatarFileId: "Foto guardada", favoriteResourceIds: "Recursos favoritos"};
    details = [{label: "Cambios", value: fields.map(key => labels[key]).join(", ")}];
    if (fields.includes("favoriteResourceIds")) details.push({label: "Recursos favoritos", value: String(ids(after.favoriteResourceIds).length)});
  } else if (input.action === "saveDraft" || input.action === "deleteDraft") {
    if (!meaningfulDraft(row) || Boolean(row.activityId) === Boolean(row.resourceId)) return null;
    if (!deleting && (!after || (before && !changed(before, after, DRAFT_FIELDS).length))) return null;
    kind = deleting ? "draft.deleted" : "draft.saved"; entityType = "draft";
    title = deleting ? "Borrador descartado" : "Trabajo guardado como borrador";
    summary = `${studentName} ${deleting ? "descartó un borrador guardado" : "guardó su trabajo para continuarlo después. Todavía no lo ha entregado"}.`;
    details = [...context(row, input, studentId), ...workDetails(row)];
    if (!deleting) groupKey = `${studentId}:draft:${String(row.activityId || row.resourceId)}:${occurredAt.slice(0, 13)}`;
  } else if (input.action === "uploadFile" || input.action === "uploadProfilePhoto") {
    if (before || !after) return null;
    const avatar = input.action === "uploadProfilePhoto";
    if (avatar ? row.purpose !== "avatar" : row.purpose === "avatar") return null;
    if (typeof row.size !== "number" || !Number.isInteger(row.size) || row.size <= 0 || !line(row.type, 100)) return null;
    kind = avatar ? "profile.photo.updated" : "file.uploaded"; entityType = "file";
    title = avatar ? "Foto de perfil actualizada" : "Archivo adjuntado";
    summary = `${studentName} ${avatar ? "actualizó su foto de perfil" : "adjuntó un archivo a su trabajo"}.`;
    if (!avatar) details = [{label: "Archivo", value: line(row.name, 150)}];
  } else return null;

  return {
    id: `student-event:v1:${studentId}:${kind}:${encodeURIComponent(row.id)}:${encodeURIComponent(version)}`,
    studentId, studentName, kind, title: line(title, 140), summary: line(summary, 300),
    details: details.filter(detail => detail.value).map(detail => ({label: line(detail.label, 80), value: line(detail.value)})),
    occurredAt, entityType, entityId: row.id, ...(groupKey ? {groupKey} : {}),
  };
}
