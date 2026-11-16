import {database,HttpError} from './server-auth';
import {initialData} from './seed';

export const RESET_CONFIRMATION='RESET_TEST_RESULTS';
export const RESULT_VERSION_HEADER='X-ARP-Result-Version';
export const INITIAL_RESULT_VERSION='initial';
export const RESULT_TABLES=['responses','assignments','sessions','evidence','observations','doubts','exams','drafts','word_entries','notification_outbox'] as const;
const MATERIAL_TABLES=['students','subjects','skills','activities','resources','files'] as const;
const validId=(value:unknown):value is string=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{7,127}$/.test(value);
type StudentRow={id:string;data:string};
type Receipt={operationId:string;previousVersion:string;resetAt:string;cleared:Record<string,number>};

export async function currentResultVersion():Promise<string>{
  const row=await database().prepare("SELECT json_extract(data,'$.resultVersion') AS version FROM students WHERE id='rocio'").first<{version:unknown}>();
  return typeof row?.version==='string'&&validId(row.version)?row.version:INITIAL_RESULT_VERSION;
}

async function count(table:string){const row=await database().prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{n:number}>();return Number(row?.n||0);}
async function progressCount(){
  const row=await database().prepare("SELECT COUNT(*) AS n FROM skills WHERE COALESCE(json_extract(data,'$.state'),'Por empezar')!='Por empezar' OR COALESCE(json_extract(data,'$.lastCheck'),'')!='' OR COALESCE(json_extract(data,'$.observation'),'')!='' OR COALESCE(json_extract(data,'$.evidence'),'')!='' OR COALESCE(json_extract(data,'$.reviewNeeded'),0)!=0 OR COALESCE(json_extract(data,'$.reviewDate'),'')!=''").first<{n:number}>();
  return Number(row?.n||0);
}
export async function learningResetStatus(){
  const [resultVersion,counts,preserved,skillsWithProgress,row]=await Promise.all([
    currentResultVersion(),
    Promise.all(RESULT_TABLES.map(async table=>[table,await count(table)] as const)),
    Promise.all(MATERIAL_TABLES.map(async table=>[table,await count(table)] as const)),
    progressCount(),
    database().prepare("SELECT json_extract(data,'$._learningResetReceipt') AS receipt FROM students WHERE id='rocio'").first<{receipt:string|null}>(),
  ]);
  let lastReset:Pick<Receipt,'operationId'|'resetAt'>|null=null;
  if(row?.receipt){try{const receipt=JSON.parse(row.receipt);lastReset={operationId:receipt.operationId,resetAt:receipt.resetAt};}catch{}}
  return {resultVersion,counts:{...Object.fromEntries(counts),skillsWithProgress},preserved:Object.fromEntries(preserved),lastReset};
}

/** Reset only learner history. Reusable teaching content and profile settings survive. */
export async function resetLearningResults(input:Record<string,unknown>){
  if(input.confirmation!==RESET_CONFIRMATION)throw new HttpError(400,'Confirma que quieres reiniciar los resultados de prueba.');
  if(!validId(input.operationId))throw new HttpError(400,'El identificador del reinicio no es válido.');
  if(input.expectedVersion!==INITIAL_RESULT_VERSION&&!validId(input.expectedVersion))throw new HttpError(400,'Indica la versión de resultados que has revisado.');
  const operationId=input.operationId;
  const status=await learningResetStatus();
  // A retry of an accepted reset must never delete work created afterwards.
  if(status.resultVersion===operationId)return {ok:true,alreadyReset:true,...status};
  if(status.resultVersion!==input.expectedVersion)throw new HttpError(409,'Los resultados han cambiado. Revisa el estado antes de reiniciarlos.');
  const rows=(await database().prepare("SELECT id,data FROM students WHERE id IN ('rocio','alejandra') ORDER BY id").all<StudentRow>()).results;
  if(rows.length!==2)throw new HttpError(409,'Deben existir los dos perfiles antes de reiniciar los resultados.');
  const resetAt=new Date().toISOString();
  const receipt:Receipt={operationId,previousVersion:status.resultVersion,resetAt,cleared:status.counts};
  const guard="EXISTS (SELECT 1 FROM students WHERE id='rocio' AND json_extract(data,'$.resultVersion')=?)";
  const plannedNext=(row:StudentRow)=>{
    const student=JSON.parse(row.data),seed=initialData.students.find(item=>item.id===row.id);
    return typeof student._seed?.baseline?.nextStep==='string'?student._seed.baseline.nextStep:seed?.nextStep||'';
  };
  const rocio=rows.find(row=>row.id==='rocio')!,alejandra=rows.find(row=>row.id==='alejandra')!;
  const expression="json_set(json_remove(data,'$.mainActivityId','$.alternativeActivityId'),'$.nextStep',?,'$.resultVersion',?,'$._learningResetReceipt',json(?),'$.updatedAt',?)";
  // The first update claims this exact generation atomically. Every following
  // statement is conditional on that claim, so competing resets cannot mix.
  const statements:D1PreparedStatement[]=[
    database().prepare(`UPDATE students SET data=${expression},updated_at=? WHERE id='rocio' AND COALESCE(json_extract(data,'$.resultVersion'),'initial')=?`).bind(plannedNext(rocio),operationId,JSON.stringify(receipt),resetAt,resetAt,status.resultVersion),
    database().prepare(`UPDATE students SET data=${expression},updated_at=? WHERE id='alejandra' AND ${guard}`).bind(plannedNext(alejandra),operationId,JSON.stringify(receipt),resetAt,resetAt,operationId),
  ];
  for(const table of RESULT_TABLES)statements.push(database().prepare(`DELETE FROM ${table} WHERE ${guard}`).bind(operationId));
  const skills=(await database().prepare('SELECT id,data FROM skills').all<StudentRow>()).results;
  for(const row of skills){
    const skill=JSON.parse(row.data),seed=initialData.skills.find(item=>item.id===row.id);
    const nextStep=typeof skill._seed?.baseline?.nextStep==='string'?skill._seed.baseline.nextStep:seed?.nextStep||'';
    statements.push(database().prepare(`UPDATE skills SET data=json_set(json_remove(data,'$.checked'),'$.state','Por empezar','$.lastCheck',NULL,'$.observation','','$.evidence','','$.reviewNeeded',json('false'),'$.reviewDate',NULL,'$.nextStep',?,'$.updatedAt',?),updated_at=? WHERE id=? AND ${guard}`).bind(nextStep,resetAt,resetAt,row.id,operationId));
  }
  // Previously authenticated tabs must choose a profile again. The result
  // version header also prevents an old cached client reviving local tests.
  statements.push(database().prepare(`DELETE FROM app_sessions WHERE ${guard}`).bind(operationId));
  const result=await database().batch(statements);
  if(result[0].meta.changes!==1)throw new HttpError(409,'Otro reinicio se ha completado. Revisa el estado actual.');
  return {ok:true,alreadyReset:false,...await learningResetStatus()};
}
