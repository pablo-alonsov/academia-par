import { AsyncLocalStorage } from "node:async_hooks";
import { allowedContent, studentDTO, teacherDTO } from "./server-policy";
export { allowedContent, studentDTO } from "./server-policy";
import { initialData } from "./seed";
import { legacySeedBaseline } from "./seed-baseline";
import { reconcileSeedRecord, sameSeedValue, type SeedDomain } from "./curriculum-reconcile";
import { database, HttpError, type Profile } from "./server-auth";

export type RecordData = Record<string, any>;
export const tables = ["students","subjects","skills","sessions","resources","activities","assignments","responses","evidence","observations","doubts","exams","files","drafts","word_entries"] as const;
export type TableName = typeof tables[number];
type Row = {id:string;student_id:string|null;data:string;updated_at:string};
type Changes=Map<TableName,Set<string>>;
const actionChanges=new AsyncLocalStorage<Changes>();
export function trackChange(table:TableName,id:string){const changes=actionChanges.getStore();if(!changes)return;const ids=changes.get(table)||new Set<string>();ids.add(id);changes.set(table,ids);}
export async function collectAction<T>(run:()=>Promise<T>){const changes:Changes=new Map();const result=await actionChanges.run(changes,run);return {result,changes};}
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
  for(const {table,items} of all)result[table]=items.flatMap(item=>{const projected=projectRecord(profile,table,item,files,students);return projected?[projected]:[];});
  const pupilOrder=new Map([["rocio",0],["alejandra",1]]);result.students.sort((a,b)=>(pupilOrder.get(a.id)??2)-(pupilOrder.get(b.id)??2));
  // An assignment never makes another student's reusable activity available.
  const allowedActivityIds=new Set(result.activities.map(a=>a.id));
  result.assignments=result.assignments.filter(a=>allowedActivityIds.has(a.activityId));
  return result;
}
function fileVisible(file:RecordData|undefined,profile:Profile){return Boolean(file&&file.studentId===profile&&file.shared===true&&file.detached!==true);}
export function projectRecord(profile:Profile,table:TableName,item:RecordData,files:Map<string,RecordData>=new Map(),students:Map<string,RecordData>=new Map()):RecordData|null{
  const linked=[...(item.fileId?[item.fileId]:[]),...(Array.isArray(item.fileIds)?item.fileIds:[])];
  if(profile==="teacher"){
    const projected=teacherDTO(item);
    if((table==="resources"||table==="evidence")&&linked.length){projected.fileUnavailable=linked.some(id=>{const f=files.get(id);return !f||f.detached===true||f.shared!==true;});projected.fileDetached=linked.some(id=>files.get(id)?.detached===true);}
    return projected;
  }
  if(!allowedContent(item,profile)||table==="observations"||(table==="students"&&item.id!==profile)||(table==="sessions"&&item.status!=="realizada"))return null;
  if(table==="files"&&!fileVisible(item,profile))return null;
  if(table==="evidence"&&(item.shared!==true||item.detached===true))return null;
  if((table==="resources"||table==="evidence")&&(item.detached===true||item.shared===false||linked.some(id=>!fileVisible(files.get(id),profile))))return null;
  const projected=studentDTO(table,item);
  if(Array.isArray(projected.fileIds))projected.fileIds=projected.fileIds.filter((id:string)=>fileVisible(files.get(id),profile));
  if(table==="resources")projected.pinned=Boolean(students.get(profile)?.pinnedResourceIds?.includes(item.id));
  return projected;
}
export async function actionPatch(profile:Profile,changes:Changes){
  const patch:Partial<Record<TableName,RecordData[]>>={},removed:Partial<Record<TableName,string[]>>={};
  const records=await Promise.all([...changes].map(async([table,ids])=>({table,ids:[...ids],rows:await Promise.all([...ids].map(id=>get(table,id)))})));
  const linkedIds=new Set<string>();for(const {table,rows}of records)for(const row of rows)if(row){if(row.fileId)linkedIds.add(row.fileId);for(const id of row.fileIds||[])linkedIds.add(id);if(table==="files")linkedIds.add(row.id);}
  const files=new Map<string,RecordData>();for(const file of await Promise.all([...linkedIds].map(id=>get("files",id))))if(file)files.set(file.id,file);
  const students=new Map<string,RecordData>();if(profile!=="teacher"&&records.some(x=>x.table==="resources")){const student=await get("students",profile);if(student)students.set(student.id,student);}
  for(const {table,ids,rows}of records){const visible:RecordData[]=[],missing:string[]=[];rows.forEach((row,index)=>{const projected=row?projectRecord(profile,table,row,files,students):null;if(projected)visible.push(projected);else missing.push(ids[index]);});patch[table]=visible;if(missing.length)removed[table]=missing;}
  return {patch,...(Object.keys(removed).length?{removed}:{})};
}
