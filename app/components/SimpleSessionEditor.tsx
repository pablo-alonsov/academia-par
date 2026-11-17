"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookOpen, CheckCircle2, ExternalLink, FileText, LoaderCircle, Plus, Save, Search, X } from "lucide-react";
import DateInput from "./DateInput";
import Dialog from "./Dialog";
import MathText from "./MathText";
import { ACADEMY_START_DATE, trackingToday } from "@/lib/academy-config";
import { getResultVersion, isCurrentResultVersion, resultStoragePrefix, RESULT_VERSION_CHANGED_EVENT } from "@/lib/client-result-state";
import "./simple-session.css";

type Item = Record<string, any>;
type ClassForm = { id: string; studentId: string; date: string; schoolwork: string; content: string; resourceIds: string[]; activityIds: string[]; fileIds: string[] };
type Props = { initial: Item; data: Item; act: (action: string, payload: Item) => Promise<any>; notify: (message: string) => void; back: () => void; backLabel?: string };
type Choice = { kind: "resourceIds" | "activityIds" | "fileIds"; id: string; title: string; subject?: string; url?: string; pdf?: boolean };
type Recovery = { local: ClassForm; server?: Item; message: string; legacyToken?: string };
const text = (value: any): string => Array.isArray(value) ? value.filter(item => typeof item === "string").join("\n") : typeof value === "string" ? value : "";
const ids = (value: any): string[] => [...new Set<string>(Array.isArray(value) ? value.filter(item => typeof item === "string" && item) : [])];
const available = (item: Item, pupil: string) => item.studentId ? item.studentId === pupil : !item.suggestedStudentIds?.length || item.suggestedStudentIds.includes(pupil);
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");

function classChoices(data: Item, studentId: string): Choice[] {
  const files = (data.files || []).filter((file: Item) => file.studentId === studentId && file.shared === true && file.detached !== true && !["avatar", "solution"].includes(file.purpose));
  const safe = new Map<string, Item>(files.map((file: Item) => [file.id, file]));
  const safeLinks = (item: Item) => {
    if (item.shared === false || item.detached === true) return false;
    const linked = ids([...(item.fileIds || []), ...(item.fileId ? [item.fileId] : [])]);
    if (typeof item.url === "string") { try { const match = new URL(item.url, "https://academy.invalid").pathname.match(/^\/api\/files\/([^/]+)/); if (match) linked.push(decodeURIComponent(match[1])); } catch {} }
    return linked.every(id => safe.has(id));
  };
  const resources: Item[] = (data.resources || []).filter((item: Item) => available(item, studentId) && safeLinks(item));
  const resourceMap = new Map(resources.map(item => [item.id, item]));
  const usedFiles = new Set(resources.flatMap(item => ids([...(item.fileIds || []), ...(item.fileId ? [item.fileId] : [])])));
  const resourceChoices: Choice[] = resources.map(item => {
    const file = safe.get(item.fileId);
    return { kind: "resourceIds", id: item.id, title: item.title || "Material", subject: item.subject, url: file ? `/api/files/${encodeURIComponent(file.id)}${file.type === "application/pdf" ? "?view=inline#view=FitH" : ""}` : item.url, pdf: file?.type === "application/pdf" };
  });
  const fileChoices: Choice[] = files.filter((file: Item) => !usedFiles.has(file.id)).map((file: Item) => ({ kind: "fileIds", id: file.id, title: file.name || "Archivo", url: `/api/files/${encodeURIComponent(file.id)}${file.type === "application/pdf" ? "?view=inline#view=FitH" : ""}`, pdf: file.type === "application/pdf" }));
  const activities: Choice[] = (data.activities || []).filter((item: Item) => available(item, studentId) && safeLinks(item) && (!item.resourceId || resourceMap.has(item.resourceId))).map((item: Item) => ({ kind: "activityIds", id: item.id, title: item.title || "Actividad", subject: item.subject }));
  return [...resourceChoices, ...fileChoices, ...activities];
}
function formFor(record: Item, data: Item): ClassForm {
  const choices = classChoices(data, record.studentId), permitted = (kind: Choice["kind"], values: any) => ids(values).filter(id => choices.some(item => item.kind === kind && item.id === id));
  const simple = Array.isArray(record.activityIds) || Array.isArray(record.resourceIds) || record._simpleClassRecord === true;
  const previousActivities = simple ? record.activityIds : [record.activityId, record.alternativeActivityId, ...(data.assignments || []).filter((item: Item) => item.sessionId === record.id && item.studentId === record.studentId).map((item: Item) => item.activityId)];
  const previousFiles = simple ? record.fileIds : [...(record.fileIds || []), ...(data.files || []).filter((file: Item) => file.sessionId === record.id).map((file: Item) => file.id), ...(data.evidence || []).filter((item: Item) => item.sessionId === record.id).flatMap((item: Item) => [...(item.fileIds || []), ...(item.fileId ? [item.fileId] : [])])];
  // Direct file links already represented by a resource stay valid selections.
  const sharedFiles = new Set((data.files || []).filter((file: Item) => file.studentId === record.studentId && file.shared === true && file.detached !== true && !["avatar", "solution"].includes(file.purpose)).map((file: Item) => file.id));
  return { id: record.id, studentId: record.studentId, date: record.date || trackingToday(), schoolwork: text(record.schoolwork), content: text(record.content) || text(record.sharedSummary), resourceIds: permitted("resourceIds", record.resourceIds), activityIds: permitted("activityIds", previousActivities), fileIds: ids(previousFiles).filter(id => sharedFiles.has(id)) };
}
const sameForm = (a: ClassForm, b: ClassForm) => JSON.stringify(a) === JSON.stringify(b);

export default function SimpleSessionEditor({ initial, data, act, notify, back, backLabel = "Volver a mis clases" }: Props) {
  const version = useRef(getResultVersion()).current, active = () => isCurrentResultVersion(version);
  const prefix = resultStoragePrefix("arp-teacher-session:", version), draftKey = `${prefix}simple:${initial.id}`, legacyKey = `${prefix}${initial.id}`, legacySeenKey = `${prefix}simple-legacy:${initial.id}`;
  const [form, setForm] = useState<ClassForm>(() => formFor(initial, data)), [dirty, setDirty] = useState(false), [saving, setSaving] = useState(false), [publishing, setPublishing] = useState(false), [error, setError] = useState("");
  const [recovery, setRecovery] = useState<Recovery | null>(null), [paused, setPaused] = useState(false), [picker, setPicker] = useState(false), [query, setQuery] = useState(""), [pickerTab, setPickerTab] = useState("materials"), [limit, setLimit] = useState(20), [savedOnce, setSavedOnce] = useState(Boolean(initial.updatedAt));
  const latest = useRef(form), base = useRef<Item>({ ...initial }), revision = useRef(0), savedRevision = useRef(0), queue = useRef<Promise<any>>(Promise.resolve(null)), timer = useRef<ReturnType<typeof setTimeout> | null>(null), mounted = useRef(false), locked = useRef(false), pausedRef = useRef(false), recoveryRef = useRef<Recovery | null>(null), storedLocally = useRef(true);
  const dataRef = useRef(data), actRef = useRef(act), heading = useRef<HTMLHeadingElement>(null), mainContent = useRef<HTMLTextAreaElement>(null), pendingSaves = useRef(0), deferredRemote = useRef<Item | undefined>(undefined), id = useId();
  dataRef.current = data; actRef.current = act; latest.current = form; recoveryRef.current = recovery;
  const choices = useMemo(() => classChoices(data, form.studentId), [data, form.studentId]);
  const selected: Choice[] = choices.filter(choice => form[choice.kind].includes(choice.id));
  const selectedDirect = form.fileIds.filter(fileId => !selected.some(item => item.kind === "fileIds" && item.id === fileId)).map(fileId => { const file = (data.files || []).find((item: Item) => item.id === fileId); return { kind: "fileIds" as const, id: fileId, title: file?.name || "Archivo", url: `/api/files/${encodeURIComponent(fileId)}${file?.type === "application/pdf" ? "?view=inline#view=FitH" : ""}` }; });
  const pupil = (data.students || []).find((item: Item) => item.id === form.studentId);

  const persist = (value = latest.current) => {
    if (!active()) return false;
    try { sessionStorage.setItem(draftKey, JSON.stringify({ data: value, baseUpdatedAt: base.current.updatedAt || null, savedAt: new Date().toISOString() })); storedLocally.current = true; return true; }
    catch { storedLocally.current = false; return false; }
  };
  const clearDraft = () => { if (active()) try { sessionStorage.removeItem(draftKey); } catch {} };
  const edit = (patch: Partial<ClassForm>) => {
    if (!active() || recoveryRef.current || locked.current) return;
    const next = { ...latest.current, ...patch };
    if (sameForm(next, latest.current)) return;
    revision.current++; latest.current = next; setForm(next); setDirty(true); setError(""); persist(next);
  };
  const conflict = (remote: Item | undefined, message = "La clase ha cambiado en otra pestaña. Elige qué versión quieres conservar.") => {
    persist(); const pending = { local: { ...latest.current }, server: remote, message };
    recoveryRef.current = pending; setRecovery(pending); setError("");
    if (remote) { base.current = { ...remote }; setSavedOnce(true); }
  };
  const reconcile = (remote: Item | undefined) => {
    if (!active() || !remote) return;
    if (pendingSaves.current) { deferredRemote.current = remote; return; }
    if (base.current.updatedAt && Date.parse(remote.updatedAt || "") < Date.parse(base.current.updatedAt)) return;
    if (remote.updatedAt === base.current.updatedAt) return;
    if (revision.current > savedRevision.current || recoveryRef.current) { conflict(remote); return; }
    base.current = { ...remote }; const next = formFor(remote, dataRef.current); latest.current = next; setForm(next); setSavedOnce(true); setDirty(false); clearDraft();
  };
  const save = (publish = false, background = false): Promise<any> => {
    if (timer.current) clearTimeout(timer.current);
    if (!active()) return Promise.reject(new Error("El acceso ha cambiado. Vuelve a abrir la clase."));
    if (recoveryRef.current || pausedRef.current && !background) return Promise.reject(new Error("Comprueba el estado de la clase antes de guardar."));
    if (publish && !latest.current.content.trim()) { setError("Escribe qué habéis hecho durante la sesión."); mainContent.current?.focus(); return Promise.reject(new Error("Escribe qué habéis hecho durante la sesión.")); }
    const snapshot = { ...latest.current, resourceIds: [...latest.current.resourceIds], activityIds: [...latest.current.activityIds], fileIds: [...latest.current.fileIds] }, ownRevision = revision.current;
    if (!publish && ownRevision <= savedRevision.current) return queue.current;
    pendingSaves.current++; if (mounted.current) setSaving(true);
    const task = queue.current.catch(() => null).then(async () => {
      if (!active() || recoveryRef.current || pausedRef.current && !background) throw new Error("Comprueba el estado de la clase antes de guardar.");
      if (!publish && ownRevision <= savedRevision.current) return { skipped: true };
      if (mounted.current) setSaving(true);
      const result = await actRef.current("saveClassRecord", { ...snapshot, duration: 60, baseUpdatedAt: base.current.updatedAt || null, publish });
      if (!active()) throw new Error("El acceso ha cambiado. Vuelve a abrir la clase.");
      const remote = result.patch?.sessions?.find((item: Item) => item.id === snapshot.id);
      if (result.conflict) { if (mounted.current) conflict(remote); throw new Error("Revisa las dos versiones antes de continuar."); }
      if (!remote) throw new Error("No se ha podido confirmar el guardado de la clase.");
      base.current = { ...remote }; savedRevision.current = Math.max(savedRevision.current, ownRevision);
      if (mounted.current) {
        setSavedOnce(true); setDirty(revision.current > savedRevision.current); setError("");
        if (revision.current <= savedRevision.current) clearDraft(); else persist();
      }
      return result;
    });
    queue.current = task;
    task.catch((reason: any) => { if (mounted.current && active() && !recoveryRef.current) { persist(); setError(reason?.message || "No se ha podido guardar. El texto se conserva en esta pestaña."); setDirty(true); } }).finally(() => { pendingSaves.current = Math.max(0, pendingSaves.current - 1); if (mounted.current && active()) { setSaving(pendingSaves.current > 0); if (!pendingSaves.current && deferredRemote.current) { const remote = deferredRemote.current; deferredRemote.current = undefined; reconcileRef.current(remote); } } });
    return task;
  };
  const saveRef = useRef(save), persistRef = useRef(persist), reconcileRef = useRef(reconcile);
  saveRef.current = save; persistRef.current = persist; reconcileRef.current = reconcile;

  useEffect(() => {
    mounted.current = true; heading.current?.focus({ preventScroll: true });
    try {
      const raw = sessionStorage.getItem(draftKey), legacyRaw = !raw ? sessionStorage.getItem(legacyKey) : null;
      const copy = JSON.parse(raw || legacyRaw || "null"), token = legacyRaw ? `${copy?.savedAt || ""}:${copy?.revision || 0}:${copy?.baseUpdatedAt || ""}` : "";
      if (copy?.data?.id === initial.id && copy.data.studentId === initial.studentId && (!token || sessionStorage.getItem(legacySeenKey) !== token)) {
        const local = formFor(copy.data, dataRef.current);
        if (!sameForm(local, latest.current)) { const pending = { local, server: initial.updatedAt ? initial : undefined, message: "Hay apuntes de esta clase guardados en esta pestaña.", ...(token ? { legacyToken: token } : {}) }; recoveryRef.current = pending; setRecovery(pending); }
        else if (raw) clearDraft();
      }
    } catch {}
    const beforeNavigation = (event: Event) => {
      if (!active()) return;
      const jobs = (event as CustomEvent<{ jobs?: Promise<any>[] }>).detail?.jobs;
      if (!Array.isArray(jobs)) return;
      if (recoveryRef.current) { jobs.push(Promise.reject(new Error("Elige qué apuntes conservar antes de salir de la clase."))); return; }
      if (revision.current > savedRevision.current) { persistRef.current(); jobs.push(saveRef.current()); } else jobs.push(queue.current.catch(() => null));
    };
    const unload = (event: BeforeUnloadEvent) => { if (active() && revision.current > savedRevision.current) { persistRef.current(); event.preventDefault(); event.returnValue = ""; } };
    const hide = () => {
      if (!active()) return; if (timer.current) clearTimeout(timer.current);
      if (revision.current > savedRevision.current) { persistRef.current(); if (!pausedRef.current && !recoveryRef.current) void saveRef.current(false, true).catch(() => {}); }
      pausedRef.current = true; setPaused(true);
    };
    const visibility = () => { if (document.visibilityState === "hidden") hide(); };
    const ready = (event: Event) => {
      if (!active()) return;
      const detail = (event as CustomEvent).detail;
      if (detail?.profile !== "teacher" || !Array.isArray(detail.snapshot?.sessions)) return;
      const remote = detail.snapshot.sessions.find((item: Item) => item.id === initial.id);
      if (!remote && base.current.updatedAt) { persistRef.current(); setError("No se ha encontrado la clase. Tus apuntes se conservan en esta pestaña."); return; }
      reconcileRef.current(remote); pausedRef.current = false; setPaused(false);
      if (revision.current > savedRevision.current && !recoveryRef.current) void saveRef.current().catch(() => {});
    };
    const reset = () => { if (!active()) { if (timer.current) clearTimeout(timer.current); pausedRef.current = true; setPaused(true); } };
    window.addEventListener("arp:before-navigation", beforeNavigation); window.addEventListener("beforeunload", unload); window.addEventListener("pagehide", hide); document.addEventListener("visibilitychange", visibility); window.addEventListener("arp:resume-ready", ready); window.addEventListener(RESULT_VERSION_CHANGED_EVENT, reset);
    return () => { mounted.current = false; if (timer.current) clearTimeout(timer.current); if (active() && revision.current > savedRevision.current) persistRef.current(); window.removeEventListener("arp:before-navigation", beforeNavigation); window.removeEventListener("beforeunload", unload); window.removeEventListener("pagehide", hide); document.removeEventListener("visibilitychange", visibility); window.removeEventListener("arp:resume-ready", ready); window.removeEventListener(RESULT_VERSION_CHANGED_EVENT, reset); };
  }, []);
  useEffect(() => { if (initial.updatedAt) reconcile(initial); }, [initial.updatedAt]);
  useEffect(() => { if (!dirty || saving || publishing || recovery || paused || error || !active()) return; timer.current = setTimeout(() => { void saveRef.current().catch(() => {}); }, 900); return () => { if (timer.current) clearTimeout(timer.current); }; }, [form, dirty, saving, publishing, recovery, paused, error]);
  useEffect(() => { setLimit(20); }, [query, pickerTab]);

  const leave = async () => { try { if (recoveryRef.current) throw new Error("Elige qué apuntes conservar antes de salir."); if (revision.current > savedRevision.current) await save(); else await queue.current.catch(() => null); back(); } catch (reason: any) { setError(reason.message); } };
  const publish = async () => { if (locked.current || recoveryRef.current || pausedRef.current) return; locked.current = true; setPublishing(true); try { await save(true); notify("Clase guardada."); } catch {} finally { locked.current = false; if (mounted.current) setPublishing(false); } };
  const chooseRecovery = (local: boolean) => {
    const pending = recoveryRef.current; if (!pending || !active()) return;
    if (pending.legacyToken) try { sessionStorage.setItem(legacySeenKey, pending.legacyToken); } catch {}
    if (pending.server) { base.current = { ...pending.server }; setSavedOnce(true); }
    const next = local ? pending.local : formFor(pending.server || initial, dataRef.current);
    recoveryRef.current = null; setRecovery(null); latest.current = next; setForm(next); setError("");
    if (local) { revision.current++; setDirty(true); persist(next); } else { savedRevision.current = revision.current; setDirty(false); clearDraft(); }
  };
  const toggle = (choice: Choice) => edit({ [choice.kind]: form[choice.kind].includes(choice.id) ? form[choice.kind].filter(value => value !== choice.id) : [...form[choice.kind], choice.id] });
  const matching = choices.filter(choice => (pickerTab === "activities" ? choice.kind === "activityIds" : choice.kind !== "activityIds") && (!query || normalize(`${choice.title} ${choice.subject || ""}`).includes(normalize(query))));
  const status = recovery ? "Revisa el guardado" : error ? "No se ha guardado" : saving ? "Guardando…" : dirty ? "Cambios pendientes" : savedOnce ? "Guardado" : "";

  return <div className="teacher-views simple-session">
    <div className="page-heading"><div><button type="button" className="btn quiet" onClick={() => void leave()}><ArrowLeft size={17}/>{backLabel}</button><h1 ref={heading} tabIndex={-1} className="teacher-page-title">Clase de {pupil?.name || "la alumna"}</h1><p>60 minutos</p></div><div className="simple-session-save"><span role="status" aria-live="polite" className={`simple-session-status ${error ? "is-error" : ""}`}>{status && (saving ? <LoaderCircle size={17} className="simple-session-spinner"/> : <CheckCircle2 size={17}/>)}{status}</span><button type="button" className="btn primary" disabled={publishing || Boolean(recovery) || paused} onClick={() => void publish()}><Save size={17}/>{publishing ? "Guardando…" : "Guardar clase"}</button></div></div>
    {recovery && <section className="card simple-session-recovery" role="region" aria-label="Apuntes conservados"><h2>Apuntes conservados</h2><p>{recovery.message}</p><details><summary>Ver mis apuntes</summary><p className="simple-session-preline"><strong>Colegio y trabajo de clase</strong><br/>{recovery.local.schoolwork || "Sin apuntes."}</p><p className="simple-session-preline"><strong>Lo que hemos hecho en la sesión</strong><br/>{recovery.local.content || "Sin resumen."}</p></details>{recovery.server && <details><summary>Ver lo guardado</summary><p className="simple-session-preline">{text(recovery.server.schoolwork)}</p><p className="simple-session-preline">{text(recovery.server.content) || text(recovery.server.sharedSummary)}</p></details>}<div className="row wrap"><button type="button" className="btn primary" onClick={() => chooseRecovery(true)}>Usar mis apuntes</button><button type="button" className="btn secondary" onClick={() => chooseRecovery(false)}>Usar lo guardado</button></div></section>}
    {error && <p className="error-text simple-session-alert" role="alert">{error}</p>}{paused && <p className="muted" role="status">Comprobando el acceso antes de guardar.</p>}
    <fieldset disabled={Boolean(recovery) || publishing || paused} className="simple-session-fields">
      <div className="simple-session-meta"><label className="field" htmlFor={`${id}-pupil`}>Alumna<select id={`${id}-pupil`} value={form.studentId} disabled={savedOnce || saving} onChange={event => edit({ studentId: event.target.value, resourceIds: [], activityIds: [], fileIds: [] })}>{(data.students || []).map((student: Item) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label><label className="field" htmlFor={`${id}-date`}>Fecha<DateInput id={`${id}-date`} required min={ACADEMY_START_DATE} value={form.date} onValueChange={date => edit({ date })}/></label></div>
      <section className="card simple-session-block"><h2><label htmlFor={`${id}-school`}>Colegio y trabajo de clase</label></h2><p className="muted simple-session-note">Solo para ti.</p><textarea id={`${id}-school`} rows={5} maxLength={20000} value={form.schoolwork} onChange={event => edit({ schoolwork: event.target.value })} placeholder="Temas, deberes o dudas del colegio."/></section>
      <section className="card simple-session-block"><h2><label htmlFor={`${id}-content`}>Lo que hemos hecho en la sesión</label></h2><p className="muted simple-session-note">{base.current.status === "realizada" ? "La alumna puede consultar este resumen." : `Se compartirá con ${pupil?.name || "la alumna"} al guardar la clase.`}</p><textarea ref={mainContent} id={`${id}-content`} rows={6} maxLength={20000} value={form.content} onChange={event => edit({ content: event.target.value })} placeholder="Un resumen breve de lo que habéis trabajado."/>
        <div className="simple-session-attachments">{[...selected, ...selectedDirect].length > 0 && <ul>{[...selected, ...selectedDirect].map(choice => <li key={`${choice.kind}:${choice.id}`}><span className="simple-session-item-icon">{choice.kind === "activityIds" ? <BookOpen size={18}/> : <FileText size={18}/>}</span><span>{choice.title}</span>{choice.url && <a className="icon-btn" href={choice.url} target="_blank" rel="noreferrer" aria-label={`Abrir ${choice.title}`}><ExternalLink size={17}/></a>}<button type="button" className="icon-btn" aria-label={`Quitar ${choice.title} de la clase`} onClick={() => edit({ [choice.kind]: form[choice.kind].filter(value => value !== choice.id) })}><X size={17}/></button></li>)}</ul>}<button type="button" className="btn secondary" onClick={() => { setQuery(""); setPicker(true); }}><Plus size={17}/>Añadir archivo o actividad</button></div>
      </section>
    </fieldset>
    {picker && <Dialog title="Añadir archivo o actividad" onClose={() => setPicker(false)} className="simple-session-picker" wide><div className="simple-session-picker-content"><label className="field">Buscar<div className="simple-session-search"><Search size={18}/><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nombre del archivo o actividad"/></div></label><div className="segmented" role="group" aria-label="Qué añadir"><button type="button" aria-pressed={pickerTab === "materials"} className={pickerTab === "materials" ? "active" : ""} onClick={() => setPickerTab("materials")}>Archivos y materiales</button><button type="button" aria-pressed={pickerTab === "activities"} className={pickerTab === "activities" ? "active" : ""} onClick={() => setPickerTab("activities")}>Actividades</button></div><div className="simple-session-choice-list">{matching.slice(0, limit).map(choice => <label key={`${choice.kind}:${choice.id}`} className="simple-session-choice"><input type="checkbox" checked={form[choice.kind].includes(choice.id)} onChange={() => toggle(choice)}/><span><strong><MathText subject={choice.subject}>{choice.title}</MathText></strong>{choice.subject && <small>{choice.subject}</small>}</span>{choice.url && <a href={choice.url} className="icon-btn" target="_blank" rel="noreferrer" aria-label={`Abrir ${choice.title}`} onClick={event => event.stopPropagation()}><ExternalLink size={17}/></a>}</label>)}{!matching.length && <p className="muted">No hay {pickerTab === "activities" ? "actividades" : "materiales"} disponibles con esta búsqueda.</p>}</div>{matching.length > limit && <button type="button" className="btn secondary" onClick={() => setLimit(value => value + 20)}>Mostrar más</button>}<div className="simple-session-picker-done"><button type="button" className="btn primary" onClick={() => setPicker(false)}>Listo</button></div></div></Dialog>}
  </div>;
}
