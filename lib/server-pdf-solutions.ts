import { env } from "cloudflare:workers";
import { database, digest, HttpError, teacherOnly, validateStudent, type Profile } from "./server-auth";
import { get, recordStatement, required, trackChange, type RecordData } from "./server-data";
import { worksheetKeyForFile } from "./pdf-solutions";
import { detectUploadType, MAX_UPLOAD_BYTES } from "./upload-format";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ORIGINAL = "json_extract(data,'$.type')='application/pdf' AND COALESCE(json_extract(data,'$.purpose'),'') NOT IN ('avatar','solution')";
const SOLUTION = "json_extract(data,'$.purpose')='solution' AND json_extract(data,'$._solutionWorksheetKey')=?";

/** Structured file URLs only; free teaching text is never inspected or changed. */
export function fileIdFromUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value) return;
  try {
    const match = new URL(value, "https://academy.invalid").pathname.match(/^\/api\/files\/([^/]+)\/?$/);
    if (match) return decodeURIComponent(match[1]);
  } catch {}
}
export async function assertNoSolutionReferences(item: RecordData) {
  const check = async (record: RecordData) => {
    const ids = [...(record.fileId ? [record.fileId] : []), ...(Array.isArray(record.fileIds) ? record.fileIds : []), fileIdFromUrl(record.url)].filter((id): id is string => typeof id === "string" && Boolean(id));
    for (const id of new Set(ids)) if ((await get("files", id))?.purpose === "solution") throw new HttpError(400, "Las soluciones privadas no se pueden compartir como material de las alumnas.");
  };
  await check(item);
  if (typeof item.resourceId === "string") { const resource = await get("resources", item.resourceId); if (resource) await check(resource); }
  for (const key of ["activityId", "alternativeActivityId"]) if (typeof item[key] === "string") {
    const activity = await get("activities", item[key]);
    if (activity) { await check(activity); if (typeof activity.resourceId === "string") { const resource = await get("resources", activity.resourceId); if (resource) await check(resource); } }
  }
}

export async function solutionWorksheet(resourceId: unknown) {
  const resource = await required("resources", resourceId);
  const original = resource.fileId ? await required("files", resource.fileId) : null;
  if (!original || original.type !== "application/pdf" || ["avatar", "solution"].includes(original.purpose)) throw new HttpError(400, "Elige una ficha PDF original para vincular su solución privada.");
  const studentId = validateStudent(original.studentId), worksheetKey = worksheetKeyForFile(original);
  if (!worksheetKey || resource.studentId && resource.studentId !== studentId) throw new HttpError(400, "La ficha y su archivo no corresponden a la misma alumna.");
  return {resource, original, studentId, worksheetKey};
}
function originalsWhere(worksheetKey: string) {
  return worksheetKey.startsWith("sha256:") ? {sql: `${ORIGINAL} AND lower(json_extract(data,'$.contentHash'))=?`, bindings: [worksheetKey.slice(7)]} : {sql: `${ORIGINAL} AND id=?`, bindings: [worksheetKey.slice(5)]};
}
/** Patch only owned fields so simultaneous visibility/archive updates survive. */
export function patchFilesStatement(values: Array<[string, unknown]>, where: string, bindings: unknown[]) {
  const now = new Date().toISOString(), stamp = "CASE WHEN updated_at>=? THEN strftime('%Y-%m-%dT%H:%M:%fZ',updated_at,'+0.001 seconds') ELSE ? END";
  return database().prepare(`UPDATE files SET data=json_set(data,${values.map(() => "?,json(?)").join(",")},'$.updatedAt',${stamp}),updated_at=${stamp} WHERE ${where}`)
    .bind(...values.flatMap(([path, value]) => [path, JSON.stringify(value)]), now, now, now, now, ...bindings);
}
async function trackGroup(worksheetKey: string) {
  const originals = originalsWhere(worksheetKey);
  const rows = await database().prepare(`SELECT id FROM files WHERE (${originals.sql}) OR (${SOLUTION})`).bind(...originals.bindings, worksheetKey).all<{id:string}>();
  for (const row of rows.results) trackChange("files", row.id);
}
function insertionGuard(id: string, nonce: string) {
  return {sql: "EXISTS (SELECT 1 FROM files WHERE id=? AND json_extract(data,'$._solutionUploadNonce')=?)", bindings: [id, nonce]};
}

export async function uploadPdfSolution(profile: Profile, form: FormData): Promise<{file: RecordData; alreadyUploaded: boolean}> {
  teacherOnly(profile);
  const {studentId, worksheetKey} = await solutionWorksheet(form.get("resourceId"));
  const uploadId = form.get("uploadId");
  if (typeof uploadId !== "string" || !UUID.test(uploadId)) throw new HttpError(400, "El identificador de carga de la solución no es válido.");
  const file = form.get("file");
  if (!file || typeof file === "string" || !("arrayBuffer" in file)) throw new HttpError(400, "Selecciona el PDF de la solución.");
  if (!file.size || file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, "La solución debe ocupar entre 1 byte y 8 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer()), type = detectUploadType(bytes, file.name, file.type);
  if (type !== "application/pdf") throw new HttpError(400, "La solución debe ser un PDF válido.");
  const bucket = env.BUCKET;
  if (!bucket) throw new HttpError(503, "El almacenamiento de archivos no está disponible.");
  const contentHash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map(value => value.toString(16).padStart(2, "0")).join("");
  const id = await digest(`solution:${worksheetKey}:${uploadId.toLowerCase()}`), nonce = crypto.randomUUID(), now = new Date().toISOString();
  const key = `solutions/${await digest(worksheetKey)}/${id}/${nonce}`;
  const check = (saved: RecordData) => {
    if (saved.purpose !== "solution" || saved._solutionWorksheetKey !== worksheetKey || saved.contentHash !== contentHash || saved.type !== type || saved.size !== file.size) throw new HttpError(409, "Este intento de carga corresponde a otra solución. Selecciona un archivo nuevo para continuar.");
  };
  const old = await get("files", id);
  if (old) { check(old); return {file: old, alreadyUploaded: true}; }
  const item: RecordData = {id, studentId, purpose: "solution", key, name: file.name.replace(/[\r\n"\\/\x00-\x1f\x7f]/g, "_").slice(0, 150).trim() || "solución.pdf", type, size: file.size, contentHash, shared: false, url: `/api/files/${id}`, createdAt: now, _solutionWorksheetKey: worksheetKey, _solutionStatus: "current", _solutionUpdatedAt: now, _solutionUploadNonce: nonce};
  await bucket.put(key, bytes, {httpMetadata: {contentType: type}});
  try {
    const guard = insertionGuard(id, nonce), originals = originalsWhere(worksheetKey);
    await database().batch([
      recordStatement("files", item, true),
      patchFilesStatement([["$._solutionStatus", "previous"], ["$._solutionUpdatedAt", now]], `${SOLUTION} AND json_extract(data,'$._solutionStatus')='current' AND id!=? AND ${guard.sql}`, [worksheetKey, id, ...guard.bindings]),
      patchFilesStatement([["$._solutionsArchived", false]], `${originals.sql} AND ${guard.sql}`, [...originals.bindings, ...guard.bindings]),
    ]);
    const saved = await required("files", id);
    if (saved.key !== key) await bucket.delete(key);
    check(saved); await trackGroup(worksheetKey);
    return {file: saved, alreadyUploaded: saved.key !== key};
  } catch (error) {
    try { const saved = await get("files", id); if (!saved || saved.key !== key) await bucket.delete(key); } catch {}
    throw error;
  }
}

export async function setPdfSolutionsArchived(profile: Profile, resourceId: unknown, archived: unknown) {
  teacherOnly(profile);
  if (typeof archived !== "boolean") throw new HttpError(400, "Indica si quieres archivar o restaurar las soluciones.");
  const {worksheetKey, resource} = await solutionWorksheet(resourceId), originals = originalsWhere(worksheetKey);
  await patchFilesStatement([["$._solutionsArchived", archived]], originals.sql, originals.bindings).run();
  await trackGroup(worksheetKey);
  return {id: resource.id, archived};
}

export async function restorePdfSolution(profile: Profile, resourceId: unknown, fileId: unknown, operationId: unknown) {
  teacherOnly(profile);
  if (typeof operationId !== "string" || !UUID.test(operationId)) throw new HttpError(400, "El identificador de restauración no es válido.");
  const {worksheetKey} = await solutionWorksheet(resourceId), target = await required("files", fileId);
  if (target.purpose !== "solution" || target.type !== "application/pdf" || target._solutionWorksheetKey !== worksheetKey) throw new HttpError(400, "Esta solución no corresponde a la ficha seleccionada.");
  const operation = operationId.toLowerCase(), path = `$._solutionRestoreOperations."${operation}"`;
  const previous = await database().prepare(`SELECT id FROM files WHERE ${SOLUTION} AND json_type(data,?) IS NOT NULL`).bind(worksheetKey, path).first<{id:string}>();
  if (previous) { if (previous.id !== target.id) throw new HttpError(409, "Esta restauración ya se utilizó con otra versión."); await trackGroup(worksheetKey); return {id: target.id, alreadyRestored: true}; }
  const nonce = crypto.randomUUID(), now = new Date().toISOString(), originals = originalsWhere(worksheetKey);
  const guard = {sql: "EXISTS (SELECT 1 FROM files WHERE id=? AND json_extract(data,?)=?)", bindings: [target.id, path, nonce]};
  const results = await database().batch([
    patchFilesStatement([[path, nonce], ["$._solutionStatus", "current"], ["$._solutionUpdatedAt", now]], `${SOLUTION} AND id=? AND NOT EXISTS (SELECT 1 FROM files WHERE ${SOLUTION} AND json_type(data,?) IS NOT NULL)`, [worksheetKey, target.id, worksheetKey, path]),
    patchFilesStatement([["$._solutionStatus", "previous"], ["$._solutionUpdatedAt", now]], `${SOLUTION} AND json_extract(data,'$._solutionStatus')='current' AND id!=? AND ${guard.sql}`, [worksheetKey, target.id, ...guard.bindings]),
    patchFilesStatement([["$._solutionsArchived", false]], `${originals.sql} AND ${guard.sql}`, [...originals.bindings, ...guard.bindings]),
  ]);
  await trackGroup(worksheetKey);
  if (!results[0].meta.changes) {
    const winner = await database().prepare(`SELECT id FROM files WHERE ${SOLUTION} AND json_type(data,?) IS NOT NULL`).bind(worksheetKey, path).first<{id:string}>();
    if (winner?.id !== target.id) throw new HttpError(409, "Esta restauración ya se utilizó con otra versión.");
    return {id: target.id, alreadyRestored: true};
  }
  return {id: target.id};
}
