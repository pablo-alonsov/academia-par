export type ActivitySupportMode='independent'|'teacher'|'unspecified';
export const ACTIVITY_SUPPORT_OPTIONS:ReadonlyArray<{value:ActivitySupportMode;label:string}>=[
  {value:'independent',label:'Puedes hacerla sola'},
  {value:'teacher',label:'Con docente'},
  {value:'unspecified',label:'Por confirmar'},
];
/** Support describes doing the task, independently of its destination or review. */
export function activitySupportMode(value:unknown):ActivitySupportMode{return value==='independent'||value==='teacher'?value:'unspecified';}
export function activitySupportLabel(value:unknown):string{return ACTIVITY_SUPPORT_OPTIONS.find(option=>option.value===activitySupportMode(value))!.label;}
