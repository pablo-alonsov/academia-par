export type Procedure = {data:string;question:string;calculation:string;unitsAnswer:string};
export type DraftValue = {answer:string;comment:string;hintsUsed:number[];fileIds:string[];selfAssessment:string;procedure:Procedure};
export type DraftCopy = {value:DraftValue;clientRevision?:string;submissionId?:string;updatedAt?:string;pending?:boolean};
export type DraftConflict = {name:string;local:DraftCopy;server:DraftCopy|null;baseRevision:string};

export const emptyDraft = ():DraftValue => ({answer:"",comment:"",hintsUsed:[],fileIds:[],selfAssessment:"",procedure:{data:"",question:"",calculation:"",unitsAnswer:""}});
const selfLabels:Record<string,string> = {easy:"Fácil",some_doubt:"Con alguna duda",need_help:"Necesito ayuda"};
export function normalizeDraft(raw:any):DraftValue {
  const empty=emptyDraft();
  return {...empty,answer:typeof raw?.answer==="string"?raw.answer:"",comment:typeof raw?.comment==="string"?raw.comment:"",selfAssessment:typeof raw?.selfAssessment==="string"?selfLabels[raw.selfAssessment]||raw.selfAssessment:"",hintsUsed:Array.isArray(raw?.hintsUsed)?[...new Set<number>(raw.hintsUsed.filter((n:unknown)=>Number.isInteger(n)&&Number(n)>=0))]:[],fileIds:Array.isArray(raw?.fileIds)?[...new Set<string>(raw.fileIds.filter((id:unknown)=>typeof id==="string"))]:[],procedure:Object.fromEntries(Object.keys(empty.procedure).map(key=>[key,typeof raw?.procedure?.[key]==="string"?raw.procedure[key]:""])) as Procedure};
}
export const hasDraftContent = (value:DraftValue) => Boolean(value.answer.trim()||value.comment.trim()||value.hintsUsed.length||value.fileIds.length||value.selfAssessment||Object.values(value.procedure).some(item=>item.trim()));
export const sameDraftContent = (a:any,b:any) => JSON.stringify(normalizeDraft(a))===JSON.stringify(normalizeDraft(b));
export const sameDraftVersion = (server:any,local:any) => Boolean(server&&((server.clientRevision&&server.clientRevision===local?.clientRevision)||sameDraftContent(server,local?.value)));
export function draftCopy(row:any,local=false):DraftCopy {return {value:normalizeDraft(local?row?.value:row),clientRevision:row?.clientRevision,submissionId:row?.submissionId,updatedAt:row?.updatedAt,pending:local&&row?.pending===true};}
export function mergeDraftCopies(copies:DraftCopy[]):DraftCopy[] {
  return copies.map(copy=>({...copy,value:normalizeDraft(copy?.value)})).filter((copy,index,all)=>hasDraftContent(copy.value)&&all.findIndex(other=>sameDraftContent(other.value,copy.value))===index);
}

/** A browser clock cannot choose between two different pieces of pending work. */
export function selectInitialDraft(server:any,local:any,newId:()=>string=()=>crypto.randomUUID()) {
  const pending=local?.pending===true,localValue=normalizeDraft(local?.value),same=sameDraftVersion(server,local);
  const knownRemoved=pending&&!server&&typeof local?.baseRevision==="string"&&local.baseRevision!=="";
  const conflict:DraftConflict|null=pending&&((server&&!same)||knownRemoved)?{name:server?"Hay dos versiones del borrador":"El borrador del servidor se ha cerrado o eliminado",local:draftCopy(local,true),server:server?draftCopy(server):null,baseRevision:server?.clientRevision||""}:null;
  const useLocal=pending&&!server&&!conflict,source=useLocal?"local":server?"server":conflict?"local":"empty";
  const value=normalizeDraft(useLocal||conflict&&!server?localValue:server);
  // A synced orphan belongs to an already closed attempt. Its nonce must not be reused.
  const keepNonce=server?Boolean(server.clientRevision&&server.clientRevision===local?.clientRevision):pending;
  return {value,pending:useLocal,recovered:Boolean(server||useLocal||conflict),conflict,source,clientRevision:(source==="local"?local?.clientRevision:server?.clientRevision)||newId(),savedClientRevision:server?.clientRevision||(useLocal?local?.baseRevision||"":""),submissionId:keepNonce&&local?.submissionId||newId(),alternatives:mergeDraftCopies(Array.isArray(local?.alternatives)?local.alternatives:[])};
}
