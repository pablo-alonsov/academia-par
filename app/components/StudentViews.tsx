"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Flag, PencilLine, Search, Star } from "lucide-react";
import StudyPlan from "./StudyPlan";
import { PersonalizationPanel, StudentAvatar, studentColors, WordCollection } from "./StudentTools";
import { StudentActivityDetail, StudentResourceDialog, studentDate, WorkFiles } from "./StudentWork";
import { initializeReadState, isUnread, markRead } from "./StudentReadState";
import { studentDrafts } from "./StudentDrafts";
import { useStudentLocalForms } from "./StudentLocalForms";
import { isTrackingDate } from "@/lib/academy-config";
import StudentHome from "./StudentHome";
import MathText from "./MathText";
import { responsesForActivity, responsesForResource, linkedResourceActivity } from "@/lib/resource-work";
import { hasActivitySubmission, type HomeWork } from "./student-home";
import { pendingTeacherAssignments, type PendingTeacherWork } from "./student-assignments";
import { pdfFileForResource } from "@/lib/resource-files";
import { usePlatformNavigation } from './PlatformNavigation';
import "./student.css";
import "./student-simple.css";

type Item = Record<string, any>;
type Props = { data: Item; profile: string; tab: string; act: (action: string, data: Item) => Promise<any>; notify: (message: string) => void; onNavigate?: (tab: string) => void | Promise<void>; personalizationRequested?: boolean; onPersonalizationOpened?: () => void };
const STATES = ["Por empezar", "Lo estamos trabajando", "Lo hago con ayuda", "Lo hago sola", "Lo he recordado días después"];
const plain = (value: any) => Array.isArray(value) ? value.join(" · ") : typeof value === "string" ? value : "";
const searchText = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
const sortRecent = (a: Item, b: Item) => (b.createdAt || b.updatedAt || "").localeCompare(a.createdAt || a.updatedAt || "");
const futureSkill = (skill: Item) => /segundo|más adelante|posterior/i.test(skill.phase || "");
function Empty({ icon: Icon = BookOpen, title, children }: any) { return <div className="sv-empty"><span className="sv-empty-icon"><Icon size={25}/></span><h3>{title}</h3><p>{children}</p></div>; }
function Subject({ value }: { value: string }) { return <span className={`sv-subject ${value?.includes("Lengua") ? "violet" : value?.includes("Física") ? "green" : "blue"}`}><BookOpen size={14}/>{value || "General"}</span>; }

function revealStudentTarget(target: HTMLElement | null) {
  const ancestors: HTMLDetailsElement[] = []; let parent = target?.parentElement?.closest("details");
  while (parent) { ancestors.unshift(parent); parent = parent.parentElement?.closest("details"); }
  ancestors.forEach(details => { details.open = true; });
}
function ActivityCard({ activity, assignment, response, onOpen }: any) {
  const previousContext = response && (response.activityId !== activity.id || assignment && assignment.category !== "Opcionales" && response.assignmentId !== assignment.id);
  return <button type="button" className="card sv-activity-card ss-activity-card" data-activity-id={activity.id} onClick={onOpen}><div className="sv-card-top"><Subject value={activity.subject}/></div><div className="sv-activity-body ss-activity-body"><h3><MathText subject={activity.subject}>{activity.title}</MathText></h3></div><div className="sv-activity-footer"><div className="row wrap">{response?.reviewStatus === "reviewed" && <span className="badge green">{previousContext ? "Revisión anterior" : "Revisada"}</span>}</div><ArrowRight size={18} aria-hidden="true"/></div></button>;
}

function AssignedActivityCard({ work, sequence, onOpen }: { work: PendingTeacherWork; sequence?: number; onOpen: () => void }) {
  const { assignment, activity, dueDate } = work;
  return <button type="button" className="card sv-activity-card sv-assigned-card ss-activity-card" data-assignment-id={assignment.id} onClick={onOpen}><Subject value={activity.subject}/><div className="sv-activity-body ss-activity-body">{sequence && <span className="sv-assignment-context">Ejercicio {sequence}</span>}<h3><MathText subject={activity.subject}>{assignment.title || activity.title}</MathText></h3></div>{dueDate && <p className="sv-assignment-due">Fecha: <time dateTime={dueDate}>{studentDate(dueDate)}</time></p>}<span className="sv-assignment-open">Abrir<ArrowRight size={18} aria-hidden="true"/></span></button>;
}

export default function StudentViews({ data, profile, tab, act, notify, onNavigate, personalizationRequested, onPersonalizationOpened }: Props) {
  const navigation = usePlatformNavigation(), detail = navigation.route.detail;
  const student = (data.students || []).find((item: Item) => item.id === profile) || { id: profile, name: profile === "rocio" ? "Rocío" : "Alejandra", priorities: [] };
  const activities: Item[] = (data.activities || []).filter((item: Item) => item.studentId ? item.studentId === profile : !item.suggestedStudentIds?.length || item.suggestedStudentIds.includes(profile));
  const resources: Item[] = (data.resources || []).filter((item: Item) => item.studentId ? item.studentId === profile : !item.suggestedStudentIds?.length || item.suggestedStudentIds.includes(profile));
  const skills: Item[] = (data.skills || []).filter((item: Item) => item.studentId === profile);
  const assignments: Item[] = (data.assignments || []).filter((item: Item) => item.studentId === profile);
  const responses: Item[] = (data.responses || []).filter((item: Item) => item.studentId === profile).sort(sortRecent);
  const sessions: Item[] = (data.sessions || []).filter((item: Item) => item.studentId === profile && item.status === "realizada" && isTrackingDate(item.date)).sort((a: Item, b: Item) => b.date.localeCompare(a.date));
  const doubts: Item[] = (data.doubts || []).filter((item: Item) => item.studentId === profile);
  const exams: Item[] = (data.exams || []).filter((item: Item) => item.studentId === profile && item.date >= new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" })).sort((a: Item, b: Item) => a.date.localeCompare(b.date));
  const activityId = detail?.kind === 'activity' ? detail.id : '', assignmentId = detail?.kind === 'activity' ? detail.assignmentId || '' : '', sessionId = detail?.kind === 'student-session' ? detail.id : '', resourceId = detail?.kind === 'resource' ? detail.id : '';
  const localQuestions = useStudentLocalForms(profile, "question");
  const previousLocalQuestions = localQuestions.copies.filter(copy => String(copy.value.question || "").trim() && !doubts.some(item => item.question === copy.value.question));
  const [returnResource, setReturnResource] = useState("");
  const [subject, setSubject] = useState(""), [search, setSearch] = useState(""), [skillFilter, setSkillFilter] = useState("");
  const [practiceSection, setPracticeSection] = useState<"exercises" | "resources">("exercises");
  const [resourceSubject, setResourceSubject] = useState(""), [resourceSearch, setResourceSearch] = useState(""), [resourceLimit, setResourceLimit] = useState(5);
  const [practiceMode, setPracticeMode] = useState("Sin hacer"), [limit, setLimit] = useState(5);
  const [pathMode, setPathMode] = useState("Ahora"), [pathLimit, setPathLimit] = useState(5), [resourceMode, setResourceMode] = useState("Todos"), [resourceType, setResourceType] = useState(""), [favoriteBusy, setFavoriteBusy] = useState(false), [sessionLimit, setSessionLimit] = useState(5);
  const [localVersion, setLocalVersion] = useState(0), [readVersion, setReadVersion] = useState(0);
  const activityReturn = useRef({ top: 0, id: "", resourceId: "", sourceAssignmentId: "", assignmentIndex: -1, listIndex:0, section: "exercises" as "exercises" | "resources" }), resourceReturn = useRef({ top: 0, id: "", section: "exercises" as "exercises" | "resources" }), sessionReturn = useRef({ top: 0, id: "" }), sessionHeading = useRef<HTMLHeadingElement>(null);
  const drafts: Item[] = useMemo(() => studentDrafts(profile, data.drafts || []), [profile, data.drafts, localVersion]);
  useEffect(() => { const refresh = () => setLocalVersion(value => value + 1), reviews = () => setReadVersion(value => value + 1); window.addEventListener("arp:drafts-changed", refresh); window.addEventListener("storage", refresh); window.addEventListener("arp-review-read-changed", reviews); initializeReadState(profile, data.responses || [], data.doubts || []); return () => { window.removeEventListener("arp:drafts-changed", refresh); window.removeEventListener("storage", refresh); window.removeEventListener("arp-review-read-changed", reviews); }; }, [profile]);
  useEffect(() => { setSubject(""); setSearch(""); setSkillFilter(""); setLimit(5); setPathLimit(5); }, [tab, profile]);
  useEffect(() => { if (sessionId) sessionHeading.current?.focus({ preventScroll: true }); }, [sessionId]);
  const pendingWork = pendingTeacherAssignments(profile, assignments, activities, responses, student.mainActivityId);
  const pendingActivityIds = new Set(pendingWork.map(work => work.activity.id));
  const assignedHeading = useRef<HTMLHeadingElement>(null);
  const assignmentFor = (id: string) => assignments.find(item => item.activityId === id && item.category !== "Opcionales" && !responses.some(response => response.assignmentId === item.id)) || assignments.find(item => item.activityId === id);
  const historyFor = (id: string) => { const activity = activities.find(item => item.id === id); return activity ? responsesForActivity(activity, profile, responses, activities) : []; };
  const latestFor = (id: string) => historyFor(id)[0];
  const resourceActivity = (id: string, preferred?: string) => linkedResourceActivity(id, profile, activities, assignments, preferred);
  const openActivity = (activity: Item, assignment = assignmentFor(activity.id), fromResourceId = "", sourceAssignmentId = "") => { activityReturn.current = { id: activity.id, top: window.scrollY, resourceId: fromResourceId, sourceAssignmentId, assignmentIndex: sourceAssignmentId ? pendingWork.findIndex(work => work.assignment.id === sourceAssignmentId) : -1, listIndex:Math.max(0,matchingActivities.findIndex(item=>item.id===activity.id)), section: practiceSection }; void navigation.navigate({tab,detail:{kind:'activity',id:activity.id,assignmentId:assignment?.id || '',source:practiceSection,sourceAssignmentId}}); };
  const restoreResourceCard = (id: string, top: number) => { requestAnimationFrame(() => { const target = document.querySelector<HTMLElement>(`[data-resource-id="${CSS.escape(id)}"]`); if (target) { revealStudentTarget(target); target.focus({ preventScroll: true }); target.scrollIntoView({ block: "center", behavior: "auto" }); } else window.scrollTo({ top, behavior: "auto" }); }); };
  const restoreActivity = () => {
    const previous = activityReturn.current, id = previous.id;
    if (tab === "Practicar" && previous.sourceAssignmentId) {
      requestAnimationFrame(() => { const remaining = pendingWork.find(work => work.assignment.id === previous.sourceAssignmentId) || pendingWork[Math.max(0, Math.min(previous.assignmentIndex, pendingWork.length - 1))]; const target = remaining ? document.querySelector<HTMLElement>(`[data-assignment-id="${CSS.escape(remaining.assignment.id)}"]`) : document.querySelector<HTMLElement>('.sv-practice-sections button[aria-pressed="true"]'); if (target) { revealStudentTarget(target); target.focus({ preventScroll: true }); target.scrollIntoView({ block: "center", behavior: "auto" }); } else assignedHeading.current?.focus({ preventScroll: true }); });
      return;
    }
    if (tab === "Practicar" && previous.section === "resources") { setPracticeSection("resources"); setReturnResource(previous.resourceId); setResourceLimit(value => Math.max(value, 5)); }
    if (tab === "Practicar" && previous.section === "resources" && previous.resourceId) restoreResourceCard(previous.resourceId, previous.top);
    else requestAnimationFrame(() => { const cards=tab==='Practicar'?Array.from(document.querySelectorAll<HTMLElement>('.ss-activity-card[data-activity-id]')):[];const target = document.querySelector<HTMLElement>(`[data-activity-id="${CSS.escape(id)}"]`) || cards[Math.min(previous.listIndex,cards.length-1)]; if (target) { revealStudentTarget(target); target.focus({ preventScroll: true }); target.scrollIntoView({ block: "center", behavior: "auto" }); } else { document.querySelector<HTMLElement>('.sv-practice-sections button[aria-pressed="true"]')?.focus({preventScroll:true});window.scrollTo({ top: previous.top, behavior: "auto" }); } });
  };
  const closeActivity = () => navigation.back();
  const openSession = (session: Item) => { sessionReturn.current = { id: session.id, top: window.scrollY }; void navigation.navigate({tab,detail:{kind:'student-session',id:session.id}}); };
  const closeSession = () => navigation.back();
  const openResource = (resource: Item, preferred?: string) => { resourceReturn.current = { id: resource.id, top: window.scrollY, section: practiceSection }; const linked = resourceActivity(resource.id, preferred); if (linked) openActivity(linked, assignmentFor(linked.id), resource.id); else void navigation.navigate({tab,detail:{kind:'resource',id:resource.id,source:practiceSection}}); };
  const closeResource = () => navigation.back();
  const previousDetail = useRef(detail);
  useEffect(() => {
    const previous = previousDetail.current; previousDetail.current = detail;
    if (activityId || sessionId) window.scrollTo({top:0,behavior:'auto'});
    if (detail?.source) setPracticeSection(detail.source);
    if (detail?.kind === 'activity' && activityReturn.current.id !== detail.id) activityReturn.current = {id:detail.id,top:0,resourceId:activities.find(item=>item.id===detail.id)?.resourceId || '',sourceAssignmentId:detail.sourceAssignmentId || '',assignmentIndex:pendingWork.findIndex(work=>work.assignment.id===detail.sourceAssignmentId),listIndex:0,section:detail.source || 'exercises'};
    if (detail?.kind === 'resource' && resourceReturn.current.id !== detail.id) resourceReturn.current = {id:detail.id,top:0,section:detail.source || 'resources'};
    if (detail?.kind === 'student-session' && sessionReturn.current.id !== detail.id) sessionReturn.current = {id:detail.id,top:0};
    if (previous?.kind === 'activity' && !activityId) restoreActivity();
    if (previous?.kind === 'resource' && !resourceId) { const returned=resourceReturn.current; if(returned.section==='resources'){setPracticeSection('resources');setReturnResource(returned.id);} restoreResourceCard(returned.id,returned.top); }
    if (previous?.kind === 'student-session' && !sessionId && !activityId) requestAnimationFrame(() => { const target=document.querySelector<HTMLElement>(`[data-session-id="${CSS.escape(sessionReturn.current.id)}"]`);revealStudentTarget(target);target?.focus({preventScroll:true});window.scrollTo({top:sessionReturn.current.top,behavior:'auto'}); });
  },[detail]);
  const openHomeWork = (work: HomeWork) => { if (work.activity) openActivity(work.activity, work.assignment, work.resource?.id); else if (work.resource) openResource(work.resource); };
  const showFeedback = (response: Item) => { markRead(profile, [response]); const activity = activities.find(item => item.id === response.activityId); if (activity) openActivity(activity); else { const resource = resources.find(item => item.id === response.resourceId); if (resource) openResource(resource); } };
  const favoriteIds: string[] = student.favoriteResourceIds || [], pinnedIds: string[] = student.pinnedResourceIds || [];
  const toggleFavorite = async (id: string) => { setFavoriteBusy(true); try { await act("updatePreferences", { studentId: profile, favoriteResourceIds: favoriteIds.includes(id) ? favoriteIds.filter(value => value !== id) : [...favoriteIds, id] }); } catch (reason: any) { notify(reason.message); } finally { setFavoriteBusy(false); } };
  const latestCheck = [...skills].filter(item => isTrackingDate(item.lastCheck)).sort((a, b) => b.lastCheck.localeCompare(a.lastCheck))[0];
  const feedback = responses.filter(item => item.reviewStatus === "reviewed").sort((a, b) => (b.reviewedAt || b.updatedAt || b.createdAt).localeCompare(a.reviewedAt || a.updatedAt || a.createdAt));
  const pendingDoubts = doubts.filter(item => !item.resolvedAt && item.status !== "resolved"), answeredDoubts = doubts.filter(item => item.resolvedAt || item.status === "resolved").sort((a, b) => (b.resolvedAt || "").localeCompare(a.resolvedAt || ""));
  const subjects = [...new Set([...skills, ...activities, ...resources].map(item => item.subject).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  const setPracticeView = (mode: string) => { setPracticeMode(mode); setLimit(5); };
  const matchingActivities = activities.filter(item => {
    if (pendingActivityIds.has(item.id)) return false;
    if ((item.type === "external" || item.type === "paper") && resources.some(resource => item.id === `act-${resource.id}` && item.resourceId === resource.id)) return false;
    const assignment = assignmentFor(item.id), completed = hasActivitySubmission(item, assignment, responses);
    const modeMatches = practiceMode === "Todos" || practiceMode === "Sin hacer" && !completed || practiceMode === "Hechos" && completed;
    return modeMatches && (!subject || item.subject === subject) && (!skillFilter || item.skillId === skillFilter) && (!searchText(search) || searchText([item.title, item.objective, item.instructions, skills.find(skill => skill.id === item.skillId)?.title].filter(Boolean).join(" ")).includes(searchText(search)));
  }).sort((a, b) => (a.id === student.mainActivityId ? -1 : b.id === student.mainActivityId ? 1 : (practiceMode === "Hechos" ? sortRecent(latestFor(a.id) || {}, latestFor(b.id) || {}) : Number(Boolean(assignmentFor(b.id) && assignmentFor(b.id)?.category !== "Opcionales")) - Number(Boolean(assignmentFor(a.id) && assignmentFor(a.id)?.category !== "Opcionales")) || a.title.localeCompare(b.title, "es"))));
  const visibleActivities = matchingActivities.slice(0, limit), groupedActivities = new Map<string, Item[]>();
  visibleActivities.forEach(item => groupedActivities.set(item.subject, [...(groupedActivities.get(item.subject) || []), item]));
  const matchingSkills = skills.filter(item => (!subject || item.subject === subject) && (pathMode === "Todo" || pathMode === "Ahora" && !futureSkill(item) || pathMode === "Conviene repasar" && item.reviewNeeded || pathMode === "Más adelante" && futureSkill(item)));
  const matchingResources = resources.filter(item => (!resourceSubject || item.subject === resourceSubject) && (!resourceType || item.type === resourceType) && (resourceMode === "Todos" || resourceMode === "Fichas PDF" && Boolean(pdfFileForResource(item, data.files || [])) || resourceMode === "Favoritos" && favoriteIds.includes(item.id) || resourceMode === "Elegidos por el docente" && (item.pinned || pinnedIds.includes(item.id))) && (!searchText(resourceSearch) || searchText(`${item.title} ${item.objective}`).includes(searchText(resourceSearch)))).sort((a, b) => (a.id === returnResource ? -1 : b.id === returnResource ? 1 : 0) || Number(Boolean(b.pinned || pinnedIds.includes(b.id))) - Number(Boolean(a.pinned || pinnedIds.includes(a.id))) || Number(favoriteIds.includes(b.id)) - Number(favoriteIds.includes(a.id)) || a.title.localeCompare(b.title, "es"));
  const returnedResource = returnResource && !matchingResources.some(item => item.id === returnResource) ? resources.find(item => item.id === returnResource) : undefined;
  const displayedResources = [...(returnedResource ? [returnedResource] : []), ...matchingResources.slice(0, resourceLimit)];
  const clearResourceFilters = () => { setResourceSubject(""); setResourceSearch(""); setResourceType(""); setResourceMode("Todos"); setReturnResource(""); setResourceLimit(5); };
  const switchPracticeSection = (section: "exercises" | "resources") => { setPracticeSection(section); setReturnResource(""); };
  const clearFilters = () => { setSubject(""); setSearch(""); setSkillFilter(""); setLimit(5); };
  const selectedActivity = activities.find(item => item.id === activityId), selectedResource = resources.find(item => item.id === resourceId), selectedSession = sessions.find(item => item.id === sessionId);
  const homeDraftOptions: HomeWork[] = drafts.flatMap<HomeWork>(draft => {
    const activity = activities.find(item => item.id === draft.activityId);
    if (activity) return [{ key: `activity:${activity.id}`, activity, assignment: assignmentFor(activity.id), draft }];
    const resource = resources.find(item => item.id === draft.resourceId);
    if (!resource) return [];
    const linked = resourceActivity(resource.id);
    return [{ key: linked ? `activity:${linked.id}` : `resource:${resource.id}`, activity: linked, resource, assignment: linked ? assignmentFor(linked.id) : undefined, draft }];
  });
  const color = studentColors[student.color] || studentColors[profile === "rocio" ? "violet" : "teal"];

  if (selectedActivity) return <StudentActivityDetail key={`${profile}:${activityId}`} activity={{ ...selectedActivity, url: selectedActivity.url || resources.find(item => item.id === selectedActivity.resourceId)?.url }} assignment={assignments.find(item => item.id === assignmentId)} student={student} data={data} act={act} notify={notify} onBack={closeActivity} backLabel={tab === "Inicio" ? "Volver a Inicio" : tab === "Practicar" && activityReturn.current.sourceAssignmentId ? "Volver a mis encargos" : tab === "Practicar" && activityReturn.current.section === "resources" ? "Volver a recursos y materiales" : tab === "Mis clases" ? "Volver a mis clases" : "Volver a practicar"}/>;
  if (selectedSession) return <div className="student-views sv-stack"><button className="btn quiet sv-back" onClick={closeSession}><ArrowLeft size={17}/>{tab === "Inicio" ? "Volver a Inicio" : "Volver a mis clases"}</button><div className="sv-detail-heading"><span className="eyebrow">{studentDate(selectedSession.date)}</span><h1 ref={sessionHeading} tabIndex={-1}>{selectedSession.objective || selectedSession.subject || "Clase individual"}</h1></div><div className="grid-2"><section className="card sv-pad"><h3>Qué trabajamos</h3><p className="sv-preline">{plain(selectedSession.content) || selectedSession.sharedSummary}</p>{selectedSession.sharedSummary && selectedSession.sharedSummary !== plain(selectedSession.content) && <p className="sv-preline">{selectedSession.sharedSummary}</p>}</section><section className="card sv-pad"><h3>Explicación</h3><p className="sv-preline">{selectedSession.explanation || "Sin explicación compartida."}</p></section></div>{(selectedSession.originalText || selectedSession.revisedText) && <section className="card sv-pad" aria-label="Comparación de versiones del trabajo"><h3>Versiones del trabajo</h3><div className="grid-2 sv-before-after"><div><h4>Versión original</h4><p className="sv-preline">{selectedSession.originalText || "Sin versión original."}</p></div><div><h4>Versión revisada</h4><p className="sv-preline">{selectedSession.revisedText || "Sin versión revisada."}</p></div></div></section>}<section className="card sv-pad"><h3>Material para consultar</h3><p className="sv-preline">{plain(selectedSession.materials) || "Sin materiales compartidos."}</p><WorkFiles ids={selectedSession.fileIds}/>{(data.evidence || []).filter((item: Item) => item.sessionId === selectedSession.id).map((item: Item) => <div className="sv-inset" key={item.id}><strong>{item.title || "Trabajo de clase"}</strong><p className="sv-preline">{item.text || item.description || item.content}</p><WorkFiles ids={item.fileIds || (item.fileId ? [item.fileId] : [])}/></div>)}</section><section className="sv-next-card"><Flag size={21}/><div><span className="eyebrow">SIGUIENTE PASO</span><p>{selectedSession.nextStep || "Sin siguiente paso registrado."}</p></div></section>{assignments.filter(item => item.sessionId === selectedSession.id).map(item => { const activity = activities.find(candidate => candidate.id === item.activityId); return activity && <ActivityCard key={item.id} activity={activity} assignment={item} response={latestFor(activity.id)} onOpen={() => openActivity(activity, item)}/>; })}</div>;

  return <div className={`student-views sv-stack ss-student-lists sv-${profile}`} style={{ "--sv-accent": color.color, "--sv-soft": color.soft } as React.CSSProperties} data-review-version={readVersion}>
    {tab === "Inicio" && <>
      <div className="sv-welcome"><div className="row sw-student-heading"><StudentAvatar student={student}/><div><span className="eyebrow">INICIO</span><h1>{student.name}</h1><p>{student.level}</p></div></div></div>
      <StudentHome student={student} activities={activities} resources={resources} assignments={assignments} responses={responses} skills={skills} draftOptions={homeDraftOptions} attemptedIds={activities.filter(item => hasActivitySubmission(item, assignmentFor(item.id), responses)).map(item => item.id)} sessions={sessions} latestCheck={latestCheck} exams={exams} feedback={feedback} onOpenWork={openHomeWork} onOpenSession={openSession} onFeedback={showFeedback} onNavigate={onNavigate}/>
      {(pendingDoubts.length > 0 || answeredDoubts.length > 0 || previousLocalQuestions.length > 0) && <details className="card ss-home-disclosure" onToggle={event => { if (event.currentTarget.open && answeredDoubts.length) markRead(profile, answeredDoubts, "doubt"); }}>
        <summary>Preguntas anteriores{answeredDoubts.some(item => isUnread(profile, item, "doubt")) && <span className="badge blue">Respuesta nueva</span>}</summary>
        <div className="ss-disclosure-content sv-stack">
          {pendingDoubts.map(item => <article className="sv-inset" key={item.id}><p className="sv-preline">{item.question}</p><small className="muted">Para comentar en clase</small></article>)}
          {answeredDoubts.map(item => <article className="sv-inset" key={item.id}><strong>{item.question}</strong><p className="sv-preline">{item.reply || "La comentamos en clase."}</p><small className="muted">{studentDate(item.resolvedAt)}</small></article>)}
          {previousLocalQuestions.map(copy => <article className="sv-inset" key={`local:${copy.id}`}><p className="sv-preline">{String(copy.value.question || "")}</p><small className="muted">Guardada en este dispositivo · {studentDate(copy.updatedAt)}</small></article>)}
        </div>
      </details>}
      <div className="ss-home-personalization"><PersonalizationPanel student={student} act={act} notify={notify} openRequested={personalizationRequested} onOpened={onPersonalizationOpened}/></div>
    </>}
    {tab === "Mi camino" && <>
      <div className="sv-section-intro"><span className="sv-icon-box"><Flag size={23}/></span><div><h1>Mi camino</h1><p>Lo que estamos trabajando y lo que conviene repasar.</p></div></div>
      {(student.priorities || []).length > 0 && <section className="card sv-pad"><h3>Prioridades actuales</h3><div className="sv-priorities">{student.priorities.map((priority: string, index: number) => <span key={index}><span className="sv-dot"/>{priority}</span>)}</div></section>}
      <details className="sw-plan-collapse"><summary>Plan de trabajo por asignaturas</summary><StudyPlan plan={student.subjectPlan}/></details>
      <div className="sv-chip-tabs" aria-label="Filtrar habilidades">{["Ahora", "Conviene repasar", "Más adelante", "Todo"].map(mode => <button key={mode} type="button" className={mode === pathMode ? "active" : ""} aria-pressed={mode === pathMode} onClick={() => { setPathMode(mode); setPathLimit(5); }}>{mode}</button>)}</div>
      <label className="sv-select-label">Asignatura<select value={subject} onChange={event => { setSubject(event.target.value); setPathLimit(5); }}><option value="">Todas las asignaturas</option>{subjects.map(name => <option key={name}>{name}</option>)}</select></label>
      <p className="muted sv-small">Completar una actividad no cambia automáticamente el estado de una habilidad.</p>
      <div className="sv-skills">{matchingSkills.slice(0, pathLimit).map(skill => { const stateIndex = Math.max(0, STATES.indexOf(skill.state)); const evidence = (data.evidence || []).filter((item: Item) => item.skillId === skill.id); return <article className="card sv-skill" key={skill.id}><div className="sv-card-top"><Subject value={skill.subject}/>{skill.phase && <span className="badge">{skill.phase}</span>}{skill.reviewNeeded && <span className="badge amber">Conviene repasarlo</span>}</div><h3>{skill.title}</h3><div className="sv-skill-steps" aria-hidden="true">{[1, 2, 3, 4].map(step => <span key={step} className={step <= stateIndex ? "filled" : ""}/>)}</div><strong className={`sv-state-label sv-state-text-${stateIndex}`}>{skill.state || STATES[0]}</strong><p className="muted sv-small">{skill.lastCheck ? `Comprobación: ${studentDate(skill.lastCheck)}` : "Sin comprobación registrada"}</p>{skill.evidence && <blockquote className="sv-evidence">{plain(skill.evidence)}</blockquote>}{evidence.map((item: Item) => <div className="sv-evidence" key={item.id}><strong>{item.title || "Evidencia"}</strong><p className="sv-preline">{item.text || item.description}</p><WorkFiles ids={item.fileIds || (item.fileId ? [item.fileId] : [])}/></div>)}{skill.explanation && <details className="skill-reference"><summary>Explicación de referencia</summary><p className="sv-preline">{skill.explanation}</p></details>}<div className="sv-skill-next"><Flag size={15}/><span>{skill.state !== STATES[0] || skill.lastCheck ? skill.nextStep || "Sin siguiente paso registrado." : "Contenido planificado. El siguiente paso se concretará en clase."}{skill.reviewDate ? ` · Revisión: ${studentDate(skill.reviewDate)}` : ""}</span></div></article>; })}</div>{!matchingSkills.length && <Empty icon={Flag} title="Sin habilidades en esta vista">Selecciona otra asignatura o cambia el filtro.</Empty>}{matchingSkills.length > pathLimit && <button className="btn secondary" onClick={() => setPathLimit(value => value + 5)}>Mostrar cinco habilidades más</button>}
      {profile === "rocio" && <WordCollection studentId={profile} entries={data.word_entries || []} act={act} notify={notify}/>}
    </>}
    {tab === "Practicar" && <>
      <div className="sv-section-intro"><span className="sv-icon-box"><PencilLine size={23}/></span><div><h1>Practicar</h1></div></div>
      {pendingWork.length > 0 && <section className="sv-stack sv-assigned-work" aria-labelledby="assigned-work-title"><div className="sv-assigned-heading"><h2 ref={assignedHeading} tabIndex={-1} id="assigned-work-title" className="sw-section-title">Lo que tienes asignado</h2></div><div className="grid-2">{pendingWork.map(work => <AssignedActivityCard key={work.assignment.id} work={work} sequence={pendingWork.filter(item => item.activity.id === work.activity.id).length > 1 ? pendingWork.filter(item => item.activity.id === work.activity.id).findIndex(item => item.assignment.id === work.assignment.id) + 1 : undefined} onOpen={() => openActivity(work.activity, work.assignment, "", work.assignment.id)}/>)}</div></section>}
      {pendingWork.length > 0 && <h2 className="sw-section-title sv-more-practice-title">Más para practicar</h2>}
      <div className="sv-practice-sections" role="group" aria-label="Contenido de Practicar">
        <button type="button" className={practiceSection === "exercises" ? "active" : ""} aria-pressed={practiceSection === "exercises"} onClick={() => switchPracticeSection("exercises")}><PencilLine size={18} aria-hidden="true"/>Ejercicios</button>
        <button type="button" className={practiceSection === "resources" ? "active" : ""} aria-pressed={practiceSection === "resources"} onClick={() => switchPracticeSection("resources")}><BookOpen size={18} aria-hidden="true"/>Recursos y materiales</button>
      </div>
      {practiceSection === "exercises" && <section className="sv-stack sv-practice-panel" aria-label="Ejercicios">
      <label className="sv-search ss-practice-search"><Search size={17} aria-hidden="true"/><input aria-label="Buscar ejercicios" value={search} onChange={event => { setSearch(event.target.value); setLimit(5); }} placeholder="Buscar ejercicios…"/></label>
      <details className="ss-filters"><summary>Filtrar ejercicios{practiceMode !== "Sin hacer" ? ` · ${practiceMode}` : subject || skillFilter ? " · Activos" : ""}</summary><div className="sv-stack ss-filter-content">
      <div className="sv-chip-tabs" role="group" aria-label="Estado de las actividades">{["Sin hacer", "Hechos", "Todos"].map(mode => <button type="button" key={mode} className={mode === practiceMode ? "active" : ""} aria-pressed={mode === practiceMode} onClick={() => setPracticeView(mode)}>{mode}</button>)}</div>
      <div className="sv-practice-filters"><label className="sv-select-label">Asignatura<select value={subject} onChange={event => { setSubject(event.target.value); setSkillFilter(""); setLimit(5); }}><option value="">Todas las asignaturas</option>{subjects.map(name => <option key={name}>{name}</option>)}</select></label><label className="sv-select-label">Tema<select value={skillFilter} onChange={event => { setSkillFilter(event.target.value); setLimit(5); }}><option value="">Todos los temas</option>{skills.filter(item => !subject || item.subject === subject).map(item => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label></div>

      </div></details>
      <p className="muted ss-result-count" role="status">{matchingActivities.length} {matchingActivities.length === 1 ? "ejercicio" : "ejercicios"}</p>
      {Array.from(groupedActivities.entries()).map(([name, items]) => <section className="sv-stack sw-activity-group" key={name}><h2 className="sw-section-title">{name}</h2><div className="grid-2">{items.map(item => <ActivityCard key={item.id} activity={item} assignment={assignmentFor(item.id)} response={latestFor(item.id)} count={historyFor(item.id).length} onOpen={() => openActivity(item)}/>)}</div></section>)}
      {!matchingActivities.length && <Empty icon={Search} title="Sin ejercicios en esta selección">Prueba otro filtro o búsqueda.<br/><button className="btn secondary sv-practice-clear" onClick={() => { clearFilters(); setPracticeView("Todos"); }}>Ver todos los ejercicios</button></Empty>}
      {matchingActivities.length > limit && <button className="btn secondary" onClick={() => setLimit(value => value + 5)}>Mostrar más ejercicios</button>}
      </section>}
      {practiceSection === "resources" && <section className="sv-stack sv-practice-panel" aria-label="Recursos y materiales">
      <label className="sv-search ss-practice-search"><Search size={17} aria-hidden="true"/><input aria-label="Buscar recursos y materiales" value={resourceSearch} onChange={event => { setResourceSearch(event.target.value); setReturnResource(""); setResourceLimit(5); }} placeholder="Buscar recursos…"/></label>
      <details className="ss-filters"><summary>Filtros y favoritos{resourceMode !== "Todos" ? ` · ${resourceMode}` : resourceSubject || resourceType ? " · Activos" : ""}</summary><div className="sv-stack ss-filter-content">
      <div className="sv-chip-tabs" role="group" aria-label="Selección de recursos">{["Todos", "Fichas PDF", "Favoritos", "Elegidos por el docente"].map(mode => <button key={mode} type="button" className={resourceMode === mode ? "active" : ""} aria-pressed={resourceMode === mode} onClick={() => { setResourceMode(mode); setReturnResource(""); setResourceLimit(5); }}>{mode}</button>)}</div>
      <div className="ss-resource-filters"><label className="sv-select-label">Asignatura<select value={resourceSubject} onChange={event => { setResourceSubject(event.target.value); setReturnResource(""); setResourceLimit(5); }}><option value="">Todas</option>{subjects.map(name => <option key={name}>{name}</option>)}</select></label><label className="sv-select-label">Tipo<select value={resourceType} onChange={event => { setResourceType(event.target.value); setReturnResource(""); setResourceLimit(5); }}><option value="">Todos</option>{[...new Set(resources.map(item => item.type).filter(Boolean))].map(type => <option key={type}>{type}</option>)}</select></label></div>
      <button className="btn quiet" onClick={clearResourceFilters}>Limpiar filtros</button></div></details>
      <p className="muted ss-result-count" role="status">{matchingResources.length} {matchingResources.length === 1 ? "recurso" : "recursos"}</p>
      {returnedResource && <p className="sv-practice-return-note" role="status">Último recurso consultado.</p>}
      <div className="grid-2">{displayedResources.map(resource => { const pdf = pdfFileForResource(resource, data.files || []), linkedActivity = resourceActivity(resource.id), history = responsesForResource(resource.id, profile, responses, activities), unread = history.some(item => item.reviewStatus === "reviewed" && isUnread(profile, item)); return <article className="card sv-pad sv-resource ss-resource-card" key={resource.id}><div className="sv-card-top"><Subject value={resource.subject}/><button className="sw-favorite" type="button" disabled={favoriteBusy} aria-pressed={favoriteIds.includes(resource.id)} aria-label={`${favoriteIds.includes(resource.id) ? "Quitar de favoritos" : "Añadir a favoritos"}: ${resource.title}`} onClick={() => toggleFavorite(resource.id)}><Star size={19} fill={favoriteIds.includes(resource.id) ? "currentColor" : "none"}/></button></div><div className="row wrap sw-resource-tags">{returnedResource?.id === resource.id && <span className="badge">Recurso consultado</span>}{unread && <span className="badge green">Revisión nueva</span>}<span className="muted sv-small">{pdf ? "PDF" : resource.type}</span></div><h3><MathText subject={resource.subject}>{resource.title}</MathText></h3><button className="btn secondary sv-resource-open" data-resource-id={resource.id} onClick={() => openResource(resource)}>{pdf ? "Abrir ficha" : "Abrir recurso"}<ArrowRight size={16}/></button></article>; })}</div>
      {!matchingResources.length && !returnedResource && <Empty icon={Search} title={resources.length ? "Sin recursos con estos filtros" : "Sin recursos disponibles"}>{resources.length ? "Cambia la selección o limpia los filtros para consultar los recursos y materiales." : "El docente puede añadir enlaces y materiales."}<br/><button className="btn secondary sv-practice-clear" onClick={clearResourceFilters}>Limpiar filtros</button></Empty>}{matchingResources.length > resourceLimit && <button className="btn secondary" onClick={() => setResourceLimit(value => value + 5)}>Mostrar más recursos</button>}
      </section>}
    </>}
    {tab === "Mis clases" && <>
      <div className="sv-section-intro"><span className="sv-icon-box"><BookOpen size={23}/></span><div><h1>Mis clases</h1><p>Lo que hemos trabajado, las explicaciones y los materiales de clase.</p></div></div>
      {!sessions.length ? <Empty title="Sin clases realizadas">Los resúmenes y materiales aparecerán aquí después de cada clase.</Empty> : <div className="sv-session-list">{sessions.slice(0, sessionLimit).map(session => <button className="card sv-session-card" key={session.id} data-session-id={session.id} onClick={() => openSession(session)}><span className="sv-calendar-date"><strong>{new Date(`${session.date}T12:00:00`).getDate()}</strong><span>{new Date(`${session.date}T12:00:00`).toLocaleDateString("es-ES", { month: "short" })}</span></span><div><Subject value={plain(session.subjects) || session.subject}/><h3>{session.objective || "Clase individual"}</h3><p>{session.sharedSummary || plain(session.content)}</p></div><ArrowRight size={18}/></button>)}</div>}{sessions.length > sessionLimit && <button className="btn secondary" onClick={() => setSessionLimit(value => value + 5)}>Mostrar cinco clases más</button>}
    </>}
    {selectedResource && <StudentResourceDialog key={`${profile}:${selectedResource.id}`} resource={selectedResource} student={student} data={data} act={act} notify={notify} onClose={closeResource}/>}
  </div>;
}
