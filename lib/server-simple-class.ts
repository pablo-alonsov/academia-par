import { cleanString, database, HttpError, teacherOnly, validateStudent, type Profile } from "./server-auth";
import { get, list, required, trackChange, type RecordData } from "./server-data";
import { ACADEMY_START_DATE, isTrackingDate } from "./academy-config";
import { fileIdFromUrl } from "./server-pdf-solutions";
import { learningContentAllowed, learningFileAllowed } from "./learning-content";

function recordDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(new Date(value).getTime()) || new Date(value).toISOString().slice(0, 10) !== value) throw new HttpError(400, "Indica una fecha válida para la clase.");
  return value;
}
function selectedIds(value: unknown) {
  if (!Array.isArray(value) || value.length > 30 || value.some(id => typeof id !== "string" || !id || id.length > 400)) throw new HttpError(400, "La selección de materiales o actividades no es válida.");
  return [...new Set(value)] as string[];
}
function linkedFileIds(item: RecordData) {
  return [...(item.fileId ? [item.fileId] : []), ...(Array.isArray(item.fileIds) ? item.fileIds : []), fileIdFromUrl(item.url)].filter((id): id is string => typeof id === "string" && Boolean(id));
}

/** The only editable class fields. Older notes remain intact and privately recoverable. */
export async function saveClassRecord(profile: Profile, data: RecordData) {
  teacherOnly(profile);
  const id = cleanString(data.id, 400);
  if (!id) throw new HttpError(400, "No se ha identificado la clase. Vuelve a abrirla.");
  const studentId = validateStudent(data.studentId), old = await get("sessions", id);
  if (old && old.studentId !== studentId) throw new HttpError(400, "Esta clase pertenece a otra alumna.");
  const day = recordDate(data.date);
  if (!old && !isTrackingDate(day)) throw new HttpError(400, `Las nuevas clases deben tener fecha del ${ACADEMY_START_DATE.split("-").reverse().join("/")} o posterior.`);
  if (typeof data.publish !== "boolean") throw new HttpError(400, "Indica si quieres guardar o compartir la clase.");
  if (data.baseUpdatedAt !== null && (typeof data.baseUpdatedAt !== "string" || !data.baseUpdatedAt || data.baseUpdatedAt.length > 100)) throw new HttpError(400, "Actualiza la clase antes de guardar sus cambios.");
  const schoolwork = cleanString(data.schoolwork, 20000), content = cleanString(data.content, 20000);
  if (data.publish && !content.trim()) throw new HttpError(400, "Resume brevemente lo que habéis hecho en la sesión.");
  const resourceIds = selectedIds(data.resourceIds), activityIds = selectedIds(data.activityIds), fileIds = selectedIds(data.fileIds);
  const files = new Map<string, RecordData>(), resources = new Map<string, RecordData>();
  let learningRecords: RecordData[] | undefined;
  const checkFile = async (fileId: string) => {
    const file = files.get(fileId) || await required("files", fileId); files.set(fileId, file);
    if (file.studentId !== studentId || file.shared !== true || file.detached === true || ["avatar", "solution"].includes(file.purpose)) throw new HttpError(400, "Elige un archivo compartido con esta alumna.");
    if (studentId === "alejandra") { learningRecords ||= [...await list("resources"), ...await list("activities")]; if (!learningFileAllowed(fileId, studentId, learningRecords)) throw new HttpError(400, "Este archivo no está en el plan de trabajo de la alumna."); }
  };
  const checkResource = async (resourceId: string) => {
    const resource = resources.get(resourceId) || await required("resources", resourceId); resources.set(resourceId, resource);
    if (!learningContentAllowed(resource, studentId) || resource.shared === false || resource.detached === true) throw new HttpError(400, "Este material no está disponible para la alumna.");
    for (const fileId of linkedFileIds(resource)) await checkFile(fileId);
  };
  for (const fileId of fileIds) await checkFile(fileId);
  for (const resourceId of resourceIds) await checkResource(resourceId);
  for (const activityId of activityIds) {
    const activity = await required("activities", activityId);
    if (!learningContentAllowed(activity, studentId) || activity.shared === false || activity.detached === true) throw new HttpError(400, "Esta actividad no está disponible para la alumna.");
    for (const fileId of linkedFileIds(activity)) await checkFile(fileId);
    if (activity.resourceId) await checkResource(activity.resourceId);
  }
  trackChange("sessions", id);
  const status = data.publish || old?.status === "realizada" ? "realizada" : "por preparar";
  const changed = { date: day, schoolwork, content, resourceIds, activityIds, fileIds, duration: 60, status };
  const identical = (item: RecordData | null) => Boolean(item && item.studentId === studentId && Object.entries(changed).every(([key, value]) => JSON.stringify(item[key]) === JSON.stringify(value)));
  // Repeating a successful write cannot move its date, publish twice or add records.
  if (identical(old)) return { id, alreadySaved: true };
  if ((old?.updatedAt || null) !== data.baseUpdatedAt) return { id, conflict: true };
  const now = new Date(Math.max(Date.now(), (Date.parse(old?.updatedAt || "") || 0) + 1)).toISOString();
  const item: RecordData = { ...old, ...changed, id, studentId, _simpleClassRecord: true, updatedAt: now };
  if (old && !old._simpleClassRecord && !old._legacyClassRecord) item._legacyClassRecord = { ...old };
  item.sharedSummary = old && old.content === content ? old.sharedSummary || content : content;
  if (status === "realizada" && !old?.closedAt) item.closedAt = now;
  const result = await database().prepare("INSERT INTO sessions (id,student_id,data,updated_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET student_id=excluded.student_id,data=excluded.data,updated_at=excluded.updated_at WHERE sessions.student_id=excluded.student_id AND sessions.updated_at IS ?")
    .bind(id, studentId, JSON.stringify(item), now, data.baseUpdatedAt).run();
  if (!result.meta.changes) return identical(await get("sessions", id)) ? { id, alreadySaved: true } : { id, conflict: true };
  return { id };
}
