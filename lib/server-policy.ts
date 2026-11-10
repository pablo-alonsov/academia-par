import type { Profile } from "./server-auth";
import type { RecordData, TableName } from "./server-data";
function pick(item:RecordData,keys:string[]) { return Object.fromEntries(keys.filter(k=>item[k]!==undefined).map(k=>[k,item[k]])); }
const COMMON=["id","studentId","updatedAt"];
const STUDENT_FIELDS:Partial<Record<TableName,string[]>>={
  students:["name","level","color","avatar","priorities","nextStep","mainActivityId"],
  skills:["subject","title","state","reviewNeeded","lastCheck","evidence","nextStep","reviewDate"],
  sessions:["date","subject","subjects","objective","duration","status","content","sharedSummary","explanation","materials","originalText","revisedText","nextStep","activityId","alternativeActivityId","closedAt"],
  resources:["title","url","fileId","subject","skillId","type","duration","objective","instructions","level","description","accessNote","accessStatus","checkedAt","suggestedStudentIds"],
  activities:["title","objective","subject","skillId","level","duration","instructions","materials","checkMethod","check","type","options","hints","suggestedStudentIds","resourceId","url"],
  assignments:["activityId","sessionId","category","dueDate","title"],
  responses:["assignmentId","activityId","resourceId","answer","hintsUsed","selfAssessment","comment","autoResult","reviewStatus","feedback","result","fileIds","createdAt","reviewedAt","kind"],
  evidence:["skillId","sessionId","title","text","fileId","fileIds","createdAt","shared"],
  doubts:["question","status","createdAt","resolvedAt","reply"],
  exams:["date","title","subject","topics","skillIds","notes"],
  files:["name","type","size","url","sessionId","shared","createdAt"],
};
export function allowedContent(item:RecordData,profile:Profile) {
  if(profile==="teacher") return true;
  if(item.studentId) return item.studentId===profile;
  return !item.suggestedStudentIds?.length || item.suggestedStudentIds.includes(profile);
}
export function studentDTO(table:TableName,item:RecordData) {
  if(table==="subjects") return pick(item,["id","name","color"]);
  return pick(item,[...COMMON,...STUDENT_FIELDS[table] || []]);
}

