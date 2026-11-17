"use client";

import { ArrowLeft, ArrowRight, BookOpen, ExternalLink, FileText, PencilLine } from "lucide-react";
import MathText from "./MathText";
import { studentDate } from "./StudentWork";
import "./student-classes-simple.css";

type Item = Record<string, any>;
const plain = (value: unknown): string => Array.isArray(value) ? value.filter(item => typeof item === "string").join(" · ").trim() : typeof value === "string" ? value.trim() : "";
const ids = (value: unknown): string[] => Array.isArray(value) ? value.filter((id): id is string => typeof id === "string" && Boolean(id)) : [];
const distinct = (values: string[]) => [...new Set(values)];
const available = (item: Item, studentId: string) => item.studentId ? item.studentId === studentId : !item.suggestedStudentIds?.length || item.suggestedStudentIds.includes(studentId);

/** A read-only class note. School notes and teaching observations stay private. */
export default function StudentClassDetail({ session, student, resources = [], activities = [], files = [], assignments = [], evidence = [], onBack, backLabel, onOpenResource, onOpenActivity, headingRef }: any) {
  const summary = plain(session.content) || plain(session.sharedSummary);
  const selectedResourceIds = new Set(ids(session.resourceIds));
  const selectedResources: Item[] = resources.filter((item: Item) => selectedResourceIds.has(item.id) && available(item, student.id));
  const classAssignments: Item[] = assignments.filter((item: Item) => item.studentId === student.id && item.sessionId === session.id);
  const explicitSelection = Array.isArray(session.activityIds) || Array.isArray(session.resourceIds);
  const selectedActivityIds = new Set(explicitSelection ? ids(session.activityIds) : distinct([...[session.activityId, session.alternativeActivityId].filter((id): id is string => typeof id === "string" && Boolean(id)), ...classAssignments.map(item => item.activityId)]));
  const selectedActivities: Item[] = activities.filter((item: Item) => selectedActivityIds.has(item.id) && available(item, student.id) && !selectedResources.some(resource => resource.id === item.resourceId && ["paper", "external"].includes(item.type)));
  const classEvidence: Item[] = evidence.filter((item: Item) => item.studentId === student.id && item.sessionId === session.id && item.shared === true && item.detached !== true);
  const resourceFiles = new Set(selectedResources.flatMap(item => [...ids(item.fileIds), ...(typeof item.fileId === "string" ? [item.fileId] : [])]));
  const selectedFileIds = new Set(explicitSelection ? ids(session.fileIds) : distinct([...ids(session.fileIds), ...classEvidence.flatMap(item => [...ids(item.fileIds), ...(typeof item.fileId === "string" ? [item.fileId] : [])]), ...files.filter((item: Item) => item.sessionId === session.id).map((item: Item) => item.id)]));
  const selectedFiles: Item[] = files.filter((item: Item) => selectedFileIds.has(item.id) && !resourceFiles.has(item.id) && item.studentId === student.id && item.shared === true && item.detached !== true && !["avatar", "solution"].includes(item.purpose));
  const notes = [...new Set([plain(session.explanation), plain(session.materials), ...classEvidence.map(item => plain(item.text || item.description || item.content))].filter(value => value && value !== summary))];
  const original = plain(session.originalText), revised = plain(session.revisedText);
  const hasMaterials = selectedResources.length > 0 || selectedFiles.length > 0 || selectedActivities.length > 0;

  return <div className="student-views sv-stack sc-class-detail">
    <button className="btn quiet sv-back" onClick={onBack}><ArrowLeft size={17}/>{backLabel}</button>
    <div className="sv-detail-heading"><h1 ref={headingRef} tabIndex={-1}>Clase del {studentDate(session.date)}</h1></div>
    {summary && <section className="card sv-pad sc-class-note"><h2>Lo que hicimos</h2><p className="sv-preline"><MathText subject={session.subject}>{summary}</MathText></p></section>}
    {hasMaterials && <section className="card sv-pad sc-class-materials" aria-labelledby="class-materials-heading"><h2 id="class-materials-heading">Materiales y actividades</h2><div className="sc-class-links">
      {selectedResources.map(resource => <button className="sc-class-link" type="button" key={`resource:${resource.id}`} data-resource-id={resource.id} onClick={() => onOpenResource(resource)}><FileText size={20} aria-hidden="true"/><span><MathText subject={resource.subject}>{resource.title || "Material de clase"}</MathText></span><ArrowRight size={18} aria-hidden="true"/></button>)}
      {selectedFiles.map(file => <a className="sc-class-link" key={`file:${file.id}`} href={`/api/files/${encodeURIComponent(file.id)}${file.type === "application/pdf" ? "?view=inline#view=FitH" : ""}`} target="_blank" rel="noopener noreferrer"><FileText size={20} aria-hidden="true"/><span>{file.name || "Archivo de clase"}</span><ExternalLink size={17} aria-hidden="true"/></a>)}
      {selectedActivities.map(activity => <button className="sc-class-link" type="button" key={`activity:${activity.id}`} data-activity-id={activity.id} onClick={() => onOpenActivity(activity, classAssignments.find(item => item.activityId === activity.id))}><PencilLine size={20} aria-hidden="true"/><span><MathText subject={activity.subject}>{activity.title || "Actividad de clase"}</MathText></span><ArrowRight size={18} aria-hidden="true"/></button>)}
    </div></section>}
    {(notes.length > 0 || original || revised) && <details className="card sv-pad sc-class-notes"><summary><BookOpen size={18} aria-hidden="true"/>Apuntes de la clase</summary><div className="sc-class-notes-content">{notes.map((note, index) => <p className="sv-preline" key={index}><MathText subject={session.subject}>{note}</MathText></p>)}{original && <div><h3>Texto original</h3><p className="sv-preline"><MathText subject={session.subject}>{original}</MathText></p></div>}{revised && <div><h3>Texto revisado</h3><p className="sv-preline"><MathText subject={session.subject}>{revised}</MathText></p></div>}</div></details>}
    {!summary && !hasMaterials && !notes.length && !original && !revised && <p className="muted">Esta clase todavía no tiene un resumen ni materiales compartidos.</p>}
  </div>;
}
