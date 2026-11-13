// Server-only planned-content reconciliation. Learner history is never seeded.
export type SeedDomain = "students" | "subjects" | "skills" | "activities" | "resources";
type Data = Record<string, any>;
const PROGRESS_FIELDS = new Set(["state", "lastCheck", "observation", "evidence"]);
const has = (value:Data,key:string) => Object.prototype.hasOwnProperty.call(value,key);
function ordered(value:any):any {
  if(Array.isArray(value))return value.map(ordered);
  if(value && typeof value==="object")return Object.fromEntries(Object.keys(value).sort().filter(k=>value[k]!==undefined).map(k=>[k,ordered(value[k])]));
  return value;
}
export function sameSeedValue(a:unknown,b:unknown) {return JSON.stringify(ordered(a))===JSON.stringify(ordered(b));}
function plannedSnapshot(domain:SeedDomain,planned:Data):Data {
  const copy=JSON.parse(JSON.stringify(planned));delete copy._seed;delete copy.updatedAt;
  // Curriculum content cannot supply a learning assessment, even accidentally.
  if(domain==="skills")Object.assign(copy,{state:"Por empezar",lastCheck:null,observation:"",evidence:""});
  return copy;
}
export function reconcileSeedRecord(domain:SeedDomain,current:Data|null,planned:Data,legacy?:Data):Data {
  const desired=plannedSnapshot(domain,planned);
  const prior=current?._seed;
  const validPrior=prior?.version===1 && prior.baseline && typeof prior.baseline==="object" && !Array.isArray(prior.baseline);
  const baseline:Data|undefined=validPrior?prior.baseline:legacy;
  const result:Data=current?{...current}:{...desired};
  if(current)for(const [key,value] of Object.entries(desired)) {
    if(key==="id" || (key==="studentId" && has(current,key)))continue;
    if(domain==="skills" && PROGRESS_FIELDS.has(key)) {
      if(!has(current,key))result[key]=value;
      continue;
    }
    if((domain==="activities"||domain==="resources")&&key==="supportMode"&&!has(current,key)&&!has(baseline||{},key)){
      const contentKeys=["title","objective","instructions","materials","type","checkMethod","hints","resourceId"];
      const customized=!baseline||contentKeys.some(field=>has(baseline,field)&&!sameSeedValue(current[field],baseline[field]));
      if(customized){result.supportMode="unspecified";continue;}
    }
    // Update a default only while it is still the previous planned value.
    // Missing custom fields stay missing; new curriculum fields fill true gaps.
    if(baseline && has(baseline,key)) {
      if(sameSeedValue(current[key],baseline[key]))result[key]=value;
    } else if(!has(current,key))result[key]=value;
  }
  const changedBaseline=!validPrior || !sameSeedValue(prior.baseline,desired);
  result._seed={version:1,revision:validPrior?Number(prior.revision || 1)+(changedBaseline?1:0):1,baseline:desired};
  return result;
}
