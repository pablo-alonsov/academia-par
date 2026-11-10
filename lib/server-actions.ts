import { allowedContent, closureStatement, get, put, recordStatement, required, type RecordData } from "./server-data";
import { cleanString, database, HttpError, ownStudent, teacherOnly, validateStudent, type Profile } from "./server-auth";
import { grade } from "./grading";

const STATES=["Por empezar","Lo estamos trabajando","Lo hago con ayuda","Lo hago sola","Lo he recordado días después"];
const SESSION_STATES=["por preparar","preparada","en curso","realizada"];
const CATEGORIES=["Para hacer en clase","Para casa","Opcionales"];
const TYPES=["choice","numeric","fraction","text","open","paper","external"];
function date(value:unknown) {if(typeof value!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(new Date(value).getTime()) || new Date(value).toISOString().slice(0,10)!==value) throw new HttpError(400,"Indica una fecha válida.");return value;}
function text(value:unknown,max=20000) {return value==null?"":cleanString(value,max);}
function webLink(value:unknown) {
  if(!value)return;
  let url;try{url=new URL(cleanString(value,4000));}catch{throw new HttpError(400,"Enlace no válido.");}
  if(url.protocol!=="https:"&&url.protocol!=="http:")throw new HttpError(400,"Usa un enlace web http o https.");
}
function title(data:RecordData) {if(!text(data.title,250).trim()) throw new HttpError(400,"Añade un título.");}
function skillState(value:unknown) {if(!STATES.includes(String(value))) throw new HttpError(400,"Selecciona un estado de aprendizaje válido.");}
async function ensureFileAccess(profile:Profile,ids:unknown,studentId:string) {
  if(ids===undefined) return;
  if(!Array.isArray(ids) || ids.length>8) throw new HttpError(400,"No se pueden adjuntar tantos archivos.");
  for(const id of ids) {const file=await required("files",id); if(file.studentId!==studentId || (profile!=="teacher" && file.shared!==true)) throw new HttpError(403,"Este archivo no pertenece a la alumna.");}
}
function newObservation(skill:RecordData,data:RecordData,sessionId?:string) {
  const id=sessionId?`check:${sessionId}:${skill.id}`:crypto.randomUUID();
  return {id,studentId:skill.studentId,skillId:skill.id,sessionId,state:skill.state,observation:text(data.observation),evidence:text(data.evidence),nextStep:text(data.nextStep),checkedAt:data.lastCheck || new Date().toISOString(),createdAt:new Date().toISOString()};
}
export async function perform(profile:Profile,action:string,data:RecordData) {
  if(!["submitResponse","saveDoubt","useResource"].includes(action)) teacherOnly(profile);
  if(action==="updateStudent") {
    const old=await required("students",validateStudent(data.id));
    const editable=["name","level","color","avatar","priorities","nextStep","mainActivityId"];
    const item:RecordData={...old,...Object.fromEntries(editable.filter(k=>data[k]!==undefined).map(k=>[k,data[k]]))};
    if(item.priorities && (!Array.isArray(item.priorities) || item.priorities.length>6 || item.priorities.some((p:unknown)=>typeof p!=="string"))) throw new HttpError(400,"Mantén hasta seis prioridades breves.");
    await put("students",item);return {id:item.id};
  }
  if(action==="upsertSkill") {
    const old=data.id?await get("skills",data.id):null;
    const item:RecordData={...old,...data,id:data.id || crypto.randomUUID(),studentId:validateStudent(data.studentId || old?.studentId)};
    title(item);skillState(item.state);
    const checked=data.checked===true || Boolean(data.lastCheck && data.lastCheck!==old?.lastCheck);
    delete item.checked;
    if(checked) {
      item.lastCheck=data.lastCheck || new Date().toISOString();
      const obs=newObservation(item,data);
      await database().batch([recordStatement("skills",item),recordStatement("observations",obs)]);
    } else await put("skills",item);
    return {id:item.id};
  }
  if(action==="upsertSession") {
    const old=data.id?await get("sessions",data.id):null;
    const item:RecordData={...old,...data,id:data.id || crypto.randomUUID(),studentId:validateStudent(data.studentId || old?.studentId)};
    date(item.date);
    if(!SESSION_STATES.includes(item.status || "por preparar")) throw new HttpError(400,"Estado de sesión no válido.");
    if(item.status==="realizada" && old?.status!=="realizada") throw new HttpError(400,"Usa el cierre de sesión para compartir el resumen.");
    if(old?.status==="realizada") item.status="realizada";
    item.duration=Number(item.duration || 60);if(item.duration<5 || item.duration>240 || !Number.isInteger(item.duration)) throw new HttpError(400,"La duración debe estar entre 5 y 240 minutos.");
    item.status=item.status || "por preparar";
    for(const key of ["activityId","alternativeActivityId"]) if(item[key]) {const activity=await required("activities",item[key]);if(!allowedContent(activity,item.studentId)) throw new HttpError(400,"La actividad pertenece a otra alumna.");}
    if(old?.status!=="realizada") {
      const now=new Date().toISOString();item.updatedAt=now;
      // A delayed autosave cannot reopen or overwrite a session already closed.
      await database().prepare("INSERT INTO sessions (id,student_id,data,updated_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET student_id=excluded.student_id,data=excluded.data,updated_at=excluded.updated_at WHERE json_extract(sessions.data,'$.status') != 'realizada'").bind(item.id,item.studentId,JSON.stringify(item),now).run();
    } else await put("sessions",item);
    return {id:item.id};
  }
  if(action==="closeSession") {
    const old=await required("sessions",data.id);
    if(old.status==="realizada") return {id:old.id,alreadyClosed:true};
    const operationId=crypto.randomUUID();
    const item:RecordData={...old,...data,id:old.id,studentId:old.studentId,status:"realizada",closedAt:new Date().toISOString(),closeOperationId:operationId};
    delete item.skillUpdate;
    if(!text(item.content || item.sharedSummary).trim()) throw new HttpError(400,"Resume brevemente qué habéis trabajado.");
    await required("students",old.studentId);
    // The conditional transition elects exactly one closure, even for concurrent tabs.
    const statements=[database().prepare("UPDATE sessions SET data=?,updated_at=? WHERE id=? AND json_extract(data,'$.status') != 'realizada'").bind(JSON.stringify(item),item.closedAt,item.id),database().prepare("UPDATE students SET data=json_set(data,'$.nextStep',?,'$.updatedAt',?),updated_at=? WHERE id=? AND EXISTS (SELECT 1 FROM sessions WHERE id=? AND json_extract(data,'$.closeOperationId')=?)").bind(text(item.nextStep),item.closedAt,item.closedAt,old.studentId,old.id,operationId)];
    if(data.skillUpdate?.id) {
      const update=data.skillUpdate as RecordData;
      const skill=await required("skills",update.id);
      if(skill.studentId!==old.studentId) throw new HttpError(400,"La habilidad pertenece a otra alumna.");
      skillState(update.state);
      const updated:RecordData={...skill,...update,id:skill.id,studentId:skill.studentId,lastCheck:new Date().toISOString()};
      delete updated.checked;
      statements.push(closureStatement("skills",updated,old.id,operationId),closureStatement("observations",newObservation(updated,updated,old.id),old.id,operationId,true));
    }
    // D1 batch is atomic: diary, next step and optional explicit check commit together.
    const results=await database().batch(statements);return {id:item.id,alreadyClosed:results[0].meta.changes===0};
  }
  if(action==="upsertActivity" || action==="duplicateActivity") {
    const old=data.id?await get("activities",data.id):null;
    const item:RecordData={...old,...data,id:action==="duplicateActivity"?crypto.randomUUID():data.id || crypto.randomUUID()};
    delete item.hintsText;delete item.optionsText;
    title(item);
    if(!TYPES.includes(item.type)) throw new HttpError(400,"Elige un tipo de actividad válido.");
    if(item.studentId) validateStudent(item.studentId);
    if(item.suggestedStudentIds && (!Array.isArray(item.suggestedStudentIds) || item.suggestedStudentIds.some((s:unknown)=>s!=="rocio"&&s!=="alejandra"))) throw new HttpError(400,"Alumnas no válidas.");
    if(item.hints && (!Array.isArray(item.hints)||item.hints.length>8||item.hints.some((h:unknown)=>typeof h!=="string"))) throw new HttpError(400,"Las pistas deben ser textos breves.");
    webLink(item.url);
    await put("activities",item);return {id:item.id};
  }
  if(action==="assignActivity") {
    const studentId=validateStudent(data.studentId),activity=await required("activities",data.activityId);
    if(!allowedContent(activity,studentId)) throw new HttpError(400,"Adapta primero esta actividad para la alumna seleccionada.");
    if(data.sessionId) {const session=await required("sessions",data.sessionId);if(session.studentId!==studentId) throw new HttpError(400,"La sesión pertenece a otra alumna.");}
    if(!CATEGORIES.includes(data.category)) throw new HttpError(400,"Elige dónde se realizará la actividad.");
    const item=await put("assignments",{...data,id:data.id || crypto.randomUUID(),studentId});return {id:item.id};
  }
  if(action==="submitResponse") {
    let assignment=data.assignmentId?await required("assignments",data.assignmentId):null;
    const studentId=ownStudent(profile,assignment?.studentId || (profile==="teacher"?data.studentId:profile));
    const activity=await required("activities",assignment?.activityId || data.activityId);
    if(!allowedContent(activity,studentId)) throw new HttpError(403,"Esta actividad no está disponible en tu perfil.");
    if(!assignment) assignment=await put("assignments",{id:`optional:${studentId}:${activity.id}`,studentId,activityId:activity.id,category:"Opcionales"});
    const answer=text(data.answer,30000);
    if(!answer.trim() && !data.fileIds?.length) throw new HttpError(400,"Escribe una respuesta o adjunta tu trabajo.");
    const selfAssessment=({easy:"Fácil",some_doubt:"Con alguna duda",need_help:"Necesito ayuda"} as Record<string,string>)[data.selfAssessment] || data.selfAssessment;
    if(!["Fácil","Con alguna duda","Necesito ayuda"].includes(selfAssessment)) throw new HttpError(400,"Indica cómo te has sentido con esta actividad.");
    if(!Array.isArray(data.hintsUsed || []) || (data.hintsUsed || []).some((n:unknown)=>!Number.isInteger(n)||Number(n)<0||Number(n)>=(activity.hints?.length || 0))) throw new HttpError(400,"Las pistas utilizadas no son válidas.");
    await ensureFileAccess(profile,data.fileIds,studentId);
    const item=await put("responses",{id:crypto.randomUUID(),studentId,assignmentId:assignment.id,activityId:activity.id,answer,hintsUsed:data.hintsUsed || [],selfAssessment,comment:text(data.comment,5000),autoResult:grade(activity,answer),reviewStatus:"pending",fileIds:data.fileIds || [],createdAt:new Date().toISOString()});
    return {id:item.id,autoResult:item.autoResult,reviewStatus:item.reviewStatus};
  }
  if(action==="reviewResponse") {
    const old=await required("responses",data.id);
    await put("responses",{...old,feedback:text(data.feedback),result:text(data.result,100),reviewStatus:"reviewed",reviewedAt:new Date().toISOString()});
    return {id:old.id};
  }
  if(action==="saveDoubt") {
    const studentId=ownStudent(profile,data.studentId || profile);
    const question=text(data.question,5000);if(!question.trim()) throw new HttpError(400,"Escribe tu duda.");
    const item=await put("doubts",{id:crypto.randomUUID(),studentId,question,status:"pending",createdAt:new Date().toISOString()});return {id:item.id};
  }
  if(action==="resolveDoubt") {
    const old=await required("doubts",data.id);await put("doubts",{...old,status:"resolved",reply:text(data.reply),resolvedAt:new Date().toISOString()});return {id:old.id};
  }
  if(action==="upsertExam") {
    const old=data.id?await get("exams",data.id):null;
    const item:RecordData={...old,...data,id:data.id || crypto.randomUUID(),studentId:validateStudent(data.studentId || old?.studentId)};
    title(item);date(item.date);if(item.skillIds) {if(!Array.isArray(item.skillIds)) throw new HttpError(400,"Habilidades no válidas.");for(const id of item.skillIds){const s=await required("skills",id);if(s.studentId!==item.studentId)throw new HttpError(400,"La habilidad pertenece a otra alumna.");}}
    await put("exams",item);return {id:item.id};
  }
  if(action==="deleteExam") {await required("exams",data.id);await database().prepare("DELETE FROM exams WHERE id=?").bind(data.id).run();return {id:data.id};}
  if(action==="upsertResource") {
    const old=data.id?await get("resources",data.id):null;
    const item:RecordData={...old,...data,id:data.id || crypto.randomUUID()};title(item);
    if(item.studentId) validateStudent(item.studentId);
    webLink(item.url);
    if(item.fileId) {
      const file=await required("files",item.fileId);
      if(file.shared!==true)throw new HttpError(400,"Marca el archivo como compartido antes de añadirlo a la biblioteca.");
      if(item.studentId && file.studentId!==item.studentId)throw new HttpError(400,"El archivo pertenece a otra alumna.");
    }
    await put("resources",item);return {id:item.id};
  }
  if(action==="useResource") {
    const studentId=ownStudent(profile,data.studentId || profile);
    const resource=await required("resources",data.resourceId);if(!allowedContent(resource,studentId))throw new HttpError(403,"Este recurso no pertenece a tu perfil.");
    await ensureFileAccess(profile,data.fileIds,studentId);
    const item=await put("responses",{id:crypto.randomUUID(),studentId,resourceId:resource.id,kind:"resource-use",answer:text(data.answer,30000),fileIds:data.fileIds || [],autoResult:null,reviewStatus:"pending",createdAt:new Date().toISOString()});return {id:item.id};
  }
  if(action==="saveEvidence") {
    const studentId=validateStudent(data.studentId);
    await ensureFileAccess(profile,data.fileId?[data.fileId]:[],studentId);
    if(data.skillId){const skill=await required("skills",data.skillId);if(skill.studentId!==studentId)throw new HttpError(400,"La habilidad pertenece a otra alumna.");}
    const item=await put("evidence",{...data,id:crypto.randomUUID(),studentId,shared:data.shared===true,createdAt:new Date().toISOString()});return {id:item.id};
  }
  throw new HttpError(400,"Esta acción no está disponible.");
}
