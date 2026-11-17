import { AsyncLocalStorage } from "node:async_hooks";
import { allowedContent, studentDTO, teacherDTO } from "./server-policy";
export { allowedContent, studentDTO } from "./server-policy";
import { initialData } from "./seed";
import { legacySeedBaseline } from "./seed-baseline";
import { reconcileSeedRecord, sameSeedValue, type SeedDomain } from "./curriculum-reconcile";
import { database, HttpError, type Profile } from "./server-auth";
import { avatarUrl } from "./server-avatar";
import { fileIdFromUrl } from "./server-pdf-solutions";
import { learningContentAllowed, learningSubjectEnabled, learningStudentView, learningFileAllowed } from "./learning-content";

export type RecordData = Record<string, any>;
export const tables = ["students","subjects","skills","sessions","resources","activities","assignments","responses","evidence","observations","doubts","exams","files","drafts","word_entries"] as const;
export type TableName = typeof tables[number];
type Row = {id:string;student_id:string|null;data:string;updated_at:string};
type Changes=Map<TableName,Set<string>>;
const actionChanges=new AsyncLocalStorage<Changes>();
export function trackChange(table:TableName,id:string){const changes=actionChanges.getStore();if(!changes)return;const ids=changes.get(table)||new Set<string>();ids.add(id);changes.set(table,ids);}
export async function collectAction<T>(run:()=>Promise<T>){const changes:Changes=new Map();const result=await actionChanges.run(changes,run);return {result,changes};}
/** Apply only the requested profile fields; concurrent unrelated preferences win. */
export function studentPatchStatement(id:string,patch:RecordData,remove:string[]=[],avatarCommit?:{fileId:string;nonce:string}){
  const entries=Object.entries(patch).filter(([,value])=>value!==undefined);
  if([...entries.map(([key])=>key),...remove].some(key=>!/^[A-Za-z][A-Za-z0-9_]*$/.test(key)))throw new HttpError(400,"Campo de perfil no válido.");
  const now=new Date().toISOString(),stamp="CASE WHEN updated_at>=? THEN strftime('%Y-%m-%dT%H:%M:%fZ',updated_at,'+0.001 seconds') ELSE ? END";
  let expression=`json_set(data,${entries.map(([key])=>`'$.${key}',json(?)`).concat(`'$.updatedAt',${stamp}`).join(',')})`;
  if(remove.length)expression=`json_remove(${expression},${remove.map(key=>`'$.${key}'`).join(',')})`;
  trackChange("students",id);
  return database().prepare(`UPDATE students SET data=${expression},updated_at=${stamp} WHERE id=?${avatarCommit?" AND EXISTS (SELECT 1 FROM files WHERE id=? AND json_extract(data,'$._profileUploadNonce')=?)":""}`).bind(...entries.map(([,value])=>JSON.stringify(value)),now,now,now,now,id,...(avatarCommit?[avatarCommit.fileId,avatarCommit.nonce]:[]));
}
export function recordStatement(table:TableName,data:RecordData,ignore=false) {
  const id=String(data.id || crypto.randomUUID());
  const item:RecordData={...data,id,updatedAt:new Date().toISOString()};
  trackChange(table,id);
  return database().prepare(`INSERT ${ignore?"OR IGNORE ":""}INTO ${table} (id,student_id,data,updated_at) VALUES (?,?,?,?)${ignore?"":" ON CONFLICT(id) DO UPDATE SET student_id=excluded.student_id,data=excluded.data,updated_at=excluded.updated_at"}`).bind(id,table==="students"?id:item.studentId || null,JSON.stringify(item),item.updatedAt);
}
export function closureStatement(table:TableName,data:RecordData,sessionId:string,operationId:string,ignore=false) {
  const item:RecordData={...data,updatedAt:new Date().toISOString()};
  trackChange(table,item.id);
  return database().prepare(`INSERT ${ignore?"OR IGNORE ":""}INTO ${table} (id,student_id,data,updated_at) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM sessions WHERE id=? AND json_extract(data,'$.closeOperationId')=?)${ignore?"":" ON CONFLICT(id) DO UPDATE SET student_id=excluded.student_id,data=excluded.data,updated_at=excluded.updated_at"}`).bind(item.id,table==="students"?item.id:item.studentId || null,JSON.stringify(item),item.updatedAt,sessionId,operationId);
}
export function deleteStatement(table:TableName,id:string){trackChange(table,id);return database().prepare(`DELETE FROM ${table} WHERE id=?`).bind(id);}
export function submissionStatement(table:TableName,data:RecordData,responseId:string,nonce:string,ignore=false){
  const item:RecordData={...data,updatedAt:new Date().toISOString()};trackChange(table,item.id);
  return database().prepare(`INSERT ${ignore?"OR IGNORE ":""}INTO ${table} (id,student_id,data,updated_at) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM responses WHERE id=? AND json_extract(data,'$._submissionNonce')=?)${ignore?"":" ON CONFLICT(id) DO UPDATE SET student_id=excluded.student_id,data=excluded.data,updated_at=excluded.updated_at"}`).bind(item.id,item.studentId||null,JSON.stringify(item),item.updatedAt,responseId,nonce);
}
export async function put(table:TableName,data:RecordData) {
  const item:RecordData={...data,id:String(data.id || crypto.randomUUID())};
  await recordStatement(table,item).run(); return item;
}
export async function get(table:TableName,id:unknown) {
  if(typeof id!=="string" || id.length>400) throw new HttpError(400,"El identificador no es válido.");
  const row=await database().prepare(`SELECT * FROM ${table} WHERE id=?`).bind(id).first<Row>();
  return row?({...JSON.parse(row.data),id:row.id,studentId:row.student_id || undefined,updatedAt:row.updated_at} as RecordData):null;
}
export async function required(table:TableName,id:unknown) {
  const result=await get(table,id); if(!result) throw new HttpError(404,"No se encuentra este contenido."); return result;
}
export async function list(table:TableName) {
  const {results}=await database().prepare(`SELECT * FROM ${table} ORDER BY updated_at DESC`).all<Row>();
  return results.map(row=>({...JSON.parse(row.data),id:row.id,...(row.student_id?{studentId:row.student_id}:{}),updatedAt:row.updated_at} as RecordData));
}
export async function seed() {
  // Stable planned IDs evolve field by field. Historical sessions, responses,
  // observations, exams and evidence are deliberately outside this operation.
  const entries = initialData as Record<string, RecordData[]>;
  const legacy = legacySeedBaseline as unknown as Record<string, RecordData[]>;
  const statements: D1PreparedStatement[]=[];
  const domains:SeedDomain[]=["students","subjects","skills","activities","resources"];
  const existing=await Promise.all(domains.map(async table=>({table,rows:(await database().prepare(`SELECT * FROM ${table}`).all<Row>()).results})));
  for(const {table,rows} of existing) {
    const byId=new Map(rows.map(row=>[row.id,row]));
    const legacyById=new Map((legacy[table] || []).map(item=>[item.id,item]));
    for(const desired of entries[table] || []) {
      const row=byId.get(desired.id);
      const current=row?JSON.parse(row.data):null;
      const reconciled=reconcileSeedRecord(table,current,desired,legacyById.get(desired.id));
      if(!row){statements.push(recordStatement(table,reconciled,true));continue;}
      if(sameSeedValue(current,reconciled))continue;
      const now=new Date().toISOString();reconciled.updatedAt=now;
      // A teacher edit made after this read wins. A later refresh can reconcile
      // the untouched fields against its newer value without replacing the edit.
      statements.push(database().prepare(`UPDATE ${table} SET data=?,updated_at=? WHERE id=? AND data=? AND updated_at=? AND student_id IS ?`).bind(JSON.stringify(reconciled),now,row.id,row.data,row.updated_at,row.student_id));
    }
  }
  for(let i=0;i<statements.length;i+=80) await database().batch(statements.slice(i,i+80));
}
export async function snapshot(profile:Profile) {
  // Existing signed-in sessions receive curriculum updates on the next refresh.
  await seed();
  const result:Record<string,RecordData[]>={};
  const all=await Promise.all(tables.map(async table=>({table,items:await list(table)})));
  const files=new Map((all.find(x=>x.table==="files")?.items||[]).map(file=>[file.id,file]));
  const students=new Map((all.find(x=>x.table==="students")?.items||[]).map(student=>[student.id,student]));
  const references={resources:new Map((all.find(x=>x.table==="resources")?.items||[]).map(item=>[item.id,item])),activities:new Map((all.find(x=>x.table==="activities")?.items||[]).map(item=>[item.id,item])),skills:new Map((all.find(x=>x.table==="skills")?.items||[]).map(item=>[item.id,item]))};
  for(const {table,items} of all)result[table]=items.flatMap(item=>{const projected=projectRecord(profile,table,item,files,students,references);return projected?[projected]:[];});
  const pupilOrder=new Map([["rocio",0],["alejandra",1]]);result.students.sort((a,b)=>(pupilOrder.get(a.id)??2)-(pupilOrder.get(b.id)??2));
  // An assignment never makes another student's reusable activity available.
  const allowedActivityIds=new Set(result.activities.map(a=>a.id));
  result.assignments=result.assignments.filter(a=>allowedActivityIds.has(a.activityId));
  return result;
}
function fileVisible(file:RecordData|undefined,profile:Profile){return Boolean(file&&file.purpose!=="avatar"&&file.purpose!=="solution"&&file.studentId===profile&&file.shared===true&&file.detached!==true);}
type FileReferences={resources:Map<string,RecordData>;activities:Map<string,RecordData>;skills?:Map<string,RecordData>};
function linkedFileIds(item:RecordData){return [...(item.fileId?[item.fileId]:[]),...(Array.isArray(item.fileIds)?item.fileIds:[]),fileIdFromUrl(item.url)].filter((id):id is string=>typeof id==="string"&&Boolean(id));}
function referencesSolution(item:RecordData,files:Map<string,RecordData>,references:FileReferences):boolean{
  const direct=(record:RecordData)=>linkedFileIds(record).some(id=>files.get(id)?.purpose==="solution");
  if(direct(item))return true;
  const resource=references.resources.get(item.resourceId);if(resource&&direct(resource))return true;
  const activity=references.activities.get(item.activityId);
  return Boolean(activity&&(direct(activity)||(references.resources.has(activity.resourceId)&&direct(references.resources.get(activity.resourceId)!))));
}
function learningDisabled(item:RecordData,profile:Profile,references:FileReferences):boolean{
  if(!learningSubjectEnabled(profile,item.subject||item.subjectId||item.skillId))return true;
  const skill=references.skills?.get(item.skillId);if(skill&&!learningSubjectEnabled(profile,skill.subject))return true;
  const resource=references.resources.get(item.resourceId);if(resource&&!learningSubjectEnabled(profile,resource.subject||resource.skillId))return true;
  const activity=references.activities.get(item.activityId);
  if(activity){if(!learningSubjectEnabled(profile,activity.subject||activity.skillId))return true;const linked=references.resources.get(activity.resourceId);if(linked&&!learningSubjectEnabled(profile,linked.subject||linked.skillId))return true;}
  return false;
}
function currentStudentLearning(item:RecordData,references:FileReferences):RecordData{
  const projected=learningStudentView(item),profile=projected.id as Profile;
  for(const key of ["favoriteResourceIds","pinnedResourceIds"])if(Array.isArray(projected[key]))projected[key]=projected[key].filter((id:string)=>{const resource=references.resources.get(id);return !resource||!learningDisabled(resource,profile,references);});
  for(const key of ["mainActivityId","alternativeActivityId"]){const activity=references.activities.get(projected[key]);if(activity&&learningDisabled(activity,profile,references))delete projected[key];}
  return projected;
}
function classResourceVisible(id:unknown,profile:Profile,files:Map<string,RecordData>,references:FileReferences):boolean{
  if(typeof id!=="string")return false;
  const resource=references.resources.get(id);
  return Boolean(resource&&learningContentAllowed(resource,profile)&&!learningDisabled(resource,profile,references)&&resource.shared!==false&&resource.detached!==true&&linkedFileIds(resource).every(fileId=>fileVisible(files.get(fileId),profile)));
}
function classActivityVisible(id:unknown,profile:Profile,files:Map<string,RecordData>,references:FileReferences):boolean{
  if(typeof id!=="string")return false;
  const activity=references.activities.get(id);
  return Boolean(activity&&learningContentAllowed(activity,profile)&&!learningDisabled(activity,profile,references)&&activity.shared!==false&&activity.detached!==true&&linkedFileIds(activity).every(fileId=>fileVisible(files.get(fileId),profile))&&(!activity.resourceId||classResourceVisible(activity.resourceId,profile,files,references)));
}
export function projectRecord(profile:Profile,table:TableName,item:RecordData,files:Map<string,RecordData>=new Map(),students:Map<string,RecordData>=new Map(),references:FileReferences={resources:new Map(),activities:new Map()}):RecordData|null{
  if(table==="files"&&item.purpose==="avatar")return null;
  const linked=[...(item.fileId?[item.fileId]:[]),...(Array.isArray(item.fileIds)?item.fileIds:[])];
  if(profile==="teacher"){
    const projected=table==="students"?currentStudentLearning(teacherDTO(item),references):teacherDTO(item);
    if(table==="files"&&item.purpose==="solution"){delete projected._solutionUploadNonce;delete projected._solutionRestoreOperations;}
    if(table==="students"){delete projected.avatarUrl;const url=avatarUrl(item,files.get(item.avatarFileId));if(url)projected.avatarUrl=url;}
    if((table==="resources"||table==="evidence")&&linked.length){projected.fileUnavailable=linked.some(id=>{const f=files.get(id);return !f||f.purpose==="avatar"||f.detached===true||f.shared!==true;});projected.fileDetached=linked.some(id=>files.get(id)?.detached===true);}
    return projected;
  }
  if(!allowedContent(item,profile)||table==="observations"||(table==="students"&&item.id!==profile)||(table==="sessions"&&item.status!=="realizada"))return null;
  if(["resources","activities","assignments","drafts","responses","word_entries"].includes(table)&&referencesSolution(item,files,references))return null;
  if(["skills","resources","activities","assignments","drafts","responses","evidence","word_entries"].includes(table)&&learningDisabled(item,profile,references))return null;
  if(table==="files"&&!fileVisible(item,profile))return null;
  if(table==="files"&&!learningFileAllowed(item.id,profile,[...references.resources.values(),...references.activities.values()]))return null;
  if(table==="evidence"&&(item.shared!==true||item.detached===true))return null;
  if((table==="resources"||table==="evidence")&&(item.detached===true||item.shared===false||linked.some(id=>!fileVisible(files.get(id),profile))))return null;
  const projected=table==="students"?currentStudentLearning(studentDTO(table,item),references):studentDTO(table,item);
  if(table==="students"){
    for(const key of ["favoriteResourceIds","pinnedResourceIds"])if(Array.isArray(projected[key]))projected[key]=projected[key].filter((id:string)=>{const resource=references.resources.get(id);return !resource||!referencesSolution(resource,files,references);});
    for(const key of ["mainActivityId","alternativeActivityId"]){const activity=references.activities.get(projected[key]);if(activity&&referencesSolution(activity,files,references))delete projected[key];}
  }
  if(table==="sessions"){
    for(const key of ["activityId","alternativeActivityId"])if(projected[key]!==undefined&&!classActivityVisible(projected[key],profile,files,references))delete projected[key];
    if(projected.resourceIds!==undefined)projected.resourceIds=Array.isArray(projected.resourceIds)?projected.resourceIds.filter((id:unknown)=>classResourceVisible(id,profile,files,references)):[];
    if(projected.activityIds!==undefined)projected.activityIds=Array.isArray(projected.activityIds)?projected.activityIds.filter((id:unknown)=>classActivityVisible(id,profile,files,references)):[];
  }
  if(table==="students"){const url=avatarUrl(item,files.get(item.avatarFileId));if(url)projected.avatarUrl=url;}
  if(Array.isArray(projected.fileIds))projected.fileIds=projected.fileIds.filter((id:string)=>fileVisible(files.get(id),profile)&&learningFileAllowed(id,profile,[...references.resources.values(),...references.activities.values()]));
  if(table==="resources")projected.pinned=Boolean(students.get(profile)?.pinnedResourceIds?.includes(item.id));
  return projected;
}
export async function actionPatch(profile:Profile,changes:Changes){
  const patch:Partial<Record<TableName,RecordData[]>>={},removed:Partial<Record<TableName,string[]>>={};
  const records=await Promise.all([...changes].map(async([table,ids])=>({table,ids:[...ids],rows:await Promise.all([...ids].map(id=>get(table,id)))})));
  const references:FileReferences={resources:new Map(),activities:new Map(),skills:new Map()};
  const activityIds=new Set<string>(),resourceIds=new Set<string>(),skillIds=new Set<string>();
  for(const {rows}of records)for(const row of rows)if(row){if(Array.isArray(row.activityIds))for(const id of row.activityIds)if(typeof id==="string")activityIds.add(id);if(Array.isArray(row.resourceIds))for(const id of row.resourceIds)if(typeof id==="string")resourceIds.add(id);}
  for(const {table,rows}of records)for(const row of rows)if(row){if(table==="activities")references.activities.set(row.id,row);if(table==="resources")references.resources.set(row.id,row);if(row.skillId)skillIds.add(row.skillId);if(row.activityId)activityIds.add(row.activityId);if(row.alternativeActivityId)activityIds.add(row.alternativeActivityId);if(row.resourceId)resourceIds.add(row.resourceId);if(table==="students"){for(const id of [...row.favoriteResourceIds||[],...row.pinnedResourceIds||[]])resourceIds.add(id);if(row.mainActivityId)activityIds.add(row.mainActivityId);if(row.alternativeActivityId)activityIds.add(row.alternativeActivityId);}}
  if(profile!=="teacher"||records.some(record=>record.table==="students")){
    for(const item of await Promise.all([...activityIds].filter(id=>!references.activities.has(id)).map(id=>get("activities",id))))if(item)references.activities.set(item.id,item);
    for(const item of references.activities.values())if(item.resourceId)resourceIds.add(item.resourceId);
    for(const item of await Promise.all([...resourceIds].filter(id=>!references.resources.has(id)).map(id=>get("resources",id))))if(item)references.resources.set(item.id,item);
  }
  for(const row of [...references.resources.values(),...references.activities.values()])if(row.skillId)skillIds.add(row.skillId);
  for(const skill of await Promise.all([...skillIds].map(id=>get("skills",id))))if(skill)references.skills!.set(skill.id,skill);
  const linkedIds=new Set<string>();for(const {table,rows}of records)for(const row of rows)if(row){for(const id of linkedFileIds(row))linkedIds.add(id);if(row.avatarFileId)linkedIds.add(row.avatarFileId);if(table==="files")linkedIds.add(row.id);}
  for(const row of [...references.resources.values(),...references.activities.values()])for(const id of linkedFileIds(row))linkedIds.add(id);
  const files=new Map<string,RecordData>();for(const file of await Promise.all([...linkedIds].map(id=>get("files",id))))if(file)files.set(file.id,file);
  const students=new Map<string,RecordData>();if(profile!=="teacher"&&records.some(x=>x.table==="resources")){const student=await get("students",profile);if(student)students.set(student.id,student);}
  for(const {table,ids,rows}of records){const visible:RecordData[]=[],missing:string[]=[];rows.forEach((row,index)=>{const projected=row?projectRecord(profile,table,row,files,students,references):null;if(projected)visible.push(projected);else missing.push(ids[index]);});patch[table]=visible;if(missing.length)removed[table]=missing;}
  return {patch,...(Object.keys(removed).length?{removed}:{})};
}
