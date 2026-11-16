"use client";
import { ArrowRight, BookOpen, CalendarDays } from "lucide-react";
import { activitySupportMode } from "@/lib/activity-support";
import { isUnread } from "./StudentReadState";
import { studentDate } from "./StudentWork";
import { selectHomeWork, submissionForHomeWork, type HomeWork } from "./student-home";
import MathText from "./MathText";
import "./student-simple.css";

type Item = Record<string, any>;
const plain = (value: any) => Array.isArray(value) ? value.join(" · ") : typeof value === "string" ? value : "";
const defaultSteps = new Set(["Revisar deberes y dudas del colegio y seleccionar una comprobación breve del contenido prioritario; registrar qué realiza sola y con qué ayuda.", "Revisar lo que está trabajando en el colegio y elegir una primera comprobación breve.", "Confirmar el contenido actual del colegio y comprobar conocimientos previos sin dar por supuesto su nivel."]);
const categoryLabel = (value: string) => value === "Para hacer en clase" ? "En clase" : value === "Opcionales" ? "Opcional" : value;

function WorkMeta({ work }: { work: HomeWork }) {
  const item = work.activity || work.resource || {};
  return <div className="ss-work-meta">{item.subject && <span>{item.subject}</span>}{work.assignment?.category && <span>{categoryLabel(work.assignment.category)}</span>}{activitySupportMode(item.supportMode) === "teacher" && <span className="ss-teacher-help">Con el docente</span>}</div>;
}

export default function StudentHome({ student, activities, resources, assignments, responses, skills, draftOptions, attemptedIds, sessions, latestCheck, exams, feedback, onOpenWork, onOpenSession, onFeedback, onNavigate }: any) {
  const { primary, alternative, otherDrafts } = selectHomeWork({ student, activities, assignments, responses, skills, draftOptions, attemptedIds });
  const latestSession = sessions[0], nextExam = exams[0];
  const featuredFeedback = feedback.find((item: Item) => isUnread(student.id, item)) || feedback[0];
  const newFeedback = featuredFeedback && isUnread(student.id, featuredFeedback);
  const nextStep = student.nextStep || latestSession?.nextStep || "";
  const material = primary?.activity || primary?.resource;
  const primaryLabel = primary?.kind === "teacher" ? "Elegida para ti" : "Para practicar";
  const submission = (work: HomeWork) => work.activity ? submissionForHomeWork(work.activity, work.assignment, responses) : undefined;
  const workLabel = (work: HomeWork) => work.draft ? "Continuar" : work.kind === "proposal" ? "Empezar" : submission(work)?.reviewStatus === "reviewed" ? "Ver revisión" : submission(work) ? "Ver mi trabajo" : "Abrir ejercicio";
  const primaryStatus = primary?.draft ? "" : primary && submission(primary) ? submission(primary)?.reviewStatus === "reviewed" ? "Revisión disponible." : "Respuesta guardada." : primary?.kind === "proposal" ? "Ejercicio opcional." : "";
  const otherWork = [...(alternative ? [alternative] : []), ...otherDrafts];
  const feedbackMaterial = featuredFeedback && (activities.find((item: Item) => item.id === featuredFeedback.activityId) || resources.find((item: Item) => item.id === featuredFeedback.resourceId));
  const feedbackTitle = feedbackMaterial?.title || "Trabajo revisado";
  const review = featuredFeedback && <><h3><MathText subject={feedbackMaterial?.subject}>{feedbackTitle}</MathText></h3><p className="sv-preline"><MathText subject={feedbackMaterial?.subject}>{featuredFeedback.feedback || featuredFeedback.result || "El docente ha revisado esta respuesta."}</MathText></p><small className="muted">{studentDate(featuredFeedback.reviewedAt || featuredFeedback.createdAt)}</small><button className="btn quiet" data-feedback-id={featuredFeedback.id} data-activity-id={featuredFeedback.activityId} data-resource-id={featuredFeedback.resourceId} onClick={() => onFeedback(featuredFeedback)}>Ver revisión<ArrowRight size={16}/></button></>;
  const hasFollowup = nextStep || student.priorities?.length > 0 || latestSession || latestCheck || featuredFeedback && !newFeedback || nextExam?.topics;
  return <div className="sv-stack sh-home ss-home">
    <section className="sv-hero sh-main ss-main" aria-labelledby="home-main-title"><div className="sv-hero-content"><span className="eyebrow">{material ? primaryLabel : "PRACTICAR"}</span><h2 id="home-main-title"><MathText subject={material?.subject}>{material?.title || "Ejercicios disponibles"}</MathText></h2>{primary && <WorkMeta work={primary}/>}<button className="btn sv-hero-button" data-activity-id={primary?.activity?.id} data-resource-id={primary?.resource?.id} onClick={() => primary ? onOpenWork(primary) : onNavigate?.("Practicar")}>{primary ? workLabel(primary) : "Ver ejercicios"}<ArrowRight size={18}/></button>{primaryStatus && <p className="ss-primary-status">{primaryStatus}</p>}</div></section>
    {newFeedback && <section className="card ss-new-feedback"><span className="eyebrow">REVISIÓN NUEVA</span>{review}</section>}
    {nextExam && <button className="ss-exam-link" onClick={() => onNavigate?.("Calendario")}><CalendarDays size={19} aria-hidden="true"/><span><small>Próximo examen</small><strong>{nextExam.title}</strong><span>{studentDate(nextExam.date)}</span></span><ArrowRight size={17} aria-hidden="true"/></button>}
    {otherWork.length > 0 && <details className="card ss-home-disclosure"><summary>Otros ejercicios</summary><div className="ss-disclosure-content">{otherWork.map(work => <div className="ss-work-row" key={work.key}><div><strong><MathText subject={(work.activity || work.resource)?.subject}>{(work.activity || work.resource)?.title || "Actividad"}</MathText></strong><span className="muted">{work.draft ? "Para continuar" : work.kind === "teacher" ? "Alternativa del docente" : "Ejercicio opcional"}</span>{activitySupportMode((work.activity || work.resource)?.supportMode) === "teacher" && <span className="ss-teacher-help">Con el docente</span>}</div><button className="btn quiet" data-activity-id={work.activity?.id} data-resource-id={work.resource?.id} onClick={() => onOpenWork(work)}>{workLabel(work)}<ArrowRight size={16}/></button></div>)}</div></details>}
    {hasFollowup && <details className="card ss-home-disclosure"><summary>{latestSession ? "Mi clase y próximos pasos" : "Próximos pasos"}</summary><div className="ss-disclosure-content sv-stack">
      {latestSession && <section className="ss-followup-item"><h3><BookOpen size={17}/>Última clase · {studentDate(latestSession.date)}</h3><p>{latestSession.sharedSummary || plain(latestSession.content) || latestSession.objective}</p><button className="btn quiet" data-session-id={latestSession.id} onClick={() => onOpenSession(latestSession)}>{latestSession.explanation ? "Ver explicación" : "Ver clase"}<ArrowRight size={16}/></button></section>}
      {nextStep && <section className="ss-followup-item"><h3>Siguiente paso</h3><p className="sv-preline">{defaultSteps.has(nextStep) ? "Revisaremos las dudas del colegio." : nextStep}</p></section>}
      {student.priorities?.length > 0 && <section className="ss-followup-item"><h3>Prioridades</h3><ul>{student.priorities.slice(0, 2).map((priority: string, index: number) => <li key={index}>{priority}</li>)}</ul><button className="btn quiet" onClick={() => onNavigate?.("Mi camino")}>Ver mi camino<ArrowRight size={16}/></button></section>}
      {latestCheck && <section className="ss-followup-item"><h3>Última comprobación</h3><strong>{latestCheck.title}</strong><p>{latestCheck.state} · {studentDate(latestCheck.lastCheck)}</p>{latestCheck.evidence && <blockquote className="sv-evidence">{plain(latestCheck.evidence)}</blockquote>}</section>}
      {featuredFeedback && !newFeedback && <section className="ss-followup-item"><h3>Última revisión</h3>{review}</section>}
      {nextExam?.topics && <section className="ss-followup-item"><h3>Para el próximo examen</h3><p className="sv-preline">{plain(nextExam.topics)}</p></section>}
    </div></details>}
  </div>;
}
