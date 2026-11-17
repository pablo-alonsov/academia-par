import type { Profile } from "./server-auth";
import type { RecordData, TableName } from "./server-data";
function pick(item:RecordData,keys:string[]) { return Object.fromEntries(keys.filter(k=>item[k]!==undefined).map(k=>[k,item[k]])); }
const COMMON=["id","studentId","updatedAt"];
const STUDENT_FIELDS:Partial<Record<TableName,string[]>>={
  students:["name","level","color","avatar","avatarFileId","priorities","nextStep","mainActivityId","alternativeActivityId","pinnedResourceIds","favoriteResourceIds","curriculumFocus","subjectPlan","secondTermSubjects","resultVersion"],
  skills:["subject","title","state","reviewNeeded","lastCheck","evidence","nextStep","reviewDate","explanation","phase"],
  sessions:["date","subject","subjects","objective","duration","status","content","sharedSummary","explanation","materials","originalText","revisedText","nextStep","activityId","alternativeActivityId","closedAt","fileIds","resourceIds","activityIds"],
  resources:["title","url","fileId","fileIds","subject","skillId","type","duration","objective","instructions","level","description","accessNote","accessStatus","checkedAt","suggestedStudentIds","phase","availableFromTerm","supportMode","collection","examMode"],
  activities:["title","objective","subject","skillId","level","duration","instructions","materials","checkMethod","check","type","autoCheck","options","hints","suggestedStudentIds","resourceId","url","phase","availableFromTerm","supportMode"],
  assignments:["activityId","sessionId","category","dueDate","title"],
  responses:["assignmentId","activityId","resourceId","answer","hintsUsed","selfAssessment","comment","procedure","submissionId","autoResult","reviewStatus","feedback","result","fileIds","createdAt","reviewedAt","kind"],
  evidence:["skillId","sessionId","title","text","fileId","fileIds","createdAt","shared"],
  doubts:["question","status","createdAt","resolvedAt","reply"],
  exams:["date","title","subject","topics","skillIds","notes"],
  files:["name","type","size","url","sessionId","shared","createdAt","detached"],
  drafts:["targetType","activityId","resourceId","answer","comment","hintsUsed","fileIds","selfAssessment","procedure","clientRevision","createdAt"],
  word_entries:["original","corrected","reason","sentence","reviewDate","activityId","resourceId","sessionId","createdAt"],
};
export function allowedContent(item:RecordData,profile:Profile) {
  if(profile==="teacher") return true;
  if(item.studentId) return item.studentId===profile;
  return !item.suggestedStudentIds?.length || item.suggestedStudentIds.includes(profile);
}
export function studentDTO(table:TableName,item:RecordData) {
  if(table==="subjects") return pick(item,["id","name","color"]);
  const projected=pick(item,[...COMMON,...STUDENT_FIELDS[table] || []]);
  if(table==="activities"&&typeof projected.autoCheck!=="boolean")delete projected.autoCheck;
  return projected;
}
export function teacherDTO<T>(value:T):T{
  if(Array.isArray(value))return value.map(teacherDTO) as T;
  if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).filter(([key])=>key!=="_seed"&&key!=="_submissionNonce").map(([key,item])=>[key,teacherDTO(item)])) as T;
  return value;
}

