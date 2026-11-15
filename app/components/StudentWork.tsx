"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronDown, Clock3, CloudOff, ExternalLink, FileText, Lightbulb, LoaderCircle, Paperclip, Save, Trash2, Upload } from "lucide-react";
import Dialog from "./Dialog";
import { MaterialFiles } from "./MaterialFiles";
import { authorizedFetch } from "@/lib/client-request";
import { prepareUploadFile, UPLOAD_ACCEPT, UPLOAD_HELP } from "@/lib/client-upload";
import { useStudentDraft, type DraftValue } from "./StudentDrafts";
import { isUnread, markRead } from "./StudentReadState";
import { isMathSubject } from "@/lib/math-answer";
import MathAnswerField from "./MathAnswerField";
import { responsesForActivity, responsesForResource } from "@/lib/resource-work";
import { activitySupportLabel, activitySupportMode } from "@/lib/activity-support";
import { responseContextLabel } from "@/lib/response-context";
import MathText from "./MathText";
import "./work-simple.css";

type Item = Record<string, any>;
export const studentDate = (value?: string, withTime = false) => value ? new Date(value.includes("T") ? value : `${value.slice(0, 10)}T12:00:00`).toLocaleString("es-ES", { day: "numeric", month: "long", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" } : {}) }) : "Sin fecha";
const selfLabel: Item = { easy: "Fácil", some_doubt: "Con alguna duda", need_help: "Necesito ayuda" };
export function WorkFiles({ ids = [] }: { ids?: string[] }) { return ids.length ? <div className="sv-file-links">{ids.map((id, index) => <a key={id} href={`/api/files/${id}`} target="_blank" rel="noopener noreferrer"><Paperclip size={16}/>Archivo {index + 1}<ExternalLink size={14}/></a>)}</div> : null; }
export function ResponseStatus({ response }: { response: Item }) {
  return <div className="row wrap sw-response-status"><span className={`badge ${response.reviewStatus === "reviewed" ? "green" : "amber"}`}>{response.reviewStatus === "reviewed" ? "Revisada por el docente" : "Pendiente de revisión"}</span>{response.autoResult && <span className={`badge ${response.autoResult === "correct" ? "blue" : "amber"}`}>{response.autoResult === "correct" ? "Resultado automático correcto" : "Resultado automático para revisar"}</span>}</div>;
}
function workSubject(item: Item, activities: Item[], resources: Item[], fallback?: string) {
  const activityId = item?.sourceActivityId || item?.activityId, resourceId = item?.sourceResourceId || item?.resourceId;
  if (activityId) return activities.find(activity => activity.id === activityId)?.subject;
  if (resourceId) return resources.find(resource => resource.id === resourceId)?.subject;
  return fallback;
}
export function ResponseHistory({ responses = [], title = "Intentos y revisión docente", headingLevel = 2, activities = [], resources = [], currentActivityId, currentAssignmentId }: any) {
  const Heading = headingLevel === 3 ? "h3" : "h2", Subheading = headingLevel === 3 ? "h4" : "h3";
  const [limit, setLimit] = useState(3);
  const sorted = [...responses].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  if (!sorted.length) return null;
  return <section className="sv-stack sw-history" aria-label={title}><div className="sv-section-heading"><Heading className="sw-section-title">{title}</Heading><span className="muted sv-small">{sorted.length} {sorted.length === 1 ? "registro" : "registros"}</span></div>{sorted.slice(0, limit).map((response: Item, index: number) => <article className="card sv-pad" key={response.id}><div className="sv-card-top"><strong>{studentDate(response.createdAt, true)}</strong><ResponseStatus response={response}/>{response.reviewStatus === "reviewed" && isUnread(response.studentId, response) && <span className="badge blue">Nueva devolución</span>}</div>{responseContextLabel(response, currentActivityId, currentAssignmentId, activities) && <p className="muted sv-small">{responseContextLabel(response, currentActivityId, currentAssignmentId, activities)}</p>}{response.reviewStatus === "reviewed" && <div className="sw-feedback"><Subheading className="sw-subtitle">Revisión docente{response.result ? ` · ${response.result}` : ""}</Subheading><p className="sv-preline"><MathText subject={workSubject(response, activities, resources)}>{response.feedback || "El docente ha revisado esta respuesta sin añadir un comentario."}</MathText></p>{response.reviewedAt && <small className="muted">{studentDate(response.reviewedAt)}</small>}</div>}<details open={index === 0 && response.reviewStatus === "pending"} onToggle={event => { if (event.currentTarget.open && response.reviewStatus === "reviewed") markRead(response.studentId, [response]); }}><summary>Consultar respuesta y procedimiento</summary>{response.answer && <p className="sv-preline"><MathText subject={workSubject(response, activities, resources)}>{response.answer}</MathText></p>}{response.procedure && Object.values(response.procedure).some(Boolean) && <dl className="sw-procedure-history">{[["data", "Datos"], ["question", "Qué busco"], ["calculation", "Razonamiento y cálculo"], ["unitsAnswer", "Respuesta con unidades"]].map(([key, label]) => response.procedure[key] && <div key={key}><dt>{label}</dt><dd className="sv-preline"><MathText subject={workSubject(response, activities, resources)}>{response.procedure[key]}</MathText></dd></div>)}</dl>}<WorkFiles ids={response.fileIds}/>{response.comment && <p className="sv-preline"><strong>Comentario:</strong> {response.comment}</p>}<p className="muted sv-small">{response.selfAssessment ? `Autoevaluación: ${selfLabel[response.selfAssessment] || response.selfAssessment} · ` : ""}{response.hintsUsed?.length || 0} pistas utilizadas</p></details></article>)}{sorted.length > limit && <button className="btn secondary" onClick={() => setLimit(value => value + 5)}>Mostrar cinco registros más</button>}</section>;
}

function DraftPreview({ copy, subject, activities = [], resources = [] }: any) {
  const value = copy?.value || copy || {}, copySubject = workSubject(copy, activities, resources, subject);
  return <div className="sw-draft-preview" tabIndex={0} aria-label="Contenido de esta versión">{copy?.label && <p className="muted sv-small">{copy.label}</p>}{copy?.updatedAt && <small className="muted">{studentDate(copy.updatedAt, true)}</small>}{value.answer && <p className="sv-preline"><strong>Respuesta:</strong> <MathText subject={copySubject}>{value.answer}</MathText></p>}{value.comment && <p className="sv-preline"><strong>Comentario:</strong> {value.comment}</p>}{value.procedure && Object.entries(value.procedure).map(([field, content]) => content ? <p className="sv-preline" key={field}><strong>{({ data: "Datos", question: "Qué busco", calculation: "Cálculo", unitsAnswer: "Respuesta con unidades" } as Item)[field]}:</strong> <MathText subject={copySubject}>{String(content)}</MathText></p> : null)}<p className="muted sv-small">{value.hintsUsed?.length || 0} pistas · {value.fileIds?.length || 0} adjuntos{value.selfAssessment ? ` · ${selfLabel[value.selfAssessment] || value.selfAssessment}` : ""}</p><WorkFiles ids={value.fileIds}/></div>;
}
function DraftControls({ draft, busy, onDiscard, subject, activities = [], resources = [] }: any) {
  const [confirm, setConfirm] = useState(false), [error, setError] = useState("");
  const localOnly = /dispositivo/i.test(draft.status) || Boolean(draft.error), saving = draft.busy || /Guardando/.test(draft.status), pending = draft.dirty && !saving && !localOnly;
  const state = localOnly ? "local" : saving ? "saving" : pending ? "pending" : /guardado|recuperado/i.test(draft.status) ? "saved" : "empty";
  const Icon = localOnly ? CloudOff : saving ? LoaderCircle : pending ? Clock3 : state === "saved" ? CheckCircle2 : FileText;
  return <div className="sw-draft-controls">{draft.conflict && <div className="sw-conflict" role="alert"><h4>{draft.conflict.name || "Hay dos versiones de este borrador"}</h4><p>{draft.conflict.recovery ? "Elige si quieres recuperar esta copia. El borrador actual se conservará antes de cambiarlo." : "La versión de este dispositivo se conserva. Elige qué versión quieres continuar antes de guardar o entregar."}</p>{draft.conflict.resetsHints && <p className="muted sv-small">Esta copia procede de otro trabajo. Sus pistas se conservan en la copia original y no se contarán como ayudas utilizadas en esta actividad.</p>}<div className="grid-2"><div><strong>{draft.conflict.local?.label || (draft.conflict.recovery ? "Copia conservada" : "Este dispositivo")}</strong><DraftPreview subject={subject} activities={activities} resources={resources} copy={draft.conflict.local || { value: draft.value }}/></div><div><strong>{draft.conflict.recovery ? "Borrador actual" : "Servidor"}</strong>{draft.conflict.server ? <DraftPreview subject={subject} activities={activities} resources={resources} copy={draft.conflict.server}/> : <p>No hay un borrador abierto en el servidor para este material.</p>}</div></div><div className="row wrap"><button type="button" className="btn secondary" disabled={busy || draft.busy} onClick={() => draft.chooseVersion("local")}>{draft.conflict.recovery ? "Continuar con esta copia" : "Continuar con este dispositivo"}</button><button type="button" className="btn secondary" disabled={busy || draft.busy} onClick={() => draft.chooseVersion("server")}>{draft.conflict.recovery ? "Mantener el borrador actual" : draft.conflict.server ? "Continuar con el servidor" : "Cerrar y conservar la copia local"}</button></div></div>}<div><p className={`sw-save-status ${state}`} role="status" aria-live="polite"><Icon size={15} className={saving ? "sw-saving-icon" : undefined}/>{draft.status}</p>{draft.error && <p className="error-text" role="alert">{draft.error}</p>}{error && <p className="error-text" role="alert">{error}</p>}</div>{draft.recoveries?.length > 0 && <details className="sw-recoveries" open={!draft.hasContent && draft.recoveries.some((copy: any) => copy.label)}><summary>Copias conservadas ({draft.recoveries.length})</summary><p className="muted sv-small">Puedes restaurar otra versión. La copia actual se conservará antes de cambiarla.</p>{draft.recoveries.map((copy: any, index: number) => <div className="sw-recovery" key={[copy.clientRevision || "copy", copy.sourceActivityId || "", copy.sourceResourceId || "", index].join(":")}><strong>{studentDate(copy.updatedAt, true)}</strong><DraftPreview subject={subject} activities={activities} resources={resources} copy={copy}/><button type="button" className="btn secondary" disabled={busy || draft.busy || draft.conflict} onClick={() => draft.restoreRecovery(index)}>Restaurar esta copia</button></div>)}</details>}{draft.hasContent && <div className="row wrap"><button className="btn secondary" type="button" disabled={busy || draft.busy || draft.conflict} onClick={async () => { setError(""); try { await draft.flush(); } catch (reason: any) { setError(reason.message || "No se ha podido guardar en el servidor."); } }}><Save size={16}/>Guardar borrador</button></div>}{draft.hasContent && <details className="sw-draft-options"><summary>Opciones del borrador</summary><button className="btn quiet" type="button" disabled={busy || draft.busy || draft.conflict} onClick={() => setConfirm(true)}><Trash2 size={16}/>Descartar borrador</button>{confirm && <div className="sw-discard"><p>¿Descartar este borrador? Las entregas anteriores se conservan.</p><div className="row wrap"><button className="btn danger" type="button" disabled={busy || draft.busy} onClick={async () => { try { await draft.discard(); setConfirm(false); onDiscard?.(); } catch (reason: any) { setError(reason.message); } }}>Descartar borrador</button><button className="btn secondary" type="button" disabled={busy || draft.busy} onClick={() => setConfirm(false)}>Cancelar</button></div></div>}</details>}</div>;
}

function ProcedureFields({ value, change, subject }: { value: DraftValue; change: (value: Partial<DraftValue>) => void; subject: string }) {
  const [expanded, setExpanded] = useState(Object.values(value.procedure).some(Boolean));
  return <details className="sw-procedure" open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}><summary>Plantilla de procedimiento (opcional)</summary><p className="muted sv-small">El resultado numérico y el procedimiento se revisan por separado.</p>{[["data", "Datos con unidades"], ["question", "Qué busco"], ["calculation", "Razonamiento y cálculo"], ["unitsAnswer", "Respuesta con unidades"]].map(([key, label]) => <MathAnswerField key={key} label={label} subject={subject} multiline rows={key === "calculation" ? 4 : 2} maxLength={10000} value={value.procedure[key as keyof typeof value.procedure]} onChange={content => change({ procedure: { ...value.procedure, [key]: content } })} allowExpressions/>)}</details>;
}

function OptionalComment({ value, onChange, label = "Comentario o duda (opcional)" }: { value: string; onChange: (value: string) => void; label?: string }) {
  const [expanded, setExpanded] = useState(Boolean(value));
  const hasComment = Boolean(value);
  useEffect(() => { if (hasComment) setExpanded(true); }, [hasComment]);
  return <details className="sw-simple-details" open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}><summary>{label}</summary><label className="field"><span className="sr-only">{label}</span><textarea rows={2} maxLength={2000} value={value} onChange={event => onChange(event.target.value)}/></label></details>;
}

function UploadFormats() {
  return <details className="sw-simple-details sw-upload-formats"><summary>Formatos admitidos</summary><p className="muted sv-small">{UPLOAD_HELP}</p></details>;
}

async function uploadWork(file: File, studentId: string) {
  const uploadId = crypto.randomUUID(), prepared = await prepareUploadFile(file);
  const body = new FormData(); body.set("file", prepared); body.set("studentId", studentId); body.set("uploadId", uploadId);
  const response = await authorizedFetch("/api/files", { method: "POST", body });
  const result: any = await response.json(); if (!response.ok) throw new Error(result.error || "No se ha podido adjuntar el archivo."); return result;
}

function ClosedAnswer({ type, value, onChange, subject }: { type: string; value: string; onChange: (value: string) => void; subject: string }) {
  const mathematical = type === "numeric" || type === "fraction";
  return <MathAnswerField label={type === "fraction" ? "Fracción (por ejemplo, 2/3)" : type === "numeric" ? "Resultado en la unidad indicada" : "Respuesta exacta, conservando las tildes"} subject={subject} value={value} onChange={onChange} maxLength={1000} inputMode={mathematical ? "decimal" : "text"} allowExpressions={!mathematical}/>;
}

export function StudentActivityDetail({ activity, assignment, student, data, act, notify, onBack, backLabel="Volver a practicar" }: any) {
  const resource = (data.resources || []).find((item: Item) => item.id === activity.resourceId);
  const draft = useStudentDraft({ studentId: student.id, activityId: activity.id }, data.drafts || [], act, resource ? [{ studentId: student.id, resourceId: resource.id, label: "Borrador anterior del recurso" }, ...(data.activities || []).filter((item: Item) => item.resourceId === resource.id && item.id !== activity.id).map((item: Item) => ({ studentId: student.id, activityId: item.id, label: `Borrador de «${item.title}»` }))] : []);
  const { value } = draft;
  const [busy, setBusy] = useState(false), [uploading, setUploading] = useState(false), [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null), answerArea = useRef<HTMLFormElement>(null), lastHint = useRef<HTMLDivElement>(null), focusHint = useRef(false), historySection = useRef<HTMLDetailsElement>(null);
  const hints: string[] = activity.hints || [], hintsUsed = value.hintsUsed.filter(index => Number.isInteger(index) && index >= 0 && index < hints.length);
  const responses = responsesForActivity(activity, student.id, data.responses || [], data.activities || []);
  const latest = [...responses].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0];
  useEffect(() => { if (latest?.reviewStatus === "reviewed") markRead(student.id, [latest]); }, [latest?.id, latest?.reviewedAt]);
  const closed = ["choice", "numeric", "fraction", "text"].includes(activity.type);
  const hasResponse = value.answer.trim() || (!closed && (value.fileIds.length || Object.values(value.procedure).some(item => item.trim())));
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [activity.id]);
  useEffect(() => { if (focusHint.current) { lastHint.current?.focus({ preventScroll: true }); lastHint.current?.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); focusHint.current = false; } }, [hintsUsed.length]);
  const leave = async () => { if (busy || uploading || (draft as any).busy) return; try { await draft.flush(); onBack(); } catch { if (draft.canLeave()) { onBack(); } else setError("No se ha podido cerrar el guardado. Reintenta antes de salir."); } };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!hasResponse || !value.selfAssessment || busy || (draft as any).busy || (draft as any).conflict) return;
    setBusy(true); setError("");
    try { await draft.flush(); draft.pause(); const result = await act("submitResponse", { ...(assignment ? { assignmentId: assignment.id } : { activityId: activity.id }), ...value, hintsUsed, submissionId: draft.submissionId, draftRevision: draft.getDraftRevision() }); draft.complete(result); notify("Respuesta entregada."); requestAnimationFrame(() => heading.current?.focus({ preventScroll: true })); }
    catch (reason: any) { draft.resume(); setError(reason.message || "No se ha confirmado la entrega. El borrador se conserva para reintentar."); }
    finally { setBusy(false); }
  };
  return <div className="student-views sv-stack sw-simple-work">
    <button className="btn quiet sv-back" disabled={busy || uploading || Boolean(draft.busy)} onClick={leave}><ArrowLeft size={17}/>{backLabel}</button>
    <div className="sv-detail-heading">
      <div className="row wrap">
        <span className="sv-subject"><BookOpen size={14}/>{activity.subject}</span>
        <span className="badge blue">{assignment?.category || "Opcional"}</span>
        {activitySupportMode(activity.supportMode) !== "independent" && <span className={`badge ${activitySupportMode(activity.supportMode) === "teacher" ? "amber" : "blue"}`}>{activitySupportLabel(activity.supportMode)}</span>}
        {draft.recovered && draft.hasContent && <span className="badge">Borrador recuperado</span>}
      </div>
      <h1 ref={heading} tabIndex={-1}><MathText subject={activity.subject}>{activity.title}</MathText></h1>
      {activitySupportMode(activity.supportMode) === "teacher" && <p className="sw-support-note">Para hacer en clase con el docente.</p>}
      <details className="sw-simple-details sw-exercise-details">
        <summary>Detalles del ejercicio</summary>
        {activity.objective && <p><MathText subject={activity.subject}>{activity.objective}</MathText></p>}
        <div className="sv-detail-meta"><span><Clock3 size={16}/>{activity.duration ? `${activity.duration} min aproximadamente` : "Sin tiempo fijado"}</span><span>{student.level || activity.level?.split("·")[0]?.trim() || "Nivel por indicar"}</span></div>
        <p className="muted sv-small"><strong>Cómo se comprueba:</strong> {activity.checkMethod || activity.check || "Revisión docente de la respuesta."}</p>
        {resource && <p className="muted sv-small">Este trabajo y sus entregas se guardan en Practicar.</p>}
      </details>
    </div>
    {latest && <div className="card sv-pad sw-last-review">
      <h2 className="sw-section-title">{latest.reviewStatus === "reviewed" ? "Última revisión docente" : "Último intento"}</h2>
      <ResponseStatus response={latest}/>
      {responseContextLabel(latest, activity.id, assignment?.id, data.activities || []) && <p className="muted sv-small">{responseContextLabel(latest, activity.id, assignment?.id, data.activities || [])}</p>}
      {latest.feedback && <p className="sv-preline">{latest.feedback}</p>}
      <a className="btn quiet" href="#activity-history" onClick={() => { if (historySection.current) historySection.current.open = true; }}>Consultar todos los intentos<ArrowRight size={16}/></a>
    </div>}
    <section className="card sv-pad">
      <h2 className="sw-section-title"><FileText size={19}/>Consigna</h2>
      {resource && <MaterialFiles resource={resource} files={data.files || []}/>}
      <p className="sv-preline sv-instructions"><MathText subject={activity.subject}>{activity.instructions}</MathText></p>
      {activity.type === "external" && (activity.url || resource?.url) && <a className="btn primary" href={activity.url || resource?.url} target="_blank" rel="noopener noreferrer">Abrir recurso externo<ExternalLink size={16}/></a>}
      {activity.type === "external" && <p className="muted sv-small">La web externa no comunica sus aciertos a la academia.</p>}
      {activity.materials && <div className="sv-inset"><strong>Materiales</strong><p><MathText subject={activity.subject}>{Array.isArray(activity.materials) ? activity.materials.join(" · ") : activity.materials}</MathText></p></div>}
      {activity.explanation && <details className="sw-simple-details sw-reference"><summary>Explicación de referencia</summary><p className="sv-preline"><MathText subject={activity.subject}>{activity.explanation}</MathText></p></details>}
    </section>
    <form ref={answerArea} id="activity-answer" tabIndex={-1} className="card sv-pad sv-answer-form" onSubmit={submit} aria-labelledby="activity-answer-title">
      <h2 className="sw-section-title" id="activity-answer-title">{assignment && !responses.some((item: Item) => item.assignmentId === assignment.id) ? "Respuesta del encargo actual" : responses.length ? "Nuevo intento" : "Respuesta"}</h2>
      <fieldset disabled={busy || uploading || Boolean(draft.busy) || Boolean(draft.conflict)} className="sw-editor-fields">
        {activity.type === "choice" && activity.options?.length ? <fieldset className="sv-options"><legend className="sr-only">Elige una respuesta</legend>{activity.options.map((option: any, index: number) => { const label = typeof option === "string" ? option : option.label || option.value; return <label key={index} className={value.answer === String(label) ? "selected" : ""}><input type="radio" name="answer" required value={String(label)} checked={value.answer === String(label)} onChange={event => draft.setValue({ answer: event.target.value })}/><span><MathText subject={activity.subject}>{label}</MathText></span></label>; })}</fieldset> : closed ? <ClosedAnswer subject={activity.subject} type={activity.type} value={value.answer} onChange={answer => draft.setValue({ answer })}/> : <MathAnswerField label="Respuesta y explicación" subject={activity.subject} multiline rows={6} maxLength={20000} value={value.answer} onChange={answer => draft.setValue({ answer })} allowExpressions/>}
        {isMathSubject(activity.subject) && <ProcedureFields subject={activity.subject} value={value} change={draft.setValue}/>}
        {hints.length > 0 && <section id="activity-hints" className="sw-inline-hints" aria-label="Pistas">
          <div className="row wrap"><button type="button" className="btn secondary" disabled={busy || uploading || draft.busy || Boolean(draft.conflict) || hintsUsed.length >= hints.length} onClick={() => { focusHint.current = true; const next = hints.findIndex((_, index) => !hintsUsed.includes(index)); if (next >= 0) draft.setValue({ hintsUsed: [...hintsUsed, next] }); }}><Lightbulb size={17}/>{hintsUsed.length >= hints.length ? "Todas las pistas consultadas" : hintsUsed.length ? "Ver otra pista" : "Necesito una pista"}<ChevronDown size={16}/></button><small className="muted">Sin penalización.</small></div>
          <span className="sr-only" role="status">{hintsUsed.length ? `Pista ${hintsUsed.length} disponible.` : ""}</span>
          {hintsUsed.length > 0 && <div className="sv-hint-list">{hintsUsed.map((index, position) => <div key={index} ref={position === hintsUsed.length - 1 ? lastHint : undefined} tabIndex={-1}><span>Pista {index + 1}</span><p><MathText subject={activity.subject}>{hints[index]}</MathText></p></div>)}</div>}
        </section>}
        <label className="sv-upload"><Upload size={17}/>{uploading ? "Adjuntando…" : "Adjuntar trabajo"}<input type="file" accept={UPLOAD_ACCEPT} onChange={async event => { const file = event.target.files?.[0]; if (!file) return; if (value.fileIds.length >= 8) { setError("Máximo ocho adjuntos por borrador."); event.target.value = ""; return; } setUploading(true); setError(""); try { const result = await uploadWork(file, student.id); draft.setValue({ fileIds: [...value.fileIds, result.id] }); } catch (reason: any) { setError(reason.message); } finally { setUploading(false); event.target.value = ""; } }}/></label>
        <UploadFormats/>
        <WorkFiles ids={value.fileIds}/>
        {value.fileIds.length > 0 && <button className="btn quiet" type="button" onClick={() => draft.setValue({ fileIds: [] })}>Quitar adjuntos de este borrador</button>}
        <fieldset className="sv-self-assessment"><legend>Autoevaluación</legend><div>{[{ id: "easy", label: "Fácil" }, { id: "some_doubt", label: "Con alguna duda" }, { id: "need_help", label: "Necesito ayuda" }].map(option => <label key={option.id} className={value.selfAssessment === option.id || value.selfAssessment === option.label ? "selected" : ""}><input required type="radio" name="selfAssessment" value={option.id} checked={value.selfAssessment === option.id || value.selfAssessment === option.label} onChange={event => draft.setValue({ selfAssessment: event.target.value })}/>{option.label}</label>)}</div></fieldset>
        <OptionalComment value={value.comment} onChange={comment => draft.setValue({ comment })}/>
      </fieldset>
      <DraftControls subject={activity.subject} activities={data.activities || []} resources={data.resources || []} draft={draft} busy={busy || uploading} onDiscard={() => answerArea.current?.focus({ preventScroll: true })}/>
      {error && <p role="alert" className="error-text">{error}</p>}
      <button className="btn primary" disabled={busy || uploading || Boolean(draft.busy) || Boolean(draft.conflict) || !hasResponse || !value.selfAssessment}>{busy ? "Entregando…" : "Entregar este intento"}<ArrowRight size={17}/></button>
    </form>
    {responses.length > 0 && <details ref={historySection} id="activity-history" tabIndex={-1} className="sw-simple-details sw-history-collapse"><summary>Historial de intentos ({responses.length})</summary><ResponseHistory responses={responses} title={resource ? "Entregas y revisión del recurso" : "Intentos y revisión docente"} activities={data.activities || []} resources={data.resources || []} currentActivityId={activity.id} currentAssignmentId={assignment?.id}/></details>}
  </div>;
}

export function StudentResourceDialog({ resource, student, data, act, notify, onClose }: any) {
  const draft = useStudentDraft({ studentId: student.id, resourceId: resource.id }, data.drafts || [], act);
  const { value } = draft;
  const [busy, setBusy] = useState(false), [uploading, setUploading] = useState(false), [error, setError] = useState("");
  const history = responsesForResource(resource.id, student.id, data.responses || [], data.activities || []);
  const latestReview = [...history].filter((item: Item) => item.reviewStatus === "reviewed").sort((a: Item, b: Item) => (b.reviewedAt || b.createdAt).localeCompare(a.reviewedAt || a.createdAt))[0];
  useEffect(() => { if (latestReview) markRead(student.id, [latestReview]); }, [latestReview?.id, latestReview?.reviewedAt]);
  const leave = async () => { if (busy || uploading || (draft as any).busy) return; try { await draft.flush(); onClose(); } catch { if (draft.canLeave()) onClose(); else setError("No se ha podido guardar el borrador. Reintenta antes de cerrar."); } };
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); setError(""); try { await draft.flush(); draft.pause(); const result = await act("useResource", { resourceId: resource.id, ...value, submissionId: draft.submissionId, draftRevision: draft.getDraftRevision() }); draft.complete(result); notify("Uso del recurso y respuesta guardados."); } catch (reason: any) { draft.resume(); setError(reason.message || "No se ha confirmado el registro. El borrador se conserva."); } finally { setBusy(false); } };
  return <Dialog title={<MathText subject={resource.subject}>{resource.title}</MathText>} className="sw-resource-dialog student-views sw-simple-resource" onClose={leave} wide><div className="sv-stack">{latestReview && <section className="sw-feedback"><h3>Última revisión docente</h3><p className="sv-preline">{latestReview.feedback || latestReview.result || "Revisión disponible."}</p><small className="muted">{studentDate(latestReview.reviewedAt || latestReview.createdAt)}</small></section>}<section><span className={`badge ${activitySupportMode(resource.supportMode) === "teacher" ? "amber" : "blue"}`}>{activitySupportLabel(resource.supportMode)}</span>{activitySupportMode(resource.supportMode) === "teacher" && <p className="sw-support-note">Este recurso necesita al docente para la actividad propuesta.</p>}<span className="eyebrow">CONSIGNA</span><p className="sv-preline"><MathText subject={resource.subject}>{resource.instructions || resource.description}</MathText></p>{resource.url && <a className="btn primary" href={resource.url} target="_blank" rel="noopener noreferrer">Abrir recurso externo<ExternalLink size={16}/></a>}<MaterialFiles resource={resource} files={data.files || []}/><p className="muted sv-small">Sus aciertos externos no se importan. Guarda aquí la respuesta o el resultado que quieras revisar.</p></section><form className="sv-stack" onSubmit={submit}><fieldset disabled={busy || uploading || Boolean((draft as any).busy) || Boolean((draft as any).conflict)} className="sw-editor-fields"><MathAnswerField label="Respuesta, resultado o duda" subject={resource.subject} multiline rows={5} maxLength={20000} value={value.answer} onChange={answer => draft.setValue({ answer })} allowExpressions/>{isMathSubject(resource.subject) && <ProcedureFields subject={resource.subject} value={value} change={draft.setValue}/>}<OptionalComment value={value.comment} onChange={comment => draft.setValue({ comment })} label="Comentario (opcional)"/><label className="sv-upload"><Upload size={17}/>{uploading ? "Adjuntando…" : "Adjuntar resultado"}<input type="file" accept={UPLOAD_ACCEPT} onChange={async event => { const file = event.target.files?.[0]; if (!file) return; if (value.fileIds.length >= 8) { setError("Máximo ocho adjuntos por borrador."); event.target.value = ""; return; } setUploading(true); try { const result = await uploadWork(file, student.id); draft.setValue({ fileIds: [...value.fileIds, result.id] }); } catch (reason: any) { setError(reason.message); } finally { setUploading(false); event.target.value = ""; } }}/></label><UploadFormats/><WorkFiles ids={value.fileIds}/></fieldset><DraftControls subject={resource.subject} activities={data.activities || []} resources={data.resources || []} draft={draft} busy={busy || uploading}/>{error && <p role="alert" className="error-text">{error}</p>}<div className="row wrap"><button className="btn primary" disabled={busy || uploading || Boolean((draft as any).busy) || Boolean((draft as any).conflict)}><Check size={17}/>{busy ? "Registrando…" : "Registrar uso y entregar respuesta"}</button><button className="btn secondary" type="button" disabled={busy || uploading || Boolean((draft as any).busy)} onClick={leave}>Cerrar</button></div></form>{history.length > 0 && <details className="sw-simple-details sw-history-collapse"><summary>Historial de entregas ({history.length})</summary><ResponseHistory responses={history} title="Entregas y revisión del recurso" headingLevel={3} activities={data.activities || []} resources={data.resources || []}/></details>}</div></Dialog>;
}
