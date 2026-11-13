/** Relationships use stored IDs only. A shared timeline never merges attempts. */
type Item=Record<string,any>;
const available=(item:Item,studentId:string)=>item.studentId?item.studentId===studentId:!item.suggestedStudentIds?.length||item.suggestedStudentIds.includes(studentId);
const idOrder=(a:Item,b:Item)=>String(a.id)<String(b.id)?-1:String(a.id)>String(b.id)?1:0;
function distinct(rows:Item[]){const seen=new Set<string>();return rows.filter(row=>{if(typeof row.id!=="string"||!row.id)return true;if(seen.has(row.id))return false;seen.add(row.id);return true;});}

export function resourceIdForResponse(response:Item,activities:Item[]):string|undefined{
  if(typeof response.resourceId==="string"&&response.resourceId)return response.resourceId;
  const activity=activities.find(item=>item.id===response.activityId);
  return typeof activity?.resourceId==="string"&&activity.resourceId?activity.resourceId:undefined;
}
export function responsesForResource(resourceId:string,studentId:string,responses:Item[],activities:Item[]):Item[]{
  const allowed=activities.filter(item=>available(item,studentId));
  return distinct(responses.filter(row=>row.studentId===studentId&&resourceIdForResponse(row,allowed)===resourceId));
}
export function responsesForActivity(activity:Item,studentId:string,responses:Item[],activities:Item[]):Item[]{
  if(!available(activity,studentId))return [];
  const related=typeof activity.resourceId==="string"?new Set(responsesForResource(activity.resourceId,studentId,responses,activities)):new Set<Item>();
  // Own historical work remains visible even if the teacher later changes a link.
  return distinct(responses.filter(row=>row.studentId===studentId&&(row.activityId===activity.id||related.has(row))));
}
export function linkedResourceActivity(resourceId:string,studentId:string,activities:Item[],assignments:Item[]=[],preferredActivityId?:string):Item|undefined{
  const linked=activities.filter(item=>["external","paper"].includes(item.type)&&item.resourceId===resourceId&&available(item,studentId)).sort(idOrder);
  const preferred=linked.find(item=>item.id===preferredActivityId);if(preferred)return preferred;
  const assigned=new Set(assignments.filter(item=>item.studentId===studentId&&["Para hacer en clase","Para casa"].includes(item.category)).map(item=>item.activityId));
  return linked.find(item=>assigned.has(item.id))||linked.find(item=>item.id===`act-${resourceId}`)||linked[0];
}
