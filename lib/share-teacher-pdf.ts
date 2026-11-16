import { detectUploadType, MAX_UPLOAD_BYTES } from "./upload-format";

export type PdfShareStudentId = "rocio" | "alejandra";
export type PdfShareFileMetadata = {id: string; type: string; name?: string; size?: number; shared?: boolean};
export type PdfShareTarget = {
  readonly studentId: PdfShareStudentId;
  readonly uploadId: string;
  readonly resourceId: string;
  file?: PdfShareFileMetadata;
  /** True only after the resource has been confirmed, not merely uploaded. */
  shared: boolean;
};
export type PdfSharePlan = {
  readonly file: File;
  readonly title: string;
  readonly subject: string;
  readonly targets: PdfShareTarget[];
};
export type PdfShareResource = {
  id: string; studentId: PdfShareStudentId; suggestedStudentIds: PdfShareStudentId[];
  fileId: string; type: "PDF"; title: string; subject: string; instructions: "Consulta el PDF.";
};
export type PdfShareDependencies = {
  uploadFile: (target: PdfShareTarget, file: File) => Promise<PdfShareFileMetadata>;
  /** Reject on failure; resolving confirms that this resource was saved. */
  saveResource: (payload: PdfShareResource) => Promise<unknown>;
};

/** Allocate IDs once, before any network call. Keep this same plan for retries. */
export async function createPdfSharePlan({file, title, subject, studentIds}: {
  file: File; title: string; subject: string; studentIds: PdfShareStudentId[];
}): Promise<PdfSharePlan> {
  if (!Array.isArray(studentIds) || !studentIds.length || studentIds.some(id => id !== "rocio" && id !== "alejandra")) throw Error("Elige Rocío, Alejandra o ambas alumnas.");
  if (typeof title !== "string" || !title.trim() || title.trim().length > 250) throw Error("Escribe un título de hasta 250 caracteres.");
  if (typeof subject !== "string" || subject.trim().length > 150) throw Error("La asignatura debe tener hasta 150 caracteres.");
  if (!file || typeof file.arrayBuffer !== "function" || typeof file.name !== "string" || !Number.isInteger(file.size) || file.size <= 0 || file.size > MAX_UPLOAD_BYTES) throw Error("El PDF debe ocupar entre 1 byte y 8 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length !== file.size || detectUploadType(bytes, file.name, file.type) !== "application/pdf") throw Error("Selecciona un PDF válido. Cambiar la extensión de otro archivo no lo convierte en PDF.");
  const targets = [...new Set(studentIds)].map(studentId => ({studentId, uploadId: crypto.randomUUID(), resourceId: crypto.randomUUID(), shared: false}));
  return {file, title: title.trim(), subject: subject.trim(), targets};
}

function checkedMetadata(value: PdfShareFileMetadata): PdfShareFileMetadata {
  if (!value || typeof value.id !== "string" || !value.id || value.id.length > 400 || value.id !== value.id.trim() || value.type !== "application/pdf") throw Error("La subida no ha confirmado un PDF válido. Vuelve a intentarlo.");
  return {id: value.id, type: value.type,
    ...(typeof value.name === "string" ? {name: value.name} : {}),
    ...(typeof value.size === "number" ? {size: value.size} : {}),
    ...(typeof value.shared === "boolean" ? {shared: value.shared} : {}),
  };
}

/**
 * One protected file and resource per pupil. Progress deliberately survives a
 * rejected promise: retry the SAME plan to reuse IDs and completed destinations.
 * This workflow creates no activities, assignments, sessions or learning results.
 */
export async function shareTeacherPdf(plan: PdfSharePlan, dependencies: PdfShareDependencies, onProgress?: (plan: PdfSharePlan) => void): Promise<PdfSharePlan> {
  for (const target of plan.targets) {
    if (target.shared) continue;
    if (!target.file) {
      target.file = checkedMetadata(await dependencies.uploadFile(target, plan.file));
      onProgress?.(plan);
    }
    const file = checkedMetadata(target.file);
    const saved = await dependencies.saveResource({id: target.resourceId, studentId: target.studentId,
      suggestedStudentIds: [target.studentId], fileId: file.id, type: "PDF", title: plan.title,
      subject: plan.subject, instructions: "Consulta el PDF.",
    });
    if (saved && typeof saved === "object" && ((saved as Record<string,unknown>).ok === false || (saved as Record<string,unknown>).conflict === true)) throw Error("No se ha confirmado el recurso. Vuelve a intentarlo.");
    target.shared = true;
    onProgress?.(plan);
  }
  return plan;
}
