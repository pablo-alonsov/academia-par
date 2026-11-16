"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ExternalLink, Lightbulb, LoaderCircle, Paperclip } from "lucide-react";
import Dialog from "./Dialog";
import { MaterialFiles } from "./MaterialFiles";
import { useStudentDraft, type DraftValue } from "./StudentDrafts";
import { isUnread, markRead } from "./StudentReadState";
import MathAnswerField from "./MathAnswerField";
import { responsesForActivity, responsesForResource } from "@/lib/resource-work";
import { responseContextLabel } from "@/lib/response-context";
import MathText from "./MathText";
import "./work-simple.css";

type Item = Record<string, any>;
export const studentDate = (value?: string, withTime = false) => value ? new Date(value.includes("T") ? value : `${value.slice(0, 10)}T12:00:00`).toLocaleString("es-ES", { day: "numeric", month: "long", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" } : {}) }) : "Sin fecha";
const selfLabel: Item = { easy: "Fácil", some_doubt: "Con alguna duda", need_help: "Necesito ayuda" };
export function WorkFiles({ ids = [] }: { ids?: string[] }) { return ids.length ? <div className="sv-file-links">{ids.map((id, index) => <a key={id} href={`/api/files/${id}`} target="_blank" rel="noopener noreferrer"><Paperclip size={16}/>Archivo {index + 1}<ExternalLink size={14}/></a>)}</div> : null; }
export function ResponseStatus({ response }: { response: Item }) {
  const reviewed = response.reviewStatus === "reviewed";
  const label = reviewed ? "Revisada" : response.autoResult === "correct" ? "Resultado correcto" : response.autoResult === "incorrect" ? "Para revisar en clase" : "Respuesta guardada";
  return <span className={`badge ${reviewed || response.autoResult === "correct" ? "green" : response.autoResult === "incorrect" ? "amber" : "blue"}`}>{label}</span>;
}
function workSubject(item: Item, activities: Item[], resources: Item[], fallback?: string) {
  const activityId = item?.sourceActivityId || item?.activityId, resourceId = item?.sourceResourceId || item?.resourceId;
  if (activityId) return activities.find(activity => activity.id === activityId)?.subject;
  if (resourceId) return resources.find(resource => resource.id === resourceId)?.subject;
  return fallback;
}
export function ResponseHistory({ responses = [], title = "Respuestas anteriores", headingLevel = 2, activities = [], resources = [], currentActivityId, currentAssignmentId }: any) {
  const Heading = headingLevel === 3 ? "h3" : "h2", Subheading = headingLevel === 3 ? "h4" : "h3";
  const [limit, setLimit] = useState(3);
  const sorted = [...responses].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  if (!sorted.length) return null;
  return <section className="sv-stack sw-history" aria-label={title}><div className="sv-section-heading"><Heading className="sw-section-title">{title}</Heading><span className="muted sv-small">{sorted.length} {sorted.length === 1 ? "registro" : "registros"}</span></div>{sorted.slice(0, limit).map((response: Item, index: number) => <article className="card sv-pad" key={response.id}><div className="sv-card-top"><strong>{studentDate(response.createdAt, true)}</strong><ResponseStatus response={response}/>{response.reviewStatus === "reviewed" && isUnread(response.studentId, response) && <span className="badge blue">Revisión nueva</span>}</div>{responseContextLabel(response, currentActivityId, currentAssignmentId, activities) && <p className="muted sv-small">{responseContextLabel(response, currentActivityId, currentAssignmentId, activities)}</p>}{response.reviewStatus === "reviewed" && <div className="sw-feedback"><Subheading className="sw-subtitle">Revisión docente{response.result ? ` · ${response.result}` : ""}</Subheading><p className="sv-preline"><MathText subject={workSubject(response, activities, resources)}>{response.feedback || "El docente ha revisado esta respuesta sin añadir un comentario."}</MathText></p>{response.reviewedAt && <small className="muted">{studentDate(response.reviewedAt)}</small>}</div>}<details open={index === 0 && response.reviewStatus === "pending"} onToggle={event => { if (event.currentTarget.open && response.reviewStatus === "reviewed") markRead(response.studentId, [response]); }}><summary>Ver respuesta</summary>{response.answer && <p className="sv-preline"><MathText subject={workSubject(response, activities, resources)}>{response.answer}</MathText></p>}{response.procedure && Object.values(response.procedure).some(Boolean) && <dl className="sw-procedure-history">{[["data", "Datos"], ["question", "Qué busco"], ["calculation", "Razonamiento y cálculo"], ["unitsAnswer", "Respuesta con unidades"]].map(([key, label]) => response.procedure[key] && <div key={key}><dt>{label}</dt><dd className="sv-preline"><MathText subject={workSubject(response, activities, resources)}>{response.procedure[key]}</MathText></dd></div>)}</dl>}<WorkFiles ids={response.fileIds}/>{response.comment && <p className="sv-preline"><strong>Comentario:</strong> {response.comment}</p>}{(response.selfAssessment || response.hintsUsed?.length > 0) && <p className="muted sv-small">{response.selfAssessment ? `Autoevaluación anterior: ${selfLabel[response.selfAssessment] || response.selfAssessment}` : ""}{response.selfAssessment && response.hintsUsed?.length > 0 ? " · " : ""}{response.hintsUsed?.length > 0 ? `${response.hintsUsed.length} pistas consultadas` : ""}</p>}</details></article>)}{sorted.length > limit && <button className="btn secondary" onClick={() => setLimit(value => value + 5)}>Mostrar cinco registros más</button>}</section>;
}

function SavedResponsePreview({ copy, subject, activities = [], resources = [] }: any) {
  const value = copy?.value || copy || {}, copySubject = workSubject(copy, activities, resources, subject);
  return <div className="sw-draft-preview" tabIndex={0} aria-label="Contenido de esta respuesta">
    {copy?.updatedAt && <small className="muted">{studentDate(copy.updatedAt, true)}</small>}
    {value.answer && <p className="sv-preline"><MathText subject={copySubject}>{value.answer}</MathText></p>}
    {value.comment && <p className="sv-preline"><strong>Nota anterior:</strong> {value.comment}</p>}
    {value.procedure && Object.entries(value.procedure).map(([field, content]) => content ? <p className="sv-preline" key={field}><strong>{({data:"Datos",question:"Qué busco",calculation:"Cálculo",unitsAnswer:"Respuesta con unidades"} as Item)[field]}:</strong> <MathText subject={copySubject}>{String(content)}</MathText></p> : null)}
    <WorkFiles ids={value.fileIds}/>
  </div>;
}

// Recovery is available only when there is existing work or a real save problem.
// Normal exercises do not expose draft management, uploads or extra forms.
function ResponseSaving({ draft, busy, subject, activities = [], resources = [] }: any) {
  const [error, setError] = useState("");
  const retry = async () => { setError(""); try { await draft.flush(); } catch { setError("No se ha podido terminar el guardado. Reinténtalo antes de cerrar."); } };
  if (!draft.hasContent && !draft.conflict && !draft.error && !error && !draft.recoveries?.length) return null;
  return <div className="sw-response-saving">
    {draft.conflict && <section className="sw-conflict" role="alert">
      <h3>Hay dos respuestas guardadas</h3><p>Elige con cuál quieres continuar. La otra se conservará.</p>
      <div className="grid-2"><div><strong>{draft.conflict.recovery ? "Respuesta anterior" : "En este dispositivo"}</strong><SavedResponsePreview subject={subject} activities={activities} resources={resources} copy={draft.conflict.local || {value:draft.value}}/></div><div><strong>Respuesta actual</strong>{draft.conflict.server ? <SavedResponsePreview subject={subject} activities={activities} resources={resources} copy={draft.conflict.server}/> : <p>No hay otra respuesta pendiente.</p>}</div></div>
      <div className="row wrap"><button type="button" className="btn secondary" disabled={busy || draft.busy} onClick={()=>draft.chooseVersion("local")}>Usar esta respuesta</button><button type="button" className="btn secondary" disabled={busy || draft.busy} onClick={()=>draft.chooseVersion("server")}>{draft.conflict.server ? "Usar la respuesta actual" : "Continuar sin recuperar"}</button></div>
    </section>}
    {!draft.conflict && draft.hasContent && <small className="sw-save-status" role="status">{draft.error ? draft.canLeave() ? "Conservado en este dispositivo" : "Guardado pendiente" : draft.dirty || draft.busy ? <><LoaderCircle size={14} className="sw-saving-icon"/>Guardando…</> : <><Check size={14}/>Guardado automáticamente</>}</small>}
    {(draft.error || error) && <div className="sw-save-problem" role="alert"><p>{error || (draft.conflict ? draft.error.replace(/borrador/gi,"trabajo") : "El guardado no ha terminado. Reinténtalo antes de cerrar.")}</p>{!draft.conflict && <button type="button" className="btn secondary" disabled={busy || draft.busy} onClick={retry}>Reintentar guardado</button>}</div>}
    {draft.recoveries?.length > 0 && <details className="sw-simple-details sw-recoveries"><summary>Respuestas guardadas anteriormente</summary>{draft.recoveries.map((copy: any,index: number)=><div className="sw-recovery" key={[copy.clientRevision || "copy",index].join(":")}><SavedResponsePreview subject={subject} activities={activities} resources={resources} copy={copy}/><button type="button" className="btn secondary" disabled={busy || draft.busy || draft.conflict} onClick={()=>draft.restoreRecovery(index)}>Recuperar esta respuesta</button></div>)}</details>}
  </div>;
}

function PreviousWork({ value, subject }: {value:DraftValue;subject:string}) {
  return value.comment || value.fileIds.length || Object.values(value.procedure).some(Boolean) ? <details className="sw-simple-details sw-previous-work"><summary>Trabajo anterior guardado</summary><SavedResponsePreview copy={value} subject={subject}/></details> : null;
}

function ClosedAnswer({ type, value, onChange, subject }: {type:string;value:string;onChange:(value:string)=>void;subject:string}) {
  const mathematical = type === "numeric" || type === "fraction";
  return <MathAnswerField label="Tu respuesta" subject={subject} value={value} onChange={onChange} maxLength={1000} inputMode={mathematical ? "decimal" : "text"} allowExpressions={!mathematical}/>;
}

export function StudentActivityDetail({ activity, assignment, student, data, act, notify, onBack, backLabel="Volver a practicar" }: any) {
  const resource = (data.resources || []).find((item:Item)=>item.id===activity.resourceId);
  const draft = useStudentDraft({studentId:student.id,activityId:activity.id},data.drafts || [],act,resource ? [{studentId:student.id,resourceId:resource.id,label:"Respuesta anterior del recurso"},...(data.activities || []).filter((item:Item)=>item.resourceId===resource.id && item.id!==activity.id).map((item:Item)=>({studentId:student.id,activityId:item.id,label:`Respuesta de «${item.title}»`}))] : []);
  const {value} = draft;
  const [busy,setBusy] = useState(false),[error,setError] = useState(""),[confirmation,setConfirmation] = useState<Item|null>(null);
  const heading=useRef<HTMLHeadingElement>(null),lastHint=useRef<HTMLDivElement>(null),focusHint=useRef(false),historySection=useRef<HTMLDetailsElement>(null);
  const hints:string[]=activity.hints || [],hintsUsed=value.hintsUsed.filter(index=>Number.isInteger(index)&&index>=0&&index<hints.length);
  const responses=responsesForActivity(activity,student.id,data.responses || [],data.activities || []);
  const latest=[...responses].sort((a,b)=>(b.createdAt || "").localeCompare(a.createdAt || ""))[0];
  const closed=["choice","numeric","fraction","text"].includes(activity.type);
  const canCheck=["choice","numeric","fraction"].includes(activity.type) || activity.type==="text" && activity.autoCheck===true;
  const hasResponse=Boolean(value.answer.trim() || !closed && (value.fileIds.length || Object.values(value.procedure).some(item=>item.trim())));
  const changeAnswer=(answer:string)=>{setConfirmation(null);setError("");draft.setValue({answer})};
  useEffect(()=>{heading.current?.focus({preventScroll:true})},[activity.id]);
  useEffect(()=>{if(latest?.reviewStatus==="reviewed")markRead(student.id,[latest])},[latest?.id,latest?.reviewedAt]);
  useEffect(()=>{if(focusHint.current){lastHint.current?.focus({preventScroll:true});lastHint.current?.scrollIntoView({block:"nearest",behavior:"auto"});focusHint.current=false}},[hintsUsed.length]);
  const leave=async()=>{if(busy || draft.busy)return;try{await draft.flush();onBack()}catch{if(draft.canLeave())onBack();else setError("No se ha podido terminar el guardado. Reinténtalo antes de salir.")}};
  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();if(!hasResponse || busy || draft.busy || draft.conflict)return;
    setBusy(true);setError("");
    try{await draft.flush();draft.pause();const result=await act("submitResponse",{...(assignment?{assignmentId:assignment.id}:{activityId:activity.id}),...value,hintsUsed,submissionId:draft.submissionId,draftRevision:draft.getDraftRevision()});draft.complete(result);setConfirmation({...result,answer:value.answer});requestAnimationFrame(()=>heading.current?.focus({preventScroll:true}));notify(result.autoResult==="correct"?"Respuesta correcta y guardada.":result.autoResult==="incorrect"?"Respuesta guardada. Revisa el resultado.":"Respuesta guardada.")}
    catch(reason:any){draft.resume();setError(String(reason.message || "No se ha podido guardar la respuesta. El texto se conserva para volver a intentarlo.").replace(/borrador/gi,"trabajo"))}
    finally{setBusy(false)}
  };
  const showDetails=activity.objective || activity.materials || activity.explanation;
  return <div className="student-views sv-stack sw-simple-work sw-classroom-work">
    <button className="btn quiet sv-back" disabled={busy || draft.busy} onClick={leave}><ArrowLeft size={17}/>{backLabel}</button>
    <div className="sv-detail-heading"><div className="row wrap"><span className="sv-subject"><BookOpen size={14}/>{activity.subject}</span></div><h1 ref={heading} tabIndex={-1}><MathText subject={activity.subject}>{activity.title}</MathText></h1></div>
    <form id="activity-answer" className="card sv-pad sw-classroom-form" onSubmit={submit} aria-label="Resolver el ejercicio">
      <section className="sw-classroom-instructions" aria-label="Enunciado">{resource && <MaterialFiles resource={resource} files={data.files || []}/>}<p className="sv-preline sv-instructions"><MathText subject={activity.subject}>{activity.instructions}</MathText></p>{activity.type==="external" && (activity.url || resource?.url) && <a className="btn secondary" href={activity.url || resource?.url} target="_blank" rel="noopener noreferrer">Abrir recurso<ExternalLink size={16}/></a>}</section>
      <fieldset disabled={busy || draft.busy || Boolean(draft.conflict)} className="sw-editor-fields">
        {activity.type==="choice" && activity.options?.length ? <fieldset className="sv-options"><legend>Elige tu respuesta</legend>{activity.options.map((option:any,index:number)=>{const label=typeof option==="string"?option:option.label || option.value;return <label key={index} className={value.answer===String(label)?"selected":""}><input type="radio" name="answer" required value={String(label)} checked={value.answer===String(label)} onChange={event=>changeAnswer(event.target.value)}/><span><MathText subject={activity.subject}>{label}</MathText></span></label>})}</fieldset> : closed ? <ClosedAnswer subject={activity.subject} type={activity.type} value={value.answer} onChange={changeAnswer}/> : <MathAnswerField label="Tu respuesta" subject={activity.subject} multiline rows={5} maxLength={20000} value={value.answer} onChange={changeAnswer} allowExpressions/>}
      </fieldset>
      <PreviousWork value={value} subject={activity.subject}/>
      <ResponseSaving subject={activity.subject} activities={data.activities || []} resources={data.resources || []} draft={draft} busy={busy}/>
      {error && <p role="alert" className="error-text">{error}</p>}
      <div className="sw-classroom-actions">{(activity.type!=="paper" || hasResponse) && <button className="btn primary" disabled={busy || draft.busy || Boolean(draft.conflict) || !hasResponse}>{busy?"Guardando…":canCheck?"Comprobar respuesta":"Guardar respuesta"}<ArrowRight size={17}/></button>}{hints.length>0 && <button type="button" className="btn quiet" disabled={busy || draft.busy || Boolean(draft.conflict) || hintsUsed.length>=hints.length} onClick={()=>{focusHint.current=true;const next=hints.findIndex((_,index)=>!hintsUsed.includes(index));if(next>=0)draft.setValue({hintsUsed:[...hintsUsed,next]})}}><Lightbulb size={17}/>{hintsUsed.length>=hints.length?"Pistas consultadas":hintsUsed.length?"Otra pista":"Ver pista"}</button>}</div>
      {confirmation && <div className={`sw-answer-result ${confirmation.autoResult==="incorrect"?"review":""}`} role="status"><CheckCircle2 size={19}/><div>{confirmation.answer && <strong><MathText subject={activity.subject}>{confirmation.answer}</MathText></strong>}<p>{confirmation.autoResult==="correct"?"Respuesta correcta.":confirmation.autoResult==="incorrect"?"Revisa el resultado. Puedes intentarlo de nuevo.":"Respuesta guardada. La revisaremos en clase."}</p></div></div>}
      {hintsUsed.length>0 && <section className="sv-hint-list" aria-label="Pistas consultadas">{hintsUsed.map((index,position)=><div key={index} ref={position===hintsUsed.length-1?lastHint:undefined} tabIndex={-1}><span>Pista {index+1}</span><p><MathText subject={activity.subject}>{hints[index]}</MathText></p></div>)}</section>}
    </form>
    {latest?.reviewStatus==="reviewed" && latest.feedback && <section className="sw-feedback"><h2 className="sw-section-title">Revisión</h2><p className="sv-preline"><MathText subject={activity.subject}>{latest.feedback}</MathText></p></section>}
    {responses.length>0 && <details ref={historySection} id="activity-history" tabIndex={-1} className="sw-simple-details sw-history-collapse"><summary>Respuestas anteriores ({responses.length})</summary><ResponseHistory responses={responses} activities={data.activities || []} resources={data.resources || []} currentActivityId={activity.id} currentAssignmentId={assignment?.id}/></details>}
    {showDetails && <details className="sw-simple-details sw-exercise-details"><summary>Sobre este ejercicio</summary>{activity.objective && <p><MathText subject={activity.subject}>{activity.objective}</MathText></p>}{activity.materials && <p className="muted"><MathText subject={activity.subject}>{Array.isArray(activity.materials)?activity.materials.join(" · "):activity.materials}</MathText></p>}{activity.explanation && <p className="sv-preline"><MathText subject={activity.subject}>{activity.explanation}</MathText></p>}</details>}
  </div>;
}

export function StudentResourceDialog({resource,student,data,act,notify,onClose}:any) {
  const draft=useStudentDraft({studentId:student.id,resourceId:resource.id},data.drafts || [],act),{value}=draft;
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const history=responsesForResource(resource.id,student.id,data.responses || [],data.activities || []);
  const latestReview=[...history].filter((item:Item)=>item.reviewStatus==="reviewed").sort((a:Item,b:Item)=>(b.reviewedAt || b.createdAt).localeCompare(a.reviewedAt || a.createdAt))[0];
  useEffect(()=>{if(latestReview)markRead(student.id,[latestReview])},[latestReview?.id,latestReview?.reviewedAt]);
  const leave=async()=>{if(busy || draft.busy)return;try{await draft.flush();onClose()}catch{if(draft.canLeave())onClose();else setError("No se ha podido terminar el guardado. Reinténtalo antes de cerrar.")}};
  const hasResponse=Boolean(value.answer.trim() || value.fileIds.length || Object.values(value.procedure).some(Boolean));
  const submit=async(event:React.FormEvent)=>{event.preventDefault();if(!hasResponse || busy || draft.busy || draft.conflict)return;setBusy(true);setError("");try{await draft.flush();draft.pause();const result=await act("useResource",{resourceId:resource.id,...value,submissionId:draft.submissionId,draftRevision:draft.getDraftRevision()});draft.complete(result);notify("Respuesta guardada.")}catch(reason:any){draft.resume();setError(String(reason.message || "No se ha podido guardar la respuesta.").replace(/borrador/gi,"trabajo"))}finally{setBusy(false)}};
  return <Dialog title={<MathText subject={resource.subject}>{resource.title}</MathText>} className="sw-resource-dialog student-views sw-simple-resource sw-classroom-work" onClose={leave} wide><div className="sv-stack">
    <section><p className="sv-preline"><MathText subject={resource.subject}>{resource.instructions || resource.description}</MathText></p>{resource.url && <a className="btn primary" href={resource.url} target="_blank" rel="noopener noreferrer">Abrir recurso<ExternalLink size={16}/></a>}<MaterialFiles resource={resource} files={data.files || []}/></section>
    <form className="sv-stack" onSubmit={submit} aria-label="Respuesta al recurso"><fieldset disabled={busy || draft.busy || Boolean(draft.conflict)} className="sw-editor-fields"><MathAnswerField label="Tu respuesta" subject={resource.subject} multiline rows={4} maxLength={20000} value={value.answer} onChange={answer=>draft.setValue({answer})} allowExpressions/></fieldset><PreviousWork value={value} subject={resource.subject}/><ResponseSaving subject={resource.subject} activities={data.activities || []} resources={data.resources || []} draft={draft} busy={busy}/>{error && <p role="alert" className="error-text">{error}</p>}<div className="sw-classroom-actions"><button className="btn primary" disabled={busy || draft.busy || Boolean(draft.conflict) || !hasResponse}><Check size={17}/>{busy?"Guardando…":"Guardar respuesta"}</button><button className="btn secondary" type="button" disabled={busy || draft.busy} onClick={leave}>Cerrar</button></div></form>
    {latestReview && <section className="sw-feedback"><h3>Revisión</h3><p className="sv-preline">{latestReview.feedback || latestReview.result || "Respuesta revisada."}</p></section>}
    {history.length>0 && <details className="sw-simple-details sw-history-collapse"><summary>Respuestas anteriores ({history.length})</summary><ResponseHistory responses={history} activities={data.activities || []} resources={data.resources || []}/></details>}
  </div></Dialog>;
}
