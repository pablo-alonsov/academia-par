type Item=Record<string,any>;
export type PendingTeacherWork={assignment:Item;activity:Item;dueDate:string|null};
export function assignmentDueDate(value:unknown):string|null {
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const date=new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value?value:null;
}
const created=(assignment:Item)=>{const value=assignment.createdAt||assignment.assignedAt;return typeof value==="string"&&/^\d{4}-\d{2}-\d{2}T/.test(value)&&Number.isFinite(Date.parse(value))?Date.parse(value):Infinity;};
const idOrder=(a:Item,b:Item)=>String(a.id)<String(b.id)?-1:String(a.id)>String(b.id)?1:0;
/** A submitted practice response is not a submission of another teacher assignment. */
export function pendingTeacherAssignments(studentId:string,assignments:Item[],activities:Item[],responses:Item[],mainActivityId?:string):PendingTeacherWork[] {
  const seen=new Set<string>(),completed=new Set(responses.filter(item=>item.studentId===studentId&&typeof item.assignmentId==="string").map(item=>item.assignmentId));
  const result:PendingTeacherWork[]=[];
  for(const assignment of assignments){
    if(assignment.studentId!==studentId||typeof assignment.id!=="string"||!assignment.id||seen.has(assignment.id))continue;
    seen.add(assignment.id);
    if(assignment.id===`optional:${studentId}:${assignment.activityId}`||completed.has(assignment.id))continue;
    const activity=activities.find(item=>item.id===assignment.activityId&&(item.studentId?item.studentId===studentId:!item.suggestedStudentIds?.length||item.suggestedStudentIds.includes(studentId)));
    if(activity)result.push({assignment,activity,dueDate:assignmentDueDate(assignment.dueDate)});
  }
  return result.sort((a,b)=>Number(b.activity.id===mainActivityId)-Number(a.activity.id===mainActivityId)||(a.dueDate&&b.dueDate?a.dueDate.localeCompare(b.dueDate):a.dueDate?-1:b.dueDate?1:0)||(created(a.assignment)-created(b.assignment)||idOrder(a.assignment,b.assignment)));
}
