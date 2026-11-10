import { allowedContent, studentDTO } from "./server-policy";
export { allowedContent, studentDTO } from "./server-policy";
import { initialData } from "./seed";
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
  // Insert planned content only; a stable ID never replaces teacher edits.
  const entries = initialData as Record<string, RecordData[]>;
  const statements: D1PreparedStatement[]=[];
  for(const table of ["students","subjects","skills","activities","resources"] as const) for(const data of entries[table] || []) statements.push(recordStatement(table,data,true));
  for(let i=0;i<statements.length;i+=80) await database().batch(statements.slice(i,i+80));
}
export async function snapshot(profile:Profile) {
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
