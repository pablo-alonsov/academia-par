import {draftCopy,hasDraftContent,mergeDraftCopies,normalizeDraft,type DraftCopy} from './draft-recovery';

type Target={studentId:string;activityId?:string;resourceId?:string;label?:string};
const matches=(row:any,target:Target)=>row?.studentId===target.studentId&&(target.activityId?row.activityId===target.activityId:row.resourceId===target.resourceId&&!row.activityId);

/** Old resource drafts remain intact and require an explicit choice to reuse. */
export function legacyDraftCopies(targets:Target[],serverDrafts:any[],localDrafts:any[]):DraftCopy[]{
  const copies:DraftCopy[]=[];
  for(const row of serverDrafts){const target=targets.find(target=>matches(row,target));if(target&&hasDraftContent(normalizeDraft(row)))copies.push({...draftCopy(row),label:target.label||(target.activityId?'Borrador de otra actividad del recurso':'Borrador anterior de Biblioteca')});}
  for(const row of localDrafts){
    const target=targets.find(target=>matches(row,target));if(!target)continue;
    if(row.pending===true&&hasDraftContent(normalizeDraft(row.value)))copies.push({...draftCopy(row,true),label:target.label?`${target.label} · Este dispositivo`:'Borrador anterior de este dispositivo'});
    if(Array.isArray(row.alternatives))copies.push(...row.alternatives.map((copy:DraftCopy)=>({...copy,sourceActivityId:copy.sourceActivityId||row.activityId,sourceResourceId:copy.sourceResourceId||row.resourceId,label:copy.label||target.label})));
  }
  return mergeDraftCopies(copies);
}
