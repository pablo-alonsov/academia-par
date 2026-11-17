"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, ExternalLink, FileText, Flag, NotebookPen, PencilLine, Search, Star } from "lucide-react";
import StudyPlan from "./StudyPlan";
import { PersonalizationPanel, StudentAvatar, studentColors, WordCollection } from "./StudentTools";
import { StudentActivityDetail, StudentResourceDialog, studentDate, WorkFiles } from "./StudentWork";
import { initializeReadState, isUnread, markRead } from "./StudentReadState";
import { studentDrafts } from "./StudentDrafts";
import { useStudentLocalForms } from "./StudentLocalForms";
import { isTrackingDate } from "@/lib/academy-config";
import StudentHome from "./StudentHome";
import StudentClassDetail from "./StudentClassDetail";
import MathText from "./MathText";
import { responsesForActivity, responsesForResource, linkedResourceActivity } from "@/lib/resource-work";
import { hasCompletedActivity, needsActivityRetry, type HomeWork } from "./student-home";
import { hasCompletedAssignment } from '@/lib/activity-completion';
import { pendingTeacherAssignments, type PendingTeacherWork } from "./student-assignments";
import { groupResourcesBySource, pdfFileForResource } from "@/lib/resource-files";
import { examModeLabel, isExamPreparation } from '@/lib/exam-materials';
import { usePlatformNavigation } from './PlatformNavigation';
import "./student.css";
import "./student-simple.css";

type Item = Record<string, any>;
type PracticeSection = "exercises" | "resources" | "exam-prep";
type Props = { data: Item; profile: string; tab: string; act: (action: string, data: Item) => Promise<any>; notify: (message: string) => void; onNavigate?: (tab: string) => void | Promise<void>; onRefresh?: () => Promise<void>; personalizationRequested?: boolean; onPersonalizationOpened?: () => void };
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
function ActivityCard({ activity, assignment, response, retry = false, onOpen }: any) {
  const previousContext = response && (response.activityId !== activity.id || assignment && assignment.category !== "Opcionales" && response.assignmentId !== assignment.id);
  return <button type="button" className="card sv-activity-card ss-activity-card" data-activity-id={activity.id} onClick={onOpen}><div className="sv-card-top"><Subject value={activity.subject}/></div><div className="sv-activity-body ss-activity-body"><h3><MathText subject={activity.subject}>{activity.title}</MathText></h3></div><div className="sv-activity-footer"><div className="row wrap">{retry ? <span className="badge amber">Reintentar</span> : response?.reviewStatus === "reviewed" && <span className="badge green">{previousContext ? "Revisión anterior" : "Revisada"}</span>}</div><ArrowRight size={18} aria-hidden="true"/></div></button>;
}

function AssignedActivityCard({ work, sequence, retry = false, onOpen }: { work: PendingTeacherWork; sequence?: number; retry?: boolean; onOpen: () => void }) {
  const { assignment, activity, dueDate } = work;
  return <button type="button" className="card sv-activity-card sv-assigned-card ss-activity-card" data-assignment-id={assignment.id} onClick={onOpen}><div className="sv-card-top"><Subject value={activity.subject}/>{retry && <span className="badge amber">Reintentar</span>}</div><div className="sv-activity-body ss-activity-body">{sequence && <span className="sv-assignment-context">Ejercicio {sequence}</span>}<h3><MathText subject={activity.subject}>{assignment.title || activity.title}</MathText></h3></div>{dueDate && <p className="sv-assignment-due">Fecha: <time dateTime={dueDate}>{studentDate(dueDate)}</time></p>}<span className="sv-assignment-open">Abrir<ArrowRight size={18} aria-hidden="true"/></span></button>;
}

function ResourceCard({ resource, pdf, material, unread, consulted, favorite, busy, onFavorite, onOpen }: any) {
  return <article className="card sv-pad sv-resource ss-resource-card">
    <div className="sv-card-top"><Subject value={resource.subject}/><button className="sw-favorite" type="button" disabled={busy} aria-pressed={favorite} aria-label={`${favorite?"Quitar de favoritos":"Añadir a favoritos"}: ${resource.title}`} onClick={onFavorite}><Star size={19} fill={favorite?"currentColor":"none"}/></button></div>
    <div className="row wrap sw-resource-tags">{consulted&&<span className="badge">Recurso consultado</span>}{unread&&<span className="badge green">Revisión nueva</span>}{isExamPreparation(resource)&&<span className="badge blue">{examModeLabel(resource.examMode)}</span>}<span className="muted sv-small">{pdf?"PDF":resource.type||(material?"Material de clase":"Web")}</span></div>
    <h3><MathText subject={resource.subject}>{resource.title}</MathText></h3>
    <button className="btn secondary sv-resource-open" data-resource-id={resource.id} onClick={onOpen}>{pdf?"Abrir ficha":material?"Ver material":"Abrir recurso"}<ArrowRight size={16}/></button>
  </article>;
}

export default function StudentViews({ data, profile, tab, act, notify, onNavigate, onRefresh, personalizationRequested, onPersonalizationOpened }: Props) {
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
  const [practiceSection, setPracticeSection] = useState<PracticeSection>("exercises");
  const [resourceSubject, setResourceSubject] = useState(""), [resourceSearch, setResourceSearch] = useState(""), [resourceLimit, setResourceLimit] = useState(5), [materialLimit, setMaterialLimit] = useState(5);
  const [practiceMode, setPracticeMode] = useState("Sin hacer"), [limit, setLimit] = useState(5);
  const [pathMode, setPathMode] = useState("Ahora"), [pathLimit, setPathLimit] = useState(5), [resourceMode, setResourceMode] = useState("Todos"), [resourceType, setResourceType] = useState(""), [favoriteBusy, setFavoriteBusy] = useState(false), [sessionLimit, setSessionLimit] = useState(5);
  const [localVersion, setLocalVersion] = useState(0), [readVersion, setReadVersion] = useState(0);
  const [examSearch, setExamSearch] = useState(""), [examLimit, setExamLimit] = useState(6);
  useEffect(() => { setMaterialLimit(5); }, [resourceSubject, resourceSearch, resourceType, resourceMode]);
  const activityReturn = useRef({ top: 0, id: "", resourceId: "", sessionId: "", sourceAssignmentId: "", assignmentIndex: -1, listIndex:0, section: "exercises" as PracticeSection }), resourceReturn = useRef({ top: 0, id: "", section: "exercises" as PracticeSection }), sessionReturn = useRef({ top: 0, id: "" }), sessionHeading = useRef<HTMLHeadingElement>(null);
  const drafts: Item[] = useMemo(() => studentDrafts(profile, data.drafts || []), [profile, data.drafts, localVersion]);
  useEffect(() => { const refresh = () => setLocalVersion(value => value + 1), reviews = () => setReadVersion(value => value + 1); window.addEventListener("arp:drafts-changed", refresh); window.addEventListener("storage", refresh); window.addEventListener("arp-review-read-changed", reviews); initializeReadState(profile, data.responses || [], data.doubts || []); return () => { window.removeEventListener("arp:drafts-changed", refresh); window.removeEventListener("storage", refresh); window.removeEventListener("arp-review-read-changed", reviews); }; }, [profile]);
  useEffect(() => { setSubject(""); setSearch(""); setSkillFilter(""); setLimit(5); setPathLimit(5); }, [tab, profile]);
  useEffect(() => { if (sessionId) sessionHeading.current?.focus({ preventScroll: true }); }, [sessionId]);
  const pendingWork = pendingTeacherAssignments(profile, assignments, activities, responses, student.mainActivityId);
  const pendingActivityIds = new Set(pendingWork.map(work => work.activity.id));
  const assignedHeading = useRef<HTMLHeadingElement>(null);
  const assignmentFor = (id: string) => assignments.find(item => item.activityId === id && item.category !== "Opcionales" && !hasCompletedAssignment(activities.find(activity => activity.id === id) || {}, item, responses)) || assignments.find(item => item.activityId === id);
  const historyFor = (id: string) => { const activity = activities.find(item => item.id === id); return activity ? responsesForActivity(activity, profile, responses, activities) : []; };
  const latestFor = (id: string) => historyFor(id)[0];
  const resourceActivity = (id: string, preferred?: string) => linkedResourceActivity(id, profile, activities, assignments, preferred);
  const openActivity = (activity: Item, assignment = assignmentFor(activity.id), fromResourceId = "", sourceAssignmentId = "") => { activityReturn.current = { id: activity.id, top: window.scrollY, resourceId: fromResourceId, sessionId, sourceAssignmentId, assignmentIndex: sourceAssignmentId ? pendingWork.findIndex(work => work.assignment.id === sourceAssignmentId) : -1, listIndex:Math.max(0,matchingActivities.findIndex(item=>item.id===activity.id)), section: practiceSection }; void navigation.navigate({tab,detail:{kind:'activity',id:activity.id,assignmentId:assignment?.id || '',source:practiceSection,sourceAssignmentId}}); };
  const restoreResourceCard = (id: string, top: number) => { requestAnimationFrame(() => { const target = document.querySelector<HTMLElement>(`[data-resource-id="${CSS.escape(id)}"]`); if (target) { revealStudentTarget(target); target.focus({ preventScroll: true }); target.scrollIntoView({ block: "center", behavior: "auto" }); } else window.scrollTo({ top, behavior: "auto" }); }); };
  const restoreActivity = () => {
    const previous = activityReturn.current, id = previous.id;
    if (previous.sessionId && previous.resourceId) { restoreResourceCard(previous.resourceId, previous.top); return; }
    if (tab === "Practicar" && previous.sourceAssignmentId) {
      requestAnimationFrame(() => { const remaining = pendingWork.find(work => work.assignment.id === previous.sourceAssignmentId) || pendingWork[Math.max(0, Math.min(previous.assignmentIndex, pendingWork.length - 1))]; const target = remaining ? document.querySelector<HTMLElement>(`[data-assignment-id="${CSS.escape(remaining.assignment.id)}"]`) : document.querySelector<HTMLElement>('.sv-practice-sections button[aria-pressed="true"]'); if (target) { revealStudentTarget(target); target.focus({ preventScroll: true }); target.scrollIntoView({ block: "center", behavior: "auto" }); } else assignedHeading.current?.focus({ preventScroll: true }); });
      return;
    }
    if (tab === "Practicar" && (previous.section === "resources" || previous.section === "exam-prep")) { setPracticeSection(previous.section); setReturnResource(previous.resourceId); setResourceLimit(value => Math.max(value, 5)); }
    if (tab === "Practicar" && (previous.section === "resources" || previous.section === "exam-prep") && previous.resourceId) restoreResourceCard(previous.resourceId, previous.top);
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
    if (detail?.kind === 'activity' && activityReturn.current.id !== detail.id) activityReturn.current = {id:detail.id,top:0,resourceId:activities.find(item=>item.id===detail.id)?.resourceId || '',sessionId:'',sourceAssignmentId:detail.sourceAssignmentId || '',assignmentIndex:pendingWork.findIndex(work=>work.assignment.id===detail.sourceAssignmentId),listIndex:0,section:detail.source || 'exercises'};
    if (detail?.kind === 'resource' && resourceReturn.current.id !== detail.id) resourceReturn.current = {id:detail.id,top:0,section:detail.source || 'resources'};
    if (detail?.kind === 'student-session' && sessionReturn.current.id !== detail.id) sessionReturn.current = {id:detail.id,top:0};
    if (previous?.kind === 'activity' && !activityId) restoreActivity();
    if (previous?.kind === 'resource' && !resourceId) { const returned=resourceReturn.current; if(returned.section==='resources'||returned.section==='exam-prep'){setPracticeSection(returned.section);setReturnResource(returned.id);} restoreResourceCard(returned.id,returned.top); }
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
    const assignment = assignmentFor(item.id), completed = hasCompletedActivity(item, assignment, responses);
    const modeMatches = practiceMode === "Todos" || practiceMode === "Sin hacer" && !completed || practiceMode === "Hechos" && completed;
    return modeMatches && (!subject || item.subject === subject) && (!skillFilter || item.skillId === skillFilter) && (!searchText(search) || searchText([item.title, item.objective, item.instructions, skills.find(skill => skill.id === item.skillId)?.title].filter(Boolean).join(" ")).includes(searchText(search)));
  }).sort((a, b) => (a.id === student.mainActivityId ? -1 : b.id === student.mainActivityId ? 1 : (practiceMode === "Hechos" ? sortRecent(latestFor(a.id) || {}, latestFor(b.id) || {}) : Number(Boolean(assignmentFor(b.id) && assignmentFor(b.id)?.category !== "Opcionales")) - Number(Boolean(assignmentFor(a.id) && assignmentFor(a.id)?.category !== "Opcionales")) || a.title.localeCompare(b.title, "es"))));
  const visibleActivities = matchingActivities.slice(0, limit), groupedActivities = new Map<string, Item[]>();
  visibleActivities.forEach(item => groupedActivities.set(item.subject, [...(groupedActivities.get(item.subject) || []), item]));
  const matchingSkills = skills.filter(item => (!subject || item.subject === subject) && (pathMode === "Todo" || pathMode === "Ahora" && !futureSkill(item) || pathMode === "Conviene repasar" && item.reviewNeeded || pathMode === "Más adelante" && futureSkill(item)));
  const classResources = resources.filter(item => !isExamPreparation(item));
  const matchingResources = classResources.filter(item => (!resourceSubject || item.subject === resourceSubject) && (!resourceType || item.type === resourceType) && (resourceMode === "Todos" || resourceMode === "Favoritos" && favoriteIds.includes(item.id) || resourceMode === "Elegidos por el docente" && (item.pinned || pinnedIds.includes(item.id))) && (!searchText(resourceSearch) || searchText(`${item.title} ${item.objective}`).includes(searchText(resourceSearch)))).sort((a, b) => (a.id === returnResource ? -1 : b.id === returnResource ? 1 : 0) || Number(Boolean(b.pinned || pinnedIds.includes(b.id))) - Number(Boolean(a.pinned || pinnedIds.includes(a.id))) || Number(favoriteIds.includes(b.id)) - Number(favoriteIds.includes(a.id)) || a.title.localeCompare(b.title, "es"));
  const returnedResource = returnResource && !matchingResources.some(item => item.id === returnResource) ? classResources.find(item => item.id === returnResource) : undefined;
  const resourceGroups = groupResourcesBySource([...(returnedResource ? [returnedResource] : []), ...matchingResources], data.files || []);
  const examResources = resources.filter(item => isExamPreparation(item) && Boolean(pdfFileForResource(item, data.files || [])));
  const matchingExamResources = examResources.filter(item => !searchText(examSearch) || searchText(`${item.title} ${item.subject || ""}`).includes(searchText(examSearch))).sort((a,b) => (a.id===returnResource?-1:b.id===returnResource?1:0) || sortRecent(a,b) || a.title.localeCompare(b.title,"es"));
  const returnedExamResource = returnResource && !matchingExamResources.some(item=>item.id===returnResource) ? examResources.find(item=>item.id===returnResource) : undefined;
  const visibleExamResources = [...(returnedExamResource?[returnedExamResource]:[]), ...matchingExamResources.slice(0,examLimit)];
  const renderResourceCard = (resource: Item, material: boolean, consulted = false) => {
    const pdf=pdfFileForResource(resource,data.files||[]),history=responsesForResource(resource.id,profile,responses,activities),unread=history.some(item=>item.reviewStatus==="reviewed"&&isUnread(profile,item));
    return <ResourceCard key={resource.id} resource={resource} pdf={pdf} material={material} unread={unread} consulted={consulted} favorite={favoriteIds.includes(resource.id)} busy={favoriteBusy} onFavorite={()=>toggleFavorite(resource.id)} onOpen={()=>openResource(resource)}/>;
  };
  const clearResourceFilters = () => { setResourceSubject(""); setResourceSearch(""); setResourceType(""); setResourceMode("Todos"); setReturnResource(""); setResourceLimit(5); setMaterialLimit(5); };
  const switchPracticeSection = (section: PracticeSection) => { setPracticeSection(section); setReturnResource(""); if(section !== "exercises") void onRefresh?.().catch(()=>notify("No se han podido actualizar los materiales.")); };
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

  if (selectedActivity) return <StudentActivityDetail key={`${profile}:${activityId}`} activity={{ ...selectedActivity, url: selectedActivity.url || resources.find(item => item.id === selectedActivity.resourceId)?.url }} assignment={assignments.find(item => item.id === assignmentId)} student={student} data={data} act={act} notify={notify} onBack={closeActivity} backLabel={activityReturn.current.sessionId ? "Volver a la clase" : tab === "Inicio" ? "Volver a Inicio" : tab === "Practicar" && activityReturn.current.sourceAssignmentId ? "Volver a mis encargos" : tab === "Practicar" && activityReturn.current.section === "exam-prep" ? "Volver a preparar exámenes" : tab === "Practicar" && activityReturn.current.section === "resources" ? "Volver a fichas y enlaces" : tab === "Mis clases" ? "Volver a mis clases" : "Volver a practicar"}/>;
  if (selectedSession) return <StudentClassDetail session={selectedSession} student={student} resources={resources} activities={activities} files={data.files || []} assignments={assignments} evidence={data.evidence || []} headingRef={sessionHeading} onBack={closeSession} backLabel={tab === "Inicio" ? "Volver a Inicio" : "Volver a mis clases"} onOpenResource={openResource} onOpenActivity={openActivity}/>;

  return <div className={`student-views sv-stack ss-student-lists sv-${profile}`} style={{ "--sv-accent": color.color, "--sv-soft": color.soft } as React.CSSProperties} data-review-version={readVersion}>
    {tab === "Inicio" && <>
      <div className="sv-welcome"><div className="row sw-student-heading"><StudentAvatar student={student}/><div><span className="eyebrow">INICIO</span><h1>{student.name}</h1><p>{student.level}</p></div></div></div>
      <StudentHome student={student} activities={activities} resources={resources} assignments={assignments} responses={responses} skills={skills} draftOptions={homeDraftOptions} attemptedIds={activities.filter(item => hasCompletedActivity(item, assignmentFor(item.id), responses)).map(item => item.id)} sessions={sessions} latestCheck={latestCheck} exams={exams} feedback={feedback} onOpenWork={openHomeWork} onOpenSession={openSession} onFeedback={showFeedback} onNavigate={onNavigate}/>
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
      {pendingWork.length > 0 && <section className="sv-stack sv-assigned-work" aria-labelledby="assigned-work-title"><div className="sv-assigned-heading"><h2 ref={assignedHeading} tabIndex={-1} id="assigned-work-title" className="sw-section-title">Lo que tienes asignado</h2></div><div className="grid-2">{pendingWork.map(work => <AssignedActivityCard key={work.assignment.id} work={work} retry={needsActivityRetry(work.activity, work.assignment, responses)} sequence={pendingWork.filter(item => item.activity.id === work.activity.id).length > 1 ? pendingWork.filter(item => item.activity.id === work.activity.id).findIndex(item => item.assignment.id === work.assignment.id) + 1 : undefined} onOpen={() => openActivity(work.activity, work.assignment, "", work.assignment.id)}/>)}</div></section>}
      {pendingWork.length > 0 && <h2 className="sw-section-title sv-more-practice-title">Más para practicar</h2>}
      <div className="sv-practice-sections" role="group" aria-label="Contenido de Practicar">
        <button type="button" className={practiceSection === "exercises" ? "active" : ""} aria-pressed={practiceSection === "exercises"} onClick={() => switchPracticeSection("exercises")}><PencilLine size={18} aria-hidden="true"/>Ejercicios</button>
        <button type="button" className={practiceSection === "resources" ? "active" : ""} aria-pressed={practiceSection === "resources"} onClick={() => switchPracticeSection("resources")}><BookOpen size={18} aria-hidden="true"/>Fichas y enlaces</button>
        <button type="button" className={practiceSection === "exam-prep" ? "active" : ""} aria-pressed={practiceSection === "exam-prep"} onClick={() => switchPracticeSection("exam-prep")}><NotebookPen size={18} aria-hidden="true"/>Preparar exámenes</button>
      </div>
      {practiceSection === "exercises" && <section className="sv-stack sv-practice-panel" aria-label="Ejercicios">
      <label className="sv-search ss-practice-search"><Search size={17} aria-hidden="true"/><input aria-label="Buscar ejercicios" value={search} onChange={event => { setSearch(event.target.value); setLimit(5); }} placeholder="Buscar ejercicios…"/></label>
      <details className="ss-filters"><summary>Filtrar ejercicios{practiceMode !== "Sin hacer" ? ` · ${practiceMode}` : subject || skillFilter ? " · Activos" : ""}</summary><div className="sv-stack ss-filter-content">
      <div className="sv-chip-tabs" role="group" aria-label="Estado de las actividades">{["Sin hacer", "Hechos", "Todos"].map(mode => <button type="button" key={mode} className={mode === practiceMode ? "active" : ""} aria-pressed={mode === practiceMode} onClick={() => setPracticeView(mode)}>{mode}</button>)}</div>
      <div className="sv-practice-filters"><label className="sv-select-label">Asignatura<select value={subject} onChange={event => { setSubject(event.target.value); setSkillFilter(""); setLimit(5); }}><option value="">Todas las asignaturas</option>{subjects.map(name => <option key={name}>{name}</option>)}</select></label><label className="sv-select-label">Tema<select value={skillFilter} onChange={event => { setSkillFilter(event.target.value); setLimit(5); }}><option value="">Todos los temas</option>{skills.filter(item => !subject || item.subject === subject).map(item => <option value={item.id} key={item.id}>{item.title}</option>)}</select></label></div>

      </div></details>
      <p className="muted ss-result-count" role="status">{matchingActivities.length} {matchingActivities.length === 1 ? "ejercicio" : "ejercicios"}</p>
      {Array.from(groupedActivities.entries()).map(([name, items]) => <section className="sv-stack sw-activity-group" key={name}><h2 className="sw-section-title">{name}</h2><div className="grid-2">{items.map(item => <ActivityCard key={item.id} activity={item} assignment={assignmentFor(item.id)} response={latestFor(item.id)} retry={needsActivityRetry(item, assignmentFor(item.id), responses)} count={historyFor(item.id).length} onOpen={() => openActivity(item)}/>)}</div></section>)}
      {!matchingActivities.length && <Empty icon={Search} title="Sin ejercicios en esta selección">Prueba otro filtro o búsqueda.<br/><button className="btn secondary sv-practice-clear" onClick={() => { clearFilters(); setPracticeView("Todos"); }}>Ver todos los ejercicios</button></Empty>}
      {matchingActivities.length > limit && <button className="btn secondary" onClick={() => setLimit(value => value + 5)}>Mostrar más ejercicios</button>}
      </section>}
      {practiceSection === "resources" && <section className="sv-stack sv-practice-panel" aria-label="Fichas y enlaces">
      <label className="sv-search ss-practice-search"><Search size={17} aria-hidden="true"/><input aria-label="Buscar fichas y enlaces" value={resourceSearch} onChange={event => { setResourceSearch(event.target.value); setReturnResource(""); setResourceLimit(5); }} placeholder="Buscar fichas y enlaces…"/></label>
      <details className="ss-filters"><summary>Filtros y favoritos{resourceMode !== "Todos" ? ` · ${resourceMode}` : resourceSubject || resourceType ? " · Activos" : ""}</summary><div className="sv-stack ss-filter-content">
      <div className="sv-chip-tabs" role="group" aria-label="Selección de recursos">{["Todos", "Favoritos", "Elegidos por el docente"].map(mode => <button key={mode} type="button" className={resourceMode === mode ? "active" : ""} aria-pressed={resourceMode === mode} onClick={() => { setResourceMode(mode); setReturnResource(""); setResourceLimit(5); }}>{mode}</button>)}</div>
      <div className="ss-resource-filters"><label className="sv-select-label">Asignatura<select value={resourceSubject} onChange={event => { setResourceSubject(event.target.value); setReturnResource(""); setResourceLimit(5); }}><option value="">Todas</option>{subjects.map(name => <option key={name}>{name}</option>)}</select></label><label className="sv-select-label">Tipo<select value={resourceType} onChange={event => { setResourceType(event.target.value); setReturnResource(""); setResourceLimit(5); }}><option value="">Todos</option>{[...new Set(resources.map(item => item.type).filter(Boolean))].map(type => <option key={type}>{type}</option>)}</select></label></div>
      <button className="btn quiet" onClick={clearResourceFilters}>Limpiar filtros</button></div></details>
      <p className="muted ss-result-count" role="status">{matchingResources.length} {matchingResources.length === 1 ? "recurso" : "recursos"}</p>
      {returnedResource && <p className="sv-practice-return-note" role="status">Último recurso consultado.</p>}
      {[
        {id:"class-materials",title:"Fichas y PDF",description:"Materiales que compartimos en clase.",icon:FileText,items:resourceGroups.materials,limit:materialLimit,more:()=>setMaterialLimit(value=>value+5),moreLabel:"Mostrar más materiales",empty:resources.length&&!resourceGroups.materials.length&&(resourceSearch||resourceSubject||resourceType||resourceMode!=="Todos")?"No hay materiales con estos filtros.":"Aquí aparecerán las fichas y los archivos que comparta el docente."},
        {id:"external-resources",title:"Recursos externos",description:"Enlaces a otras páginas y actividades.",icon:ExternalLink,items:resourceGroups.external,limit:resourceLimit,more:()=>setResourceLimit(value=>value+5),moreLabel:"Mostrar más recursos externos",empty:resources.length&&!resourceGroups.external.length&&(resourceSearch||resourceSubject||resourceType||resourceMode!=="Todos")?"No hay recursos externos con estos filtros.":"Aquí aparecerán los enlaces para consultar y practicar."}
      ].map(group=><section key={group.id} className="sv-stack ss-resource-group" aria-labelledby={`${group.id}-title`}>
        <header className="ss-resource-group-heading"><span className="ss-resource-group-icon" aria-hidden="true"><group.icon size={22}/></span><div><h2 id={`${group.id}-title`}>{group.title}</h2><p>{group.description}</p></div><span className="badge">{group.items.length}</span></header>
        {group.items.length ? <div className="grid-2">{group.items.slice(0,group.limit).map(resource=>renderResourceCard(resource,group.id==="class-materials",returnedResource?.id===resource.id))}</div>:<p className="ss-resource-group-empty">{group.empty}</p>}
        {group.items.length>group.limit&&<button className="btn secondary ss-resource-group-more" onClick={group.more}>{group.moreLabel}</button>}
      </section>)}
      {!matchingResources.length && !returnedResource && (resourceSearch||resourceSubject||resourceType||resourceMode!=="Todos") && <button className="btn secondary sv-practice-clear" onClick={clearResourceFilters}>Limpiar filtros</button>}
      </section>}
      {practiceSection === "exam-prep" && <section className="sv-stack sv-practice-panel" aria-label="Preparar exámenes">
        <header className="ss-resource-group-heading"><span className="ss-resource-group-icon" aria-hidden="true"><NotebookPen size={22}/></span><div><h2>Fichas tipo examen</h2><p>PDF para trabajar en clase o por tu cuenta.</p></div></header>
        <label className="sv-search ss-practice-search"><Search size={17} aria-hidden="true"/><input aria-label="Buscar fichas de examen" value={examSearch} onChange={event=>{setExamSearch(event.target.value);setReturnResource("");setExamLimit(6)}} placeholder="Buscar por título o asignatura…"/></label>
        <p className="muted ss-result-count" role="status">{matchingExamResources.length} {matchingExamResources.length===1?"ficha":"fichas"}</p>
        {returnedExamResource&&<p className="sv-practice-return-note" role="status">Última ficha consultada.</p>}
        {visibleExamResources.length>0&&<div className="grid-2">{visibleExamResources.map(resource=>renderResourceCard(resource,true,returnedExamResource?.id===resource.id))}</div>}
        {!visibleExamResources.length&&<Empty icon={NotebookPen} title={examResources.length?"Sin fichas con esta búsqueda":"Todavía no hay fichas de examen"}>{examResources.length?"Prueba con otro título o asignatura.":"Las fichas que comparta el docente para preparar exámenes aparecerán aquí."}{examSearch&&<><br/><button className="btn secondary sv-practice-clear" onClick={()=>setExamSearch("")}>Limpiar búsqueda</button></>}</Empty>}
        {matchingExamResources.length>examLimit&&<button className="btn secondary" onClick={()=>setExamLimit(value=>value+6)}>Mostrar más fichas de examen</button>}
      </section>}
    </>}
    {tab === "Mis clases" && <>
      <div className="sv-section-intro"><span className="sv-icon-box"><BookOpen size={23}/></span><div><h1>Mis clases</h1><p>Resumen y materiales de cada clase.</p></div></div>
      {!sessions.length ? <Empty title="Todavía no hay clases guardadas">Aquí podrás consultar lo que trabajamos y los materiales de cada clase.</Empty> : <div className="sv-session-list">{sessions.slice(0, sessionLimit).map(session => <button className="card sv-session-card sc-session-card" key={session.id} data-session-id={session.id} onClick={() => openSession(session)}><div><h3>{studentDate(session.date)}</h3>{(session.sharedSummary || plain(session.content)) && <p><MathText subject={session.subject}>{session.sharedSummary || plain(session.content)}</MathText></p>}</div><ArrowRight size={18} aria-hidden="true"/></button>)}</div>}{sessions.length > sessionLimit && <button className="btn secondary" onClick={() => setSessionLimit(value => value + 5)}>Mostrar cinco clases más</button>}
    </>}
    {selectedResource && <StudentResourceDialog key={`${profile}:${selectedResource.id}`} resource={selectedResource} student={student} data={data} act={act} notify={notify} onClose={closeResource}/>}
  </div>;
}
