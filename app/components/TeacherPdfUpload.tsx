"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, FileText, LoaderCircle, Upload } from "lucide-react";
import { authorizedFetch } from "@/lib/client-request";
import { createPdfSharePlan, shareTeacherPdf, type PdfSharePlan, type PdfShareTarget } from "@/lib/share-teacher-pdf";
import type { ExamMode, PdfCollection } from "@/lib/exam-materials";
import Dialog from "./Dialog";
import "./teacher-pdf-upload.css";

type StudentId = "rocio" | "alejandra";
type Props = { students: any[]; subjects: any[]; act: (action: string, data: any) => Promise<any>; notify: (message: string) => void; onClose: () => void };
const MAX_PDF_BYTES = 8 * 1024 * 1024;
const nameFor = (id: string, students: any[]) => students.find(student => student.id === id)?.name || (id === "rocio" ? "Rocío" : "Alejandra");

export default function TeacherPdfUpload({ students, subjects, act, notify, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null), [title, setTitle] = useState(""), [audience, setAudience] = useState<StudentId | "both">("rocio"), [subject, setSubject] = useState("");
  const [collection, setCollection] = useState<PdfCollection>("materials"), [examMode, setExamMode] = useState<ExamMode>("either");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [, refreshProgress] = useState(0);
  const planRef = useRef<PdfSharePlan | null>(null), busyRef = useRef(false), mounted = useRef(false);
  const formRef = useRef<HTMLFormElement>(null), fileInput = useRef<HTMLInputElement>(null), errorRef = useRef<HTMLDivElement>(null);
  const id = useId(), plan = planRef.current, locked = Boolean(plan), firstPending = plan?.targets.findIndex(target => !target.shared);
  const subjectNames = [...new Set(subjects.map(item => item.name).filter((name): name is string => typeof name === "string" && Boolean(name.trim())))];

  useEffect(() => {
    mounted.current = true;
    const beforeNavigation = (event: Event) => {
      if (!busyRef.current) return;
      const jobs = (event as CustomEvent<{ jobs?: Promise<unknown>[] }>).detail?.jobs;
      if (Array.isArray(jobs)) jobs.push(Promise.reject(new Error("Espera a que termine de compartir el PDF.")));
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!busyRef.current) return;
      event.preventDefault(); event.returnValue = "";
    };
    window.addEventListener("arp:before-navigation", beforeNavigation);
    window.addEventListener("beforeunload", beforeUnload);
    return () => { mounted.current = false; window.removeEventListener("arp:before-navigation", beforeNavigation); window.removeEventListener("beforeunload", beforeUnload); };
  }, []);

  useEffect(() => {
    const closeButton = formRef.current?.closest(".arp-dialog")?.querySelector<HTMLButtonElement>(".arp-dialog-header > button");
    if (!closeButton) return;
    closeButton.disabled = busy;
    return () => { closeButton.disabled = false; };
  }, [busy]);

  const close = () => { if (!busyRef.current) onClose(); };
  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    if (locked || busyRef.current) return;
    const selected = event.currentTarget.files?.[0];
    setError("");
    if (!selected) { setFile(null); return; }
    if (selected.type !== "application/pdf" && !/\.pdf$/i.test(selected.name)) {
      setError("Elige un archivo PDF."); setFile(null); event.currentTarget.value = ""; return;
    }
    if (!selected.size || selected.size > MAX_PDF_BYTES) {
      setError(selected.size ? "El PDF debe ocupar como máximo 8 MB." : "Este archivo está vacío. Elige otro PDF."); setFile(null); event.currentTarget.value = ""; return;
    }
    setFile(selected); setTitle(selected.name.replace(/\.pdf$/i, "").trim());
  };

  const uploadFile = async (target: PdfShareTarget, source: File) => {
    const body = new FormData();
    body.append("file", source); body.append("studentId", target.studentId); body.append("shared", "true"); body.append("uploadId", target.uploadId);
    const response = await authorizedFetch("/api/files", { method: "POST", body });
    const result: any = await response.json().catch(() => null);
    if (!response.ok) throw new Error(typeof result?.error === "string" ? result.error : "No se ha podido subir el PDF. Inténtalo de nuevo.");
    if (!result || typeof result !== "object") throw new Error("No se ha podido confirmar la subida del PDF. Inténtalo de nuevo.");
    return result;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busyRef.current) return;
    if (!file) { setError("Elige el PDF que quieres compartir."); fileInput.current?.focus(); return; }
    if (!title.trim()) { setError("Escribe un título para el PDF."); return; }
    busyRef.current = true; setBusy(true); setError("");
    try {
      if (!planRef.current) {
        const studentIds: StudentId[] = audience === "both" ? ["rocio", "alejandra"] : [audience];
        planRef.current = await createPdfSharePlan({ file, title: title.trim(), subject, studentIds, collection, examMode });
        if (mounted.current) refreshProgress(value => value + 1);
      }
      const currentPlan = planRef.current;
      await shareTeacherPdf(currentPlan, { uploadFile, saveResource: payload => act("upsertResource", payload) }, () => {
        if (mounted.current) refreshProgress(value => value + 1);
      });
      if (mounted.current) {
        notify(`PDF compartido con ${currentPlan.targets.map(target => nameFor(target.studentId, students)).join(" y ")}.`);
        onClose();
      }
    } catch (reason: any) {
      if (mounted.current) {
        setError(reason?.message || "No se ha podido compartir el PDF. Puedes volver a intentarlo.");
        requestAnimationFrame(() => errorRef.current?.focus({ preventScroll: false }));
      }
    } finally {
      busyRef.current = false;
      if (mounted.current) { setBusy(false); refreshProgress(value => value + 1); }
    }
  };

  return <Dialog title="Subir PDF" onClose={close} className={`teacher-pdf-upload${busy ? " is-busy" : ""}`}>
    <form ref={formRef} className="tpu-form" onSubmit={submit} aria-busy={busy}>
      <p id={`${id}-intro`} className="tpu-intro">Aparecerá en {collection === "exam-prep" ? "Preparar exámenes" : "Fichas y PDF"} de {audience === "both" ? "las dos alumnas" : "la alumna que elijas"}.</p>
      <fieldset disabled={busy || locked} className="tpu-fields">
        <label className="field" htmlFor={`${id}-file`}>Archivo PDF
          <input ref={fileInput} id={`${id}-file`} type="file" accept=".pdf,application/pdf" required onChange={selectFile} aria-describedby={`${id}-file-help`}/>
          <small id={`${id}-file-help`}>Máximo 8 MB.</small>
        </label>
        {file && <div className="tpu-selected-file"><FileText size={20} aria-hidden="true"/><span>{file.name}</span></div>}
        <label className="field" htmlFor={`${id}-title`}>Título
          <input id={`${id}-title`} required maxLength={200} value={title} onChange={event => setTitle(event.target.value)}/>
        </label>
        <div className="tpu-selects">
          <label className="field" htmlFor={`${id}-audience`}>Para
            <select id={`${id}-audience`} value={audience} onChange={event => setAudience(event.target.value as StudentId | "both")}>
              <option value="rocio">{nameFor("rocio", students)}</option><option value="alejandra">{nameFor("alejandra", students)}</option><option value="both">Las dos</option>
            </select>
          </label>
          <label className="field" htmlFor={`${id}-subject`}>Asignatura
            <select id={`${id}-subject`} value={subject} onChange={event => setSubject(event.target.value)}><option value="">General</option>{subjectNames.filter(name => name !== "General").map(name => <option key={name} value={name}>{name}</option>)}</select>
          </label>
        </div>
        <div className="tpu-selects">
          <label className="field" htmlFor={`${id}-collection`}>Tipo de ficha
            <select id={`${id}-collection`} value={collection} onChange={event => setCollection(event.target.value as PdfCollection)}><option value="materials">Material de clase</option><option value="exam-prep">Preparar un examen</option></select>
          </label>
          {collection === "exam-prep" && <label className="field" htmlFor={`${id}-exam-mode`}>Para trabajar
            <select id={`${id}-exam-mode`} value={examMode} onChange={event => setExamMode(event.target.value as ExamMode)}><option value="class">En clase</option><option value="independent">Por su cuenta</option><option value="either">En clase o por su cuenta</option></select>
          </label>}
        </div>
      </fieldset>
      {plan && <div className="tpu-progress" role="status" aria-live="polite" aria-atomic="true">
        <ul aria-label="Estado del PDF por alumna">{plan.targets.map((target, index) => <li key={target.studentId}>
          {target.shared ? <CheckCircle2 size={18} className="tpu-shared-icon" aria-hidden="true"/> : busy && index === firstPending ? <LoaderCircle size={18} className="tpu-spinner" aria-hidden="true"/> : <FileText size={18} aria-hidden="true"/>}
          <span>{nameFor(target.studentId, students)}</span><strong>{target.shared ? "Compartido" : busy && index === firstPending ? target.file ? "Compartiendo…" : "Subiendo…" : target.file ? "Pendiente de compartir" : "Pendiente"}</strong>
        </li>)}</ul>
      </div>}
      {error && <div ref={errorRef} className="tpu-error" role="alert" tabIndex={-1}><AlertCircle size={20} aria-hidden="true"/><div><p>{error}</p>{plan?.targets.some(target => target.shared) && <p>Lo que ya está compartido se conserva. Reintentar completará lo pendiente.</p>}</div></div>}
      {busy && !plan && <p className="tpu-preparing" role="status"><LoaderCircle size={18} className="tpu-spinner" aria-hidden="true"/>Preparando el PDF…</p>}
      <div className="tpu-actions"><button type="button" className="btn secondary" disabled={busy} onClick={close}>Cerrar</button><button type="submit" className="btn primary" disabled={busy}>{busy ? <LoaderCircle size={18} className="tpu-spinner" aria-hidden="true"/> : <Upload size={18} aria-hidden="true"/>}{busy ? "Compartiendo…" : error && locked ? "Reintentar" : "Compartir PDF"}</button></div>
    </form>
  </Dialog>;
}
