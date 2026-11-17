import { HttpError, teacherOnly, validateStudent, type Profile } from "./server-auth";
import { allowedContent, required, trackChange } from "./server-data";
import { patchFilesStatement } from "./server-pdf-solutions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const conflict = () => new HttpError(409, "Esta ficha ha cambiado en otra pestaña. Actualiza la lista y vuelve a intentarlo.");
const isWorked = (file: Record<string, any>) => typeof file._pdfWorkedAt === "string" && Boolean(file._pdfWorkedAt);

/** A private teacher log of using an original PDF, independent of learning or submissions. */
export async function setPdfWorked(profile: Profile, resourceId: unknown, fileId: unknown, worked: unknown, expectedRevision: unknown) {
  teacherOnly(profile);
  if (typeof worked !== "boolean") throw new HttpError(400, "Indica si la ficha está hecha o pendiente.");
  if (expectedRevision !== null && (typeof expectedRevision !== "string" || !UUID.test(expectedRevision))) throw new HttpError(400, "La versión del registro no es válida. Actualiza la lista.");
  if (typeof fileId !== "string" || !fileId) throw new HttpError(400, "Selecciona el PDF de la ficha.");
  const resource = await required("resources", resourceId);
  if (resource.fileId !== fileId) throw conflict();
  const original = await required("files", fileId);
  if (original.type !== "application/pdf" || ["avatar", "solution"].includes(original.purpose)) throw new HttpError(400, "Solo puedes marcar fichas y exámenes PDF originales.");
  const studentId = validateStudent(original.studentId);
  if (!allowedContent(resource, studentId)) throw new HttpError(400, "La ficha y su PDF no corresponden a la misma alumna.");
  trackChange("files", original.id);
  const result = (file: Record<string, any>, alreadySaved = false) => ({ id: file.id, resourceId: resource.id, studentId, worked: isWorked(file), workedAt: file._pdfWorkedAt || null, revision: file._pdfWorkRevision || null, ...(alreadySaved ? { alreadySaved: true } : {}) });
  // A lost acknowledgement must not change the original work date or revision.
  if (isWorked(original) === worked) return result(original, true);
  if ((original._pdfWorkRevision || null) !== expectedRevision) throw conflict();
  const now = new Date().toISOString(), revision = crypto.randomUUID();
  const saved = await patchFilesStatement([["$._pdfWorkedAt", worked ? now : null], ["$._pdfWorkRevision", revision]],
    "id=? AND student_id=? AND json_extract(data,'$.type')='application/pdf' AND COALESCE(json_extract(data,'$.purpose'),'') NOT IN ('avatar','solution') AND json_extract(data,'$._pdfWorkRevision') IS ? AND EXISTS (SELECT 1 FROM resources WHERE id=? AND json_extract(data,'$.fileId')=?)",
    [original.id, studentId, expectedRevision, resource.id, original.id]).run();
  if (!saved.meta.changes) {
    const currentResource = await required("resources", resource.id), current = await required("files", original.id);
    if (currentResource.fileId === original.id && current.studentId === studentId && isWorked(current) === worked) return result(current, true);
    throw conflict();
  }
  return { id: original.id, resourceId: resource.id, studentId, worked, workedAt: worked ? now : null, revision };
}
