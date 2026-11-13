type Item=Record<string,any>;
/** Shared history keeps the original assignment rather than completing a newer one. */
export function responseContextLabel(response:Item,currentActivityId?:string,currentAssignmentId?:string,activities:Item[]=[]):string {
  if(!response.activityId&&response.resourceId)return currentAssignmentId?'Práctica anterior del recurso desde Biblioteca':'Entrega del recurso desde Biblioteca';
  if(response.activityId&&response.activityId!==currentActivityId){const title=activities.find(item=>item.id===response.activityId)?.title;return title?`Actividad: ${title}`:'Otra actividad del recurso';}
  if(currentAssignmentId&&response.activityId===currentActivityId&&response.assignmentId!==currentAssignmentId)return response.assignmentId?'Entrega de otro encargo de esta actividad':'Práctica anterior de esta actividad';
  return '';
}
