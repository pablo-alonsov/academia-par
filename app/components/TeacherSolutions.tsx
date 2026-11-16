"use client";

import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { AlertCircle, Archive, ArchiveRestore, CheckCircle2, ExternalLink, FileText, History, LoaderCircle, LockKeyhole, Search, Upload } from "lucide-react";
import { authorizedFetch } from "@/lib/client-request";
import { buildSolutionGroups, type SolutionGroup } from "@/lib/pdf-solutions";
import Dialog from "./Dialog";
import "./teacher-solutions.css";

type Props = { data: any; act: (action: string, payload: any) => Promise<any>; notify: (message: string) => void; onRefresh: () => Promise<void> };
type SolutionAction = { key: string; resourceId: string; kind: "archive"; archived: boolean } | { key: string; resourceId: string; kind: "restore"; fileId: string; operationId: string };
const MAX_PDF_BYTES = 8 * 1024 * 1024;
const normalized = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
const pdfURL = (id: string) => `/api/files/${encodeURIComponent(id)}?view=inline#view=FitH`;
function solutionDate(file: any) {
  const raw = file?._solutionUpdatedAt || file?.createdAt;
  const date = typeof raw === "string" ? new Date(raw) : null;
  return date && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Madrid" }).format(date) : "";
}
function useBusyNavigation(busy: { current: boolean }, message: string) {
  useEffect(() => {
    const beforeNavigation = (event: Event) => {
      if (!busy.current) return;
      const jobs = (event as CustomEvent<{ jobs?: Promise<unknown>[] }>).detail?.jobs;
      if (Array.isArray(jobs)) jobs.push(Promise.reject(new Error(message)));
    };
    const beforeUnload = (event: BeforeUnloadEvent) => { if (busy.current) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("arp:before-navigation", beforeNavigation); window.addEventListener("beforeunload", beforeUnload);
    return () => { window.removeEventListener("arp:before-navigation", beforeNavigation); window.removeEventListener("beforeunload", beforeUnload); };
  }, [busy, message]);
}

export default function TeacherSolutions({ data, act, notify, onRefresh }: Props) {
  const groups = useMemo(() => buildSolutionGroups(data.resources || [], data.files || [], data.students || []), [data.resources, data.files, data.students]);
  const [search, setSearch] = useState(""), [studentId, setStudentId] = useState(""), [status, setStatus] = useState("active");
  const [uploadGroup, setUploadGroup] = useState<string | null>(null), [busyKey, setBusyKey] = useState("");
  const [actionError, setActionError] = useState<{ action: SolutionAction; message: string } | null>(null);
  const busyRef = useRef(false), mounted = useRef(false), retryOperations = useRef(new Map<string, string>());
  const id = useId();
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useBusyNavigation(busyRef, "Espera a que termine de guardar la solución.");
  const query = normalized(search);
  const visibleGroups = groups.filter(group => (!query || normalized(`${group.title} ${group.studentNames.join(" ")}`).includes(query)) && (!studentId || group.studentIds.includes(studentId)) && (status === "archived" ? group.archived : !group.archived && (status !== "pending" || !group.current)));

  const changeSolution = async (action: SolutionAction) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusyKey(action.key); setActionError(null);
    try {
      const result = action.kind === "archive" ? await act("setSolutionsArchived", { resourceId: action.resourceId, archived: action.archived }) : await act("restorePdfSolution", { resourceId: action.resourceId, fileId: action.fileId, operationId: action.operationId });
      if (result?.ok === false || result?.conflict === true) throw new Error("No se ha podido confirmar el cambio. Inténtalo de nuevo.");
      await onRefresh();
      if (mounted.current) {
        if (action.kind === "restore") retryOperations.current.delete(`${action.key}:${action.fileId}`);
        notify(action.kind === "restore" ? "Versión recuperada." : action.archived ? "Soluciones archivadas." : "Soluciones restauradas.");
      }
    } catch (reason: any) {
      if (mounted.current) setActionError({ action, message: reason?.message || "No se ha podido guardar el cambio. Inténtalo de nuevo." });
    } finally {
      busyRef.current = false; if (mounted.current) setBusyKey("");
    }
  };
  const restoreVersion = (group: SolutionGroup, fileId: string) => {
    const key = `${group.key}:${fileId}`;
    let operationId = retryOperations.current.get(key);
    if (!operationId) { operationId = crypto.randomUUID(); retryOperations.current.set(key, operationId); }
    void changeSolution({ key: group.key, resourceId: group.resourceIds[0], kind: "restore", fileId, operationId });
  };

  return <section className="teacher-solutions" aria-labelledby={`${id}-heading`}>
    <div className="tsol-heading"><div><h2 id={`${id}-heading`}>Soluciones privadas</h2><p><LockKeyhole size={15} aria-hidden="true"/>Solo disponibles en tu panel.</p></div><button type="button" className="btn primary" disabled={!groups.length || Boolean(busyKey)} onClick={() => setUploadGroup("")}><Upload size={17} aria-hidden="true"/>Subir solución</button></div>
    {!groups.length ? <div className="card tsol-empty"><FileText size={28} aria-hidden="true"/><h3>Todavía no hay fichas PDF</h3><p>Sube primero una ficha PDF en Materiales para añadir su solución.</p></div> : <>
      <div className="tsol-filters">
        <label className="field" htmlFor={`${id}-search`}>Buscar ficha<div className="tsol-search"><Search size={18} aria-hidden="true"/><input id={`${id}-search`} type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nombre de la ficha"/></div></label>
        <label className="field" htmlFor={`${id}-student`}>Alumna<select id={`${id}-student`} value={studentId} onChange={event => setStudentId(event.target.value)}><option value="">Las dos</option>{(data.students || []).map((student: any) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label>
        <label className="field" htmlFor={`${id}-status`}>Estado<select id={`${id}-status`} value={status} onChange={event => setStatus(event.target.value)}><option value="active">Activas</option><option value="pending">Pendientes</option><option value="archived">Archivadas</option></select></label>
      </div>
      {actionError && <div className="tsol-error" role="alert"><AlertCircle size={20} aria-hidden="true"/><p>{actionError.message}</p><button type="button" className="btn secondary" disabled={Boolean(busyKey)} onClick={() => void changeSolution(actionError.action)}>Reintentar</button></div>}
      <div className="tsol-list" aria-busy={Boolean(busyKey)}>{visibleGroups.map(group => {
        const original = group.resources.find(resource => typeof resource.fileId === "string" && resource.fileId), date = solutionDate(group.current), rowBusy = busyKey === group.key;
        return <article className="card tsol-card" key={group.key} aria-labelledby={`${id}-${group.key}`}>
          <div className="tsol-card-top"><div className="tsol-file-icon"><FileText size={23} aria-hidden="true"/></div><div className="tsol-card-heading"><h3 id={`${id}-${group.key}`}>{group.title}</h3><p>{group.studentNames.join(" · ")}</p></div><span className={`badge ${group.current ? "green" : "amber"}`}>{group.current ? <CheckCircle2 size={14} aria-hidden="true"/> : null}{group.current ? "Disponible" : "Pendiente"}</span></div>
          {date && <p className="tsol-updated">Actualizada el <time dateTime={group.current?._solutionUpdatedAt || group.current?.createdAt}>{date}</time></p>}
          <div className="tsol-card-actions">
            {original && <a className="btn secondary" href={pdfURL(original.fileId)} target="_blank" rel="noreferrer">Ver ficha<ExternalLink size={15} aria-hidden="true"/></a>}
            {group.current && <a className="btn secondary" href={pdfURL(group.current.id)} target="_blank" rel="noreferrer">Ver solución<ExternalLink size={15} aria-hidden="true"/></a>}
            <button type="button" className="btn primary" disabled={Boolean(busyKey)} onClick={() => setUploadGroup(group.key)}><Upload size={16} aria-hidden="true"/>{group.current ? "Actualizar PDF" : "Subir solución"}</button>
          </div>
          <div className="tsol-secondary-actions"><button type="button" className="btn quiet" disabled={Boolean(busyKey)} onClick={() => void changeSolution({ key: group.key, resourceId: group.resourceIds[0], kind: "archive", archived: !group.archived })}>{rowBusy ? <LoaderCircle size={16} className="tsol-spinner" aria-hidden="true"/> : group.archived ? <ArchiveRestore size={16} aria-hidden="true"/> : <Archive size={16} aria-hidden="true"/>}{rowBusy ? "Guardando…" : group.archived ? "Restaurar" : "Archivar"}</button>{group.archived && <span className="badge">Archivada</span>}</div>
          {group.previous.length > 0 && <details className="tsol-versions"><summary><History size={17} aria-hidden="true"/>Versiones anteriores ({group.previous.length})</summary><ul>{group.previous.map(file => <li key={file.id}><div><strong>{file.name || "Solución PDF"}</strong>{solutionDate(file) && <span>{solutionDate(file)}</span>}</div><div className="tsol-version-actions"><a className="btn secondary" href={pdfURL(file.id)} target="_blank" rel="noreferrer">Ver PDF<ExternalLink size={14} aria-hidden="true"/></a><button type="button" className="btn quiet" disabled={Boolean(busyKey)} onClick={() => restoreVersion(group, file.id)}>Usar esta versión</button></div></li>)}</ul></details>}
        </article>;
      })}</div>
      {!visibleGroups.length && <div className="card tsol-empty"><h3>Sin resultados</h3><p>No hay fichas con estos filtros.</p><button type="button" className="btn quiet" onClick={() => { setSearch(""); setStudentId(""); setStatus("active"); }}>Limpiar filtros</button></div>}
    </>}
    {uploadGroup !== null && <SolutionUpload groups={groups} initialGroupKey={uploadGroup} onRefresh={onRefresh} notify={notify} onClose={() => setUploadGroup(null)}/>}
  </section>;
}

type UploadPlan = { resourceId: string; uploadId: string; file: File; uploaded?: { id: string; type: string; shared: false; name?: string } };
function SolutionUpload({ groups, initialGroupKey, onRefresh, notify, onClose }: { groups: SolutionGroup[]; initialGroupKey: string; onRefresh: () => Promise<void>; notify: (message: string) => void; onClose: () => void }) {
  const [groupKey, setGroupKey] = useState(initialGroupKey || groups.find(group => !group.archived && !group.current)?.key || groups.find(group => !group.archived)?.key || groups[0]?.key || "");
  const [file, setFile] = useState<File | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [, refreshUploadStatus] = useState(0);
  const plan = useRef<UploadPlan | null>(null), busyRef = useRef(false), mounted = useRef(false), formRef = useRef<HTMLFormElement>(null), errorRef = useRef<HTMLDivElement>(null), fileInput = useRef<HTMLInputElement>(null);
  const id = useId(), group = groups.find(item => item.key === groupKey), locked = Boolean(plan.current);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useBusyNavigation(busyRef, "Espera a que termine de subir la solución.");
  useEffect(() => {
    const closeButton = formRef.current?.closest(".arp-dialog")?.querySelector<HTMLButtonElement>(".arp-dialog-header > button");
    if (!closeButton) return;
    closeButton.disabled = busy;
    return () => { closeButton.disabled = false; };
  }, [busy]);
  const close = () => { if (!busyRef.current) onClose(); };
  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    if (busyRef.current || locked) return;
    const selected = event.currentTarget.files?.[0]; setError("");
    if (!selected) { setFile(null); return; }
    if (selected.type !== "application/pdf" && !/\.pdf$/i.test(selected.name)) { setError("Elige un archivo PDF."); setFile(null); event.currentTarget.value = ""; return; }
    if (!selected.size || selected.size > MAX_PDF_BYTES) { setError(selected.size ? "El PDF debe ocupar como máximo 8 MB." : "Este archivo está vacío. Elige otro PDF."); setFile(null); event.currentTarget.value = ""; return; }
    setFile(selected);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busyRef.current) return;
    if (!file) { setError("Elige el PDF de la solución."); fileInput.current?.focus(); return; }
    if (!group?.resourceIds[0]) { setError("Elige la ficha a la que corresponde la solución."); return; }
    plan.current ||= { resourceId: group.resourceIds[0], uploadId: crypto.randomUUID(), file };
    const current = plan.current;
    busyRef.current = true; setBusy(true); setError("");
    try {
      if (!current.uploaded) {
        const body = new FormData(); body.append("file", current.file); body.append("purpose", "solution"); body.append("resourceId", current.resourceId); body.append("uploadId", current.uploadId); body.append("shared", "false");
        const response = await authorizedFetch("/api/files", { method: "POST", body });
        const result: any = await response.json().catch(() => null);
        if (!response.ok) throw new Error(typeof result?.error === "string" ? result.error : "No se ha podido subir la solución. Inténtalo de nuevo.");
        if (typeof result?.id !== "string" || !result.id || result.type !== "application/pdf" || result.shared !== false) throw new Error("No se ha podido confirmar una solución PDF privada. Inténtalo de nuevo.");
        current.uploaded = result;
        if (mounted.current) refreshUploadStatus(value => value + 1);
      }
      await onRefresh();
      if (mounted.current) { notify("Solución guardada en tu panel."); onClose(); }
    } catch (reason: any) {
      if (mounted.current) { setError(reason?.message || "No se ha podido guardar la solución. Inténtalo de nuevo."); requestAnimationFrame(() => errorRef.current?.focus({ preventScroll: false })); }
    } finally { busyRef.current = false; if (mounted.current) setBusy(false); }
  };

  return <Dialog title={group?.current ? "Actualizar PDF" : "Subir solución"} onClose={close} className={`teacher-solution-upload${busy ? " is-busy" : ""}`}>
    <form ref={formRef} onSubmit={submit} className="tsol-upload-form" aria-busy={busy}>
      <p className="tsol-private-note"><LockKeyhole size={16} aria-hidden="true"/>La solución solo estará disponible en tu panel.</p>
      <fieldset className="tsol-upload-fields" disabled={busy || locked}>
        <label className="field" htmlFor={`${id}-worksheet`}>Ficha<select id={`${id}-worksheet`} required value={groupKey} onChange={event => setGroupKey(event.target.value)}>{groups.map(item => <option key={item.key} value={item.key}>{item.title} · {item.studentNames.join(" y ")}</option>)}</select></label>
        <label className="field" htmlFor={`${id}-file`}>Archivo PDF de la solución<input ref={fileInput} id={`${id}-file`} required type="file" accept=".pdf,application/pdf" onChange={selectFile} aria-describedby={`${id}-file-help`}/><small id={`${id}-file-help`}>Máximo 8 MB.</small></label>
        {file && <div className="tsol-selected-file"><FileText size={20} aria-hidden="true"/><span>{file.name}</span></div>}
      </fieldset>
      {error && <div ref={errorRef} className="tsol-error tsol-upload-error" role="alert" tabIndex={-1}><AlertCircle size={20} aria-hidden="true"/><div><p>{error}</p>{plan.current?.uploaded && <p>El archivo ya está guardado. Reintentar actualizará la lista.</p>}</div></div>}
      {busy && <p className="tsol-upload-progress" role="status"><LoaderCircle size={18} className="tsol-spinner" aria-hidden="true"/>{plan.current?.uploaded ? "Actualizando la lista…" : "Subiendo la solución…"}</p>}
      <div className="tsol-upload-actions"><button type="button" className="btn secondary" disabled={busy} onClick={close}>Cerrar</button><button type="submit" className="btn primary" disabled={busy || !groups.length}>{busy ? <LoaderCircle size={17} className="tsol-spinner" aria-hidden="true"/> : <Upload size={17} aria-hidden="true"/>}{busy ? "Guardando…" : error && locked ? "Reintentar" : "Guardar solución"}</button></div>
    </form>
  </Dialog>;
}
