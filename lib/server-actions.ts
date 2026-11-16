import { allowedContent, closureStatement, deleteStatement, get, list, put, recordStatement, required, studentPatchStatement, submissionStatement, trackChange, type RecordData } from "./server-data";
import { cleanString, database, HttpError, ownStudent, teacherOnly, validateStudent, type Profile } from "./server-auth";
import { grade } from "./grading";
import { ACADEMY_START_DATE, isTrackingDate } from "./academy-config";
import { PROFILE_COLORS, PROFILE_AVATARS } from "./profile-customization";
import { validAvatarFile } from "./server-avatar";
import { ACTIVITY_SUPPORT_OPTIONS } from "./activity-support";
import { commitStudentNotification } from "./server-notifications";
import { assertNoSolutionReferences, patchFilesStatement, restorePdfSolution, setPdfSolutionsArchived } from "./server-pdf-solutions";

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
function supportMode(data:RecordData){if(data.supportMode!==undefined&&!ACTIVITY_SUPPORT_OPTIONS.some(option=>option.value===data.supportMode))throw new HttpError(400,"Indica si esta propuesta se hace sola, con docente o está por confirmar.");}
async function activityResourceId(activity:RecordData,studentId:string){await assertNoSolutionReferences(activity);if(!activity.resourceId)return undefined;const resource=await required("resources",activity.resourceId);if(!allowedContent(resource,validateStudent(studentId)))throw new HttpError(403,"El recurso asociado no está disponible en este perfil.");return resource.id as string;}
async function validateActivityResource(activity:RecordData){await assertNoSolutionReferences(activity);if(!activity.resourceId)return;const resource=await required("resources",activity.resourceId);for(const studentId of ["rocio","alejandra"] as const)if(allowedContent(activity,studentId)&&!allowedContent(resource,studentId))throw new HttpError(400,"El recurso debe estar disponible para todas las alumnas de esta actividad.");}
async function ensureFileAccess(profile:Profile,ids:unknown,studentId:string) {
  if(ids===undefined) return;
  if(!Array.isArray(ids) || ids.length>8) throw new HttpError(400,"No se pueden adjuntar tantos archivos.");
  for(const id of ids) {const file=await required("files",id); if(file.purpose==="avatar" || file.purpose==="solution" || file.studentId!==studentId || file.detached===true || (profile!=="teacher" && file.shared!==true)) throw new HttpError(403,"Este archivo no está disponible para la alumna.");trackChange("files",file.id);}
}
async function customizeProfile(old:RecordData,item:RecordData,data:RecordData){
  if(data.color!==undefined){if(data.color!==old.color&&!PROFILE_COLORS.includes(data.color))throw new HttpError(400,"Elige un color de la colección.");item.color=data.color;}
  if(data.avatar!==undefined){if(data.avatar!==old.avatar&&data.avatar!=="photo"&&!PROFILE_AVATARS.includes(data.avatar))throw new HttpError(400,"Elige un avatar de la colección.");item.avatar=data.avatar;}
  if(data.removePhoto!==undefined&&typeof data.removePhoto!=="boolean")throw new HttpError(400,"Indica si quieres retirar la foto.");
  if(data.removePhoto===true){delete item.avatarFileId;item.avatar="initials";return;}
  if(data.avatarFileId!==undefined){if(typeof data.avatarFileId!=="string"||!data.avatarFileId)throw new HttpError(400,"Usa Quitar foto para retirar la imagen guardada.");item.avatarFileId=data.avatarFileId;}
  if(data.avatar==="photo"||data.avatarFileId!==undefined){const file=item.avatarFileId?await get("files",item.avatarFileId):null;if(!validAvatarFile(item.id,file))throw new HttpError(400,"Selecciona una foto de perfil propia antes de activarla.");}
  delete item.avatarUrl;
}
function selfAssessment(value:unknown,required=false){const normalized=({easy:"Fácil",some_doubt:"Con alguna duda",need_help:"Necesito ayuda"} as Record<string,string>)[String(value)] || value || "";if(!["","Fácil","Con alguna duda","Necesito ayuda"].includes(String(normalized))||(required&&!normalized))throw new HttpError(400,"Indica cómo te has sentido con esta actividad.");return String(normalized);}
function procedure(value:unknown):Record<string,string>|undefined{if(value==null)return undefined;if(typeof value!=="object"||Array.isArray(value))throw new HttpError(400,"El procedimiento no es válido.");const item=value as RecordData;return Object.fromEntries(["data","question","calculation","unitsAnswer"].map(key=>[key,text(item[key],12000)]));}
function procedureFilled(value:Record<string,string>|undefined){return Boolean(value&&Object.values(value).some(s=>s.trim()));}
function hintsUsed(value:unknown,length:number){const used=value??[];if(!Array.isArray(used)||used.some((n:unknown)=>!Number.isInteger(n)||Number(n)<0||Number(n)>=length))throw new HttpError(400,"Las pistas utilizadas no son válidas.");return [...new Set(used as number[])];}
function draftId(studentId:string,kind:"activity"|"resource",id:string){return `draft:${studentId}:${kind}:${id}`;}
async function draftTarget(profile:Profile,data:RecordData){
  const studentId=ownStudent(profile,data.studentId || profile);
  if(Boolean(data.activityId)===Boolean(data.resourceId))throw new HttpError(400,"Elige una actividad o un recurso para el borrador.");
  const kind=data.activityId?"activity":"resource",target=await required(kind==="activity"?"activities":"resources",data.activityId||data.resourceId);
  if(!allowedContent(target,studentId))throw new HttpError(403,"Este contenido no pertenece a tu perfil.");
  await assertNoSolutionReferences(target);
  return {studentId,kind:kind as "activity"|"resource",target,id:draftId(studentId,kind,target.id)};
}
async function resourceIds(value:unknown,studentId:string,max=30){if(!Array.isArray(value)||value.length>max||value.some(id=>typeof id!=="string"))throw new HttpError(400,"La selección de recursos no es válida.");const ids=[...new Set(value)] as string[];for(const id of ids){const resource=await required("resources",id);if(!allowedContent(resource,validateStudent(studentId)))throw new HttpError(403,"Un recurso pertenece a otra alumna.");await assertNoSolutionReferences(resource);trackChange("resources",id);}return ids;}
function submissionIdentity(studentId:string,value:unknown){if(value===undefined)return {id:crypto.randomUUID(),submissionId:undefined};if(typeof value!=="string"||!/^[A-Za-z0-9_-]{8,128}$/.test(value))throw new HttpError(400,"El identificador de la entrega no es válido.");return {id:`response:${studentId}:${value}`,submissionId:value};}
function sameResponseContext(old:RecordData,studentId:string,activityId:string|undefined,resourceId:string|undefined){return old.studentId===studentId&&old.activityId===activityId&&(old.resourceId===resourceId||Boolean(activityId&&old.resourceId==null));}
async function replayResponse(id:string,studentId:string,activityId:string|undefined,resourceId:string|undefined){const old=await get("responses",id);if(!old)return null;if(!sameResponseContext(old,studentId,activityId,resourceId))throw new HttpError(409,"Esta entrega ya se utilizó para otro contenido.");trackChange("responses",id);if(old.assignmentId)trackChange("assignments",old.assignmentId);if(activityId||resourceId)trackChange("drafts",draftId(studentId,activityId?"activity":"resource",activityId||resourceId!));return old;}
async function saveSubmission(item:RecordData,draft:string,assignment?:RecordData,draftRevision?:unknown,notification?:{profile:Profile;action:string;related?:{activity?:RecordData;resource?:RecordData;assignment?:RecordData}}){
  const nonce=crypto.randomUUID();item._submissionNonce=nonce;const statements=[recordStatement("responses",item,true)];
  if(assignment)statements.push(submissionStatement("assignments",assignment,item.id,nonce,true));
  if(draftRevision!==undefined){const expected=cleanString(draftRevision,150);trackChange("drafts",draft);statements.push(database().prepare("DELETE FROM drafts WHERE id=? AND json_extract(data,'$.clientRevision')=? AND EXISTS (SELECT 1 FROM responses WHERE id=? AND json_extract(data,'$._submissionNonce')=?)").bind(draft,expected,item.id,nonce));}
  if(notification)await commitStudentNotification({...notification,after:item,statements,guard:{sql:"EXISTS (SELECT 1 FROM responses WHERE id=? AND json_extract(data,'$._submissionNonce')=?)",bindings:[item.id,nonce]}});
  else await database().batch(statements);
  const saved=await required("responses",item.id);if(!sameResponseContext(saved,item.studentId,item.activityId,item.resourceId))throw new HttpError(409,"Esta entrega ya se utilizó para otro contenido.");return saved;
}
function newObservation(skill:RecordData,data:RecordData,sessionId?:string) {
  const id=sessionId?`check:${sessionId}:${skill.id}`:crypto.randomUUID();
  return {id,studentId:skill.studentId,skillId:skill.id,sessionId,state:skill.state,observation:text(data.observation),evidence:text(data.evidence),nextStep:text(data.nextStep),checkedAt:data.lastCheck || new Date().toISOString(),createdAt:new Date().toISOString()};
}
export async function perform(profile:Profile,action:string,data:RecordData) {
  if(!["submitResponse","saveDoubt","useResource","upsertExam","deleteExam","saveDraft","deleteDraft","upsertWord","deleteWord","updatePreferences"].includes(action)) teacherOnly(profile);
  if(action==="updateStudent") {
    const old=await required("students",validateStudent(data.id));
    const editable=["name","level","color","avatar","avatarFileId","priorities","nextStep","mainActivityId","alternativeActivityId","pinnedResourceIds","curriculumFocus","subjectPlan","secondTermSubjects"];
    const item:RecordData={...old,...Object.fromEntries(editable.filter(k=>data[k]!==undefined).map(k=>[k,data[k]]))};
    await customizeProfile(old,item,data);
    if(item.priorities && (!Array.isArray(item.priorities) || item.priorities.length>6 || item.priorities.some((p:unknown)=>typeof p!=="string"))) throw new HttpError(400,"Mantén hasta seis prioridades breves.");
    for(const [key,max,length] of [["curriculumFocus",10,250],["secondTermSubjects",8,150]] as const) {
      if(item[key]!==undefined && (!Array.isArray(item[key]) || item[key].length>max || item[key].some((value:unknown)=>typeof value!=="string" || value.length>length)))throw new HttpError(400,"El foco y las asignaturas deben ser listas breves de textos.");
    }
    if(item.subjectPlan!==undefined) {
      if(!Array.isArray(item.subjectPlan) || item.subjectPlan.length>8)throw new HttpError(400,"El plan admite hasta ocho asignaturas.");
      item.subjectPlan=item.subjectPlan.map((plan:unknown)=>{
        if(!plan || typeof plan!=="object" || Array.isArray(plan))throw new HttpError(400,"El plan de asignatura no es válido.");
        const value=plan as RecordData;
        const subject=cleanString(value.subject,150);if(!subject.trim())throw new HttpError(400,"Indica la asignatura del plan.");
        return {subject,topics:text(value.topics,5000),...(value.scope!==undefined?{scope:cleanString(value.scope,300)}:{}),...(value.term!==undefined?{term:cleanString(value.term,100)}:{})};
      });
    }
    for(const key of ["mainActivityId","alternativeActivityId"])if(item[key]){const activity=await required("activities",item[key]);if(!allowedContent(activity,item.id))throw new HttpError(403,"La actividad pertenece a otra alumna.");}
    if(data.pinnedResourceIds!==undefined){item.pinnedResourceIds=await resourceIds(data.pinnedResourceIds,item.id,8);for(const id of old.pinnedResourceIds||[])trackChange("resources",id);}
    const keys=editable.filter(key=>data[key]!==undefined);if(data.removePhoto===true)keys.push("avatar");
    await studentPatchStatement(item.id,Object.fromEntries(keys.filter(key=>!(data.removePhoto===true&&key==="avatarFileId")).map(key=>[key,item[key]])),["avatarUrl",...(data.removePhoto===true?["avatarFileId"]:[])]).run();return {id:item.id};
  }
  if(action==="upsertSkill") {
    const old=data.id?await get("skills",data.id):null;
    if(old&&data.studentId!==undefined&&data.studentId!==old.studentId)throw new HttpError(400,"No se puede cambiar la alumna de una habilidad existente. Usa «Adaptar para otra alumna».");
    const item:RecordData={...old,...data,id:data.id || crypto.randomUUID(),studentId:validateStudent(data.studentId || old?.studentId)};
    title(item);skillState(item.state);
    const checked=data.checked===true || Boolean(data.lastCheck && data.lastCheck!==old?.lastCheck);
    delete item.checked;
    const now=new Date().toISOString();item.updatedAt=now;trackChange("skills",item.id);
    const writeSkill=()=>database().prepare("INSERT INTO skills (id,student_id,data,updated_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at WHERE skills.student_id=excluded.student_id").bind(item.id,item.studentId,JSON.stringify(item),now);
    if(checked) {
      item.lastCheck=data.lastCheck || new Date().toISOString();
      const obs=newObservation(item,data);
      trackChange("observations",obs.id);
      const written=await database().batch([writeSkill(),database().prepare("INSERT INTO observations (id,student_id,data,updated_at) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM skills WHERE id=? AND student_id=?)").bind(obs.id,item.studentId,JSON.stringify({...obs,updatedAt:now}),now,item.id,item.studentId)]);
      if(written[0].meta.changes===0)throw new HttpError(400,"La habilidad ya pertenece a otra alumna. Adáptala con un identificador nuevo.");
    } else {const written=await writeSkill().run();if(written.meta.changes===0)throw new HttpError(400,"La habilidad ya pertenece a otra alumna. Adáptala con un identificador nuevo.");}
    return {id:item.id};
  }
  if(action==="copySkill"){
    const source=await required("skills",data.id),studentId=validateStudent(data.studentId);
    const {_seed,...content}=source;
    const item:RecordData={...content,id:crypto.randomUUID(),studentId,title:data.title===undefined?source.title:cleanString(data.title,250),state:"Por empezar",lastCheck:null,observation:"",evidence:"",reviewNeeded:false,reviewDate:null,nextStep:data.nextStep===undefined?source._seed?.baseline?.nextStep || "Comprobar el punto de partida y elegir un primer paso.":text(data.nextStep)};
    delete item.checked;title(item);await put("skills",item);return {id:item.id};
  }
  if(action==="upsertSession") {
    const old=data.id?await get("sessions",data.id):null;
    if(old?.status==="realizada"){trackChange("sessions",old.id);return {id:old.id,alreadyClosed:true};}
    const base=data.baseUpdatedAt===undefined?undefined:cleanString(data.baseUpdatedAt,100);
    if(base!==undefined && base!==(old?.updatedAt || "")){if(data.id)trackChange("sessions",data.id);return {id:data.id,conflict:true};}
    const item:RecordData={...old,...data,id:data.id || crypto.randomUUID(),studentId:validateStudent(data.studentId || old?.studentId)};
    delete item.baseUpdatedAt;
    await ensureFileAccess(profile,item.fileIds,item.studentId);await assertNoSolutionReferences(item);
    date(item.date);
    if(!old && !isTrackingDate(item.date))throw new HttpError(400,`Las nuevas clases deben tener fecha del ${ACADEMY_START_DATE.split("-").reverse().join("/")} o posterior.`);
    if(!SESSION_STATES.includes(item.status || "por preparar")) throw new HttpError(400,"Estado de sesión no válido.");
    if(item.status==="realizada" && old?.status!=="realizada") throw new HttpError(400,"Usa el cierre de sesión para compartir el resumen.");
    item.duration=Number(item.duration || 60);if(item.duration<5 || item.duration>240 || !Number.isInteger(item.duration)) throw new HttpError(400,"La duración debe estar entre 5 y 240 minutos.");
    item.status=item.status || "por preparar";
    for(const key of ["activityId","alternativeActivityId"]) if(item[key]) {const activity=await required("activities",item[key]);if(!allowedContent(activity,item.studentId)) throw new HttpError(400,"La actividad pertenece a otra alumna.");}
    trackChange("sessions",item.id);
    if(old?.status!=="realizada") {
      const now=new Date(Math.max(Date.now(),(Date.parse(old?.updatedAt || "") || 0)+1)).toISOString();item.updatedAt=now;
      // A delayed autosave cannot reopen or overwrite a session already closed.
      const written=await database().prepare("INSERT INTO sessions (id,student_id,data,updated_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET student_id=excluded.student_id,data=excluded.data,updated_at=excluded.updated_at WHERE COALESCE(json_extract(sessions.data,'$.status'),'por preparar') != 'realizada' AND (? IS NULL OR sessions.updated_at=?)").bind(item.id,item.studentId,JSON.stringify(item),now,base ?? null,base ?? null).run();
      if(written.meta.changes===0){const current=await get("sessions",item.id);return {id:item.id,...(current?.status==="realizada"?{alreadyClosed:true}:{conflict:true})};}
    }
    return {id:item.id};
  }
  if(action==="closeSession") {
    const old=await required("sessions",data.id);
    if(old.status==="realizada"){trackChange("sessions",old.id);trackChange("students",old.studentId);return {id:old.id,alreadyClosed:true};}
    const operationId=crypto.randomUUID();
    const closedAt=new Date(Math.max(Date.now(),(Date.parse(old.updatedAt || "") || 0)+1)).toISOString();
    const item:RecordData={...old,...data,id:old.id,studentId:old.studentId,status:"realizada",closedAt,closeOperationId:operationId};
    item.updatedAt=closedAt;
    delete item.skillUpdate;
    await ensureFileAccess(profile,item.fileIds,item.studentId);await assertNoSolutionReferences(item);
    if(!text(item.content || item.sharedSummary).trim()) throw new HttpError(400,"Resume brevemente qué habéis trabajado.");
    await required("students",old.studentId);
    trackChange("sessions",old.id);trackChange("students",old.studentId);
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
    title(item);supportMode(data);
    if(!TYPES.includes(item.type)) throw new HttpError(400,"Elige un tipo de actividad válido.");
    if(item.studentId) validateStudent(item.studentId);
    if(item.suggestedStudentIds && (!Array.isArray(item.suggestedStudentIds) || item.suggestedStudentIds.some((s:unknown)=>s!=="rocio"&&s!=="alejandra"))) throw new HttpError(400,"Alumnas no válidas.");
    if(item.hints && (!Array.isArray(item.hints)||item.hints.length>8||item.hints.some((h:unknown)=>typeof h!=="string"))) throw new HttpError(400,"Las pistas deben ser textos breves.");
    webLink(item.url);
    await validateActivityResource(item);
    await put("activities",item);return {id:item.id};
  }
  if(action==="assignActivity") {
    const studentId=validateStudent(data.studentId),activity=await required("activities",data.activityId);
    await assertNoSolutionReferences(activity);
    if(!allowedContent(activity,studentId)) throw new HttpError(400,"Adapta primero esta actividad para la alumna seleccionada.");
    if(data.sessionId) {const session=await required("sessions",data.sessionId);if(session.studentId!==studentId) throw new HttpError(400,"La sesión pertenece a otra alumna.");}
    if(!CATEGORIES.includes(data.category)) throw new HttpError(400,"Elige dónde se realizará la actividad.");
    if(data.setAsMain&&data.setAsAlternative)throw new HttpError(400,"Elige si será la actividad principal o la alternativa.");
    const item:RecordData={...data,id:data.id || crypto.randomUUID(),studentId};delete item.setAsMain;delete item.setAsAlternative;
    const old=await get("assignments",item.id);if(old&&old.studentId!==studentId)throw new HttpError(400,"La asignación pertenece a otra alumna.");
    const statements=[recordStatement("assignments",item)];
    if(data.setAsMain||data.setAsAlternative){const student=await required("students",studentId);statements.push(recordStatement("students",{...student,[data.setAsMain?"mainActivityId":"alternativeActivityId"]:activity.id}));}
    await database().batch(statements);return {id:item.id};
  }
  if(action==="submitResponse") {
    let assignment=data.assignmentId?await required("assignments",data.assignmentId):null;
    const studentId=ownStudent(profile,assignment?.studentId || (profile==="teacher"?data.studentId:profile));
    const activity=await required("activities",assignment?.activityId || data.activityId);
    if(!allowedContent(activity,studentId)) throw new HttpError(403,"Esta actividad no está disponible en tu perfil.");
    const resourceId=await activityResourceId(activity,studentId);if(data.resourceId!==undefined&&data.resourceId!==resourceId)throw new HttpError(400,"El recurso no corresponde a esta actividad.");
    const identity=submissionIdentity(studentId,data.submissionId),replay=await replayResponse(identity.id,studentId,activity.id,resourceId);if(replay)return {id:replay.id,autoResult:replay.autoResult,reviewStatus:replay.reviewStatus,alreadySubmitted:true};
    const optional=assignment?undefined:{id:`optional:${studentId}:${activity.id}`,studentId,activityId:activity.id,category:"Opcionales"};if(!assignment)assignment=optional!;
    const answer=text(data.answer,30000);
    const steps=procedure(data.procedure);
    if(["choice","numeric","fraction","text"].includes(activity.type)?!answer.trim():!answer.trim()&&!data.fileIds?.length&&!procedureFilled(steps))throw new HttpError(400,"Escribe una respuesta antes de guardarla.");
    const assessment=selfAssessment(data.selfAssessment),hints=hintsUsed(data.hintsUsed,activity.hints?.length || 0);
    await ensureFileAccess(profile,data.fileIds,studentId);
    const item=await saveSubmission({id:identity.id,submissionId:identity.submissionId,studentId,assignmentId:assignment.id,activityId:activity.id,...(resourceId?{resourceId}:{}),answer,hintsUsed:hints,selfAssessment:assessment,procedure:steps,comment:text(data.comment,5000),autoResult:grade(activity,answer),reviewStatus:"pending",fileIds:data.fileIds || [],createdAt:new Date().toISOString()},draftId(studentId,"activity",activity.id),optional,data.draftRevision,{profile,action,related:{activity,assignment,...(resourceId?{resource:await required("resources",resourceId)}:{})}});
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
    if(data.submissionId!==undefined && (typeof data.submissionId!=="string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.submissionId)))throw new HttpError(400,"El identificador de la duda no es válido.");
    const item={id:data.submissionId?`doubt:${studentId}:${data.submissionId.toLowerCase()}`:crypto.randomUUID(),studentId,question,status:"pending",createdAt:new Date().toISOString()};
    const before=await get("doubts",item.id);
    const [inserted]=await commitStudentNotification({profile,action,before,after:item,statements:[recordStatement("doubts",item,true)]});const saved=await required("doubts",item.id);
    if(saved.studentId!==studentId || saved.question!==question)throw new HttpError(409,"Esta duda ya se envió con otro texto. Abre una nueva duda para continuar.");
    return {id:item.id,...(inserted.meta.changes?{}:{alreadySubmitted:true})};
  }
  if(action==="resolveDoubt") {
    const old=await required("doubts",data.id);await put("doubts",{...old,status:"resolved",reply:text(data.reply),resolvedAt:new Date().toISOString()});return {id:old.id};
  }
  if(action==="upsertExam") {
    const old=data.id?await get("exams",data.id):null;
    if(profile!=="teacher") {
      if(old)ownStudent(profile,old.studentId);
      if(data.studentId!==undefined)ownStudent(profile,data.studentId);
    }
    // The shared calendar lets pupils edit their own exams, including ones entered
    // by the teacher. Pupil writes cannot add or replace teacher metadata.
    const editable=["id","studentId","title","date","subject","topics"];
    const supplied=profile==="teacher"?data:Object.fromEntries(editable.filter(k=>data[k]!==undefined).map(k=>[k,data[k]]));
    const item:RecordData={...old,...supplied,id:data.id || crypto.randomUUID(),studentId:profile==="teacher"?validateStudent(data.studentId || old?.studentId):profile};
    item.subject=text(item.subject,150);item.topics=text(item.topics);
    title(item);date(item.date);if(item.skillIds) {if(!Array.isArray(item.skillIds)) throw new HttpError(400,"Habilidades no válidas.");for(const id of item.skillIds){const s=await required("skills",id);if(s.studentId!==item.studentId)throw new HttpError(400,"La habilidad pertenece a otra alumna.");}}
    trackChange("exams",item.id);
    if(profile==="teacher")await put("exams",item);
    else {
      const now=new Date().toISOString();
      const payload={...Object.fromEntries(editable.filter(k=>item[k]!==undefined).map(k=>[k,item[k]])),updatedAt:now};
      // SQL ownership guard also blocks simultaneous chosen-ID collisions or a
      // concurrent teacher reassignment after the ownership check above.
      const [saved]=await commitStudentNotification({profile,action,before:old,after:{...item,...payload},statements:[database().prepare("INSERT INTO exams (id,student_id,data,updated_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=json_patch(exams.data,excluded.data),updated_at=excluded.updated_at WHERE exams.student_id=?").bind(item.id,profile,JSON.stringify(payload),now,profile)]});
      if(saved.meta.changes===0)throw new HttpError(403,"Solo puedes modificar tus propios exámenes.");
    }
    return {id:item.id};
  }
  if(action==="deleteExam") {
    const old=await required("exams",data.id);
    trackChange("exams",old.id);
    if(profile==="teacher")await database().prepare("DELETE FROM exams WHERE id=?").bind(old.id).run();
    else {
      ownStudent(profile,old.studentId);if(data.studentId!==undefined)ownStudent(profile,data.studentId);
      const [removed]=await commitStudentNotification({profile,action,before:old,after:null,statements:[database().prepare("DELETE FROM exams WHERE id=? AND student_id=?").bind(old.id,profile)]});
      if(removed.meta.changes===0)throw new HttpError(403,"Solo puedes eliminar tus propios exámenes.");
    }
    return {id:old.id};
  }
  if(action==="upsertResource") {
    const old=data.id?await get("resources",data.id):null;
    const item:RecordData={...old,...data,id:data.id || crypto.randomUUID()};title(item);supportMode(data);
    await assertNoSolutionReferences(item);
    if(item.collection!==undefined && !["materials","exam-prep"].includes(item.collection))throw new HttpError(400,"Elige materiales o preparación de exámenes.");
    if(item.examMode!==undefined && !["class","independent","either"].includes(item.examMode))throw new HttpError(400,"Elige cómo se utilizará el PDF de preparación.");
    if(item.studentId) validateStudent(item.studentId);
    webLink(item.url);
    if(item.fileId) {
      const file=await required("files",item.fileId);
      if(file.purpose==="avatar"||file.purpose==="solution")throw new HttpError(400,"Las fotos de perfil y las soluciones privadas no son materiales de clase.");
      if(file.shared!==true||file.detached===true)throw new HttpError(400,"Marca el archivo como compartido y disponible antes de añadirlo a la biblioteca.");
      if(item.studentId && file.studentId!==item.studentId)throw new HttpError(400,"El archivo pertenece a otra alumna.");
      if(item.collection==="exam-prep"){
        if(file.type!=="application/pdf")throw new HttpError(400,"La preparación de exámenes requiere un PDF subido y verificado.");
        validateStudent(file.studentId);
        if(!allowedContent(item,file.studentId))throw new HttpError(400,"La preparación debe estar disponible para la alumna propietaria del PDF.");
      }
      trackChange("files",file.id);
    }
    else if(item.collection==="exam-prep")throw new HttpError(400,"La preparación de exámenes requiere un PDF subido y verificado.");
    await put("resources",item);return {id:item.id};
  }
  if(action==="useResource") {
    const studentId=ownStudent(profile,data.studentId || profile);
    const resource=await required("resources",data.resourceId);if(!allowedContent(resource,studentId))throw new HttpError(403,"Este recurso no pertenece a tu perfil.");
    await assertNoSolutionReferences(resource);
    const identity=submissionIdentity(studentId,data.submissionId),replay=await replayResponse(identity.id,studentId,undefined,resource.id);if(replay)return {id:replay.id,alreadySubmitted:true};
    await ensureFileAccess(profile,data.fileIds,studentId);
    const item=await saveSubmission({id:identity.id,submissionId:identity.submissionId,studentId,resourceId:resource.id,kind:"resource-use",answer:text(data.answer,30000),comment:text(data.comment,5000),selfAssessment:selfAssessment(data.selfAssessment),procedure:procedure(data.procedure),hintsUsed:hintsUsed(data.hintsUsed,0),fileIds:data.fileIds || [],autoResult:null,reviewStatus:"pending",createdAt:new Date().toISOString()},draftId(studentId,"resource",resource.id),undefined,data.draftRevision,{profile,action,related:{resource}});return {id:item.id};
  }
  if(action==="saveEvidence") {
    const studentId=validateStudent(data.studentId);
    await ensureFileAccess(profile,[...(data.fileId?[data.fileId]:[]),...(data.fileIds||[])],studentId);
    if(data.skillId){const skill=await required("skills",data.skillId);if(skill.studentId!==studentId)throw new HttpError(400,"La habilidad pertenece a otra alumna.");}
    const item=await put("evidence",{...data,id:crypto.randomUUID(),studentId,shared:data.shared===true,createdAt:new Date().toISOString()});return {id:item.id};
  }
  if(action==="saveDraft"){
    const {studentId,kind,target,id}=await draftTarget(profile,data);await ensureFileAccess(profile,data.fileIds,studentId);
    const old=await get("drafts",id);
    const clientRevision=data.clientRevision===undefined?crypto.randomUUID():cleanString(data.clientRevision,150);if(!clientRevision.trim())throw new HttpError(400,"La revisión del borrador no es válida.");
    if(data.baseRevision!==undefined){const expected=cleanString(data.baseRevision,150);trackChange("drafts",id);if(old?.clientRevision===clientRevision)return {id,alreadySaved:true};if(old?old.clientRevision!==expected:expected!=="")return {id,conflict:true};}
    const item:RecordData={id,studentId,targetType:kind,[kind==="activity"?"activityId":"resourceId"]:target.id,answer:text(data.answer,30000),comment:text(data.comment,5000),hintsUsed:hintsUsed(data.hintsUsed,kind==="activity"?target.hints?.length || 0:0),fileIds:data.fileIds || [],selfAssessment:selfAssessment(data.selfAssessment),procedure:procedure(data.procedure),clientRevision,createdAt:old?.createdAt || new Date().toISOString(),updatedAt:new Date().toISOString()};
    const related=kind==="activity"?{activity:target}:{resource:target};
    if(data.baseRevision===undefined)await commitStudentNotification({profile,action,before:old,after:item,related,statements:[recordStatement("drafts",item)]});
    else{trackChange("drafts",id);const statement=data.baseRevision===""?recordStatement("drafts",item,true):database().prepare("UPDATE drafts SET data=?,updated_at=? WHERE id=? AND student_id=? AND json_extract(data,'$.clientRevision')=?").bind(JSON.stringify(item),item.updatedAt,id,studentId,data.baseRevision);const [saved]=await commitStudentNotification({profile,action,before:old,after:item,related,statements:[statement]});if(saved.meta.changes===0)return {id,conflict:true};}
    return {id};
  }
  if(action==="deleteDraft"){
    const {id,kind,target}=await draftTarget(profile,data),old=await get("drafts",id);trackChange("drafts",id);
    const statement=data.draftRevision===undefined?deleteStatement("drafts",id):database().prepare("DELETE FROM drafts WHERE id=? AND json_extract(data,'$.clientRevision')=?").bind(id,cleanString(data.draftRevision,150));
    await commitStudentNotification({profile,action,before:old,after:null,related:kind==="activity"?{activity:target}:{resource:target},statements:[statement]});return {id};
  }
  if(action==="upsertWord"){
    const old=data.id?await get("word_entries",data.id):null;
    if(old){ownStudent(profile,old.studentId);if(data.studentId!==undefined&&data.studentId!==old.studentId)throw new HttpError(403,"No se puede cambiar la alumna de una palabra guardada.");}
    const studentId=ownStudent(profile,data.studentId || old?.studentId || profile),id=data.id || crypto.randomUUID();
    const item:RecordData={id,studentId,original:text(data.original ?? old?.original,150),corrected:text(data.corrected ?? old?.corrected,150),reason:text(data.reason ?? old?.reason,2000),sentence:text(data.sentence ?? old?.sentence,3000),reviewDate:data.reviewDate===undefined?old?.reviewDate || null:data.reviewDate || null,createdAt:old?.createdAt || new Date().toISOString(),updatedAt:new Date().toISOString()};
    if(!item.original.trim()||!item.corrected.trim())throw new HttpError(400,"Escribe la palabra original y su corrección.");if(item.reviewDate)date(item.reviewDate);
    for(const key of ["activityId","resourceId","sessionId"]){const value=data[key]===undefined?old?.[key]:data[key];if(!value)continue;const target=await required(key==="activityId"?"activities":key==="resourceId"?"resources":"sessions",value);if(!allowedContent(target,studentId))throw new HttpError(403,"El trabajo pertenece a otra alumna.");await assertNoSolutionReferences(target);item[key]=value;}
    trackChange("word_entries",id);
    const [saved]=await commitStudentNotification({profile,action,before:old,after:item,statements:[database().prepare("INSERT INTO word_entries (id,student_id,data,updated_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at WHERE word_entries.student_id=?").bind(id,studentId,JSON.stringify(item),item.updatedAt,studentId)]});if(saved.meta.changes===0)throw new HttpError(403,"Esta palabra pertenece a otra alumna.");return {id};
  }
  if(action==="deleteWord"){
    const old=await required("word_entries",data.id),studentId=ownStudent(profile,old.studentId);if(data.studentId!==undefined)ownStudent(profile,data.studentId);trackChange("word_entries",old.id);await commitStudentNotification({profile,action,before:old,after:null,statements:[database().prepare("DELETE FROM word_entries WHERE id=? AND student_id=?").bind(old.id,studentId)]});return {id:old.id};
  }
  if(action==="updatePreferences"){
    const studentId=ownStudent(profile,data.studentId || profile),old=await required("students",studentId),item:RecordData={...old};
    await customizeProfile(old,item,data);
    if(data.favoriteResourceIds!==undefined)item.favoriteResourceIds=await resourceIds(data.favoriteResourceIds,studentId,50);
    const keys=["color","avatar","avatarFileId","favoriteResourceIds"].filter(key=>data[key]!==undefined);if(data.removePhoto===true)keys.push("avatar");
    item.updatedAt=new Date().toISOString();
    await commitStudentNotification({profile,action,before:old,after:item,statements:[studentPatchStatement(studentId,Object.fromEntries(keys.filter(key=>!(data.removePhoto===true&&key==="avatarFileId")).map(key=>[key,item[key]])),["avatarUrl",...(data.removePhoto===true?["avatarFileId"]:[])])]});return {id:studentId};
  }
  if(action==="manageFile"){
    const old=await required("files",data.id);
    if(old.purpose==="avatar")throw new HttpError(400,"Gestiona esta imagen desde la foto de perfil.");
    if(old.purpose==="solution")throw new HttpError(400,"Gestiona la solución desde su carpeta privada.");
    if((data.shared!==undefined&&typeof data.shared!=="boolean")||(data.detached!==undefined&&typeof data.detached!=="boolean")||(data.shared===undefined&&data.detached===undefined))throw new HttpError(400,"Indica la visibilidad o retirada del archivo.");
    const values:Array<[string,unknown]>=[];if(data.shared!==undefined)values.push(["$.shared",data.shared]);if(data.detached!==undefined)values.push(["$.detached",data.detached],["$.detachedAt",data.detached?new Date().toISOString():null]);
    trackChange("files",old.id);await patchFilesStatement(values,"id=? AND COALESCE(json_extract(data,'$.purpose'),'') NOT IN ('avatar','solution')",[old.id]).run();
    for(const table of ["resources","evidence","responses","drafts","sessions"] as const)for(const item of await list(table))if(item.fileId===old.id||item.fileIds?.includes(old.id)||(table==="sessions"&&item.id===old.sessionId)||JSON.stringify(item).includes(old.id))trackChange(table,item.id);
    return {id:old.id};
  }
  if(action==="setSolutionsArchived")return setPdfSolutionsArchived(profile,data.resourceId,data.archived);
  if(action==="restorePdfSolution")return restorePdfSolution(profile,data.resourceId,data.fileId,data.operationId);
  throw new HttpError(400,"Esta acción no está disponible.");
}
