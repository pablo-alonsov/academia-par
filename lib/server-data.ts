import { allowedContent, studentDTO } from "./server-policy";
export { allowedContent, studentDTO } from "./server-policy";
import { initialData } from "./seed";
import { legacySeedBaseline } from "./seed-baseline";
import { reconcileSeedRecord, sameSeedValue, type SeedDomain } from "./curriculum-reconcile";
import { database, HttpError, type Profile } from "./server-auth";

export type RecordData = Record<string, any>;
export const tables = ["students","subjects","skills","sessions","resources","activities","assignments","responses","evidence","observations","doubts","exams","files"] as const;
export type TableName = typeof tables[number];
type Row = {id:string;student_id:string|null;data:string;updated_at:string};
export function recordStatement(table:TableName,data:RecordData,ignore=false) {
  const id=String(data.id || crypto.randomUUID());
  const item:RecordData={...data,id,updatedAt:new Date().toISOString()};
  return database().prepare(`INSERT ${ignore?"OR IGNORE ":""}INTO ${table} (id,student_id,data,updated_at) VALUES (?,?,?,?)${ignore?"":" ON CONFLICT(id) DO UPDATE SET student_id=excluded.student_id,data=excluded.data,updated_at=excluded.updated_at"}`).bind(id,table==="students"?id:item.studentId || null,JSON.stringify(item),item.updatedAt);
}
export function closureStatement(table:TableName,data:RecordData,sessionId:string,operationId:string,ignore=false) {
  const item:RecordData={...data,updatedAt:new Date().toISOString()};
  return database().prepare(`INSERT ${ignore?"OR IGNORE ":""}INTO ${table} (id,student_id,data,updated_at) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM sessions WHERE id=? AND json_extract(data,'$.closeOperationId')=?)${ignore?"":" ON CONFLICT(id) DO UPDATE SET student_id=excluded.student_id,data=excluded.data,updated_at=excluded.updated_at"}`).bind(item.id,table==="students"?item.id:item.studentId || null,JSON.stringify(item),item.updatedAt,sessionId,operationId);
}
export async function put(table:TableName,data:RecordData) {
  const item:RecordData={...data,id:String(data.id || crypto.randomUUID())};
  await recordStatement(table,item).run(); return item;
}
export async function get(table:TableName,id:unknown) {
  if(typeof id!=="string" || id.length>150) throw new HttpError(400,"El identificador no es válido.");
  const row=await database().prepare(`SELECT * FROM ${table} WHERE id=?`).bind(id).first<Row>();
  return row?({...JSON.parse(row.data),id:row.id,studentId:row.student_id || undefined} as RecordData):null;
}
export async function required(table:TableName,id:unknown) {
  const result=await get(table,id); if(!result) throw new HttpError(404,"No se encuentra este contenido."); return result;
}
export async function list(table:TableName) {
  const {results}=await database().prepare(`SELECT * FROM ${table} ORDER BY updated_at DESC`).all<Row>();
  return results.map(row=>({...JSON.parse(row.data),id:row.id,...(row.student_id?{studentId:row.student_id}:{})} as RecordData));
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
  for(const {table,items} of all) {
    if(profile==="teacher") {result[table]=items;continue;}
    if(table==="observations") {result[table]=[];continue;}
    result[table]=items.filter(item=>allowedContent(item,profile))
      .filter(item=>table!=="students" || item.id===profile)
      .filter(item=>table!=="sessions" || item.status==="realizada")
      .filter(item=>!["files","evidence"].includes(table) || item.shared===true)
      .map(item=>studentDTO(table,item));
  }
  // An assignment never makes another student's reusable activity available.
  const allowedActivityIds=new Set(result.activities.map(a=>a.id));
  result.assignments=result.assignments.filter(a=>allowedActivityIds.has(a.activityId));
  return result;
}
