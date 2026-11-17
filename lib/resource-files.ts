type Item=Record<string,any>;
/** Uses authenticated file metadata, never a URL suffix or a filename guess. */
export function pdfFileForResource(resource:Item|null|undefined,files:Item[]=[]):Item|undefined{
  if(typeof resource?.fileId!=="string"||!resource.fileId)return undefined;
  return files.find(file=>file.id===resource.fileId&&file.type==="application/pdf"&&file.purpose!=="avatar"&&file.purpose!=="solution");
}

function creationTime(value:unknown):number|null{
  if(typeof value!=="string"||!value.trim())return null;
  const time=Date.parse(value);
  return Number.isFinite(time)?time:null;
}

function resourceUploadTime(resource:Item,files:Item[]):number|null{
  const ids=new Set<string>();
  for(const id of [resource.fileId,...(Array.isArray(resource.fileIds)?resource.fileIds:[])]){
    if(typeof id==="string"&&id.trim())ids.add(id.trim());
  }
  const path=typeof resource.url==="string"?resource.url.trim().match(/^\/api\/files\/([^/?#]+)(?:[?#].*)?$/):null;
  if(path){
    try{ids.add(decodeURIComponent(path[1]));}catch{ids.add(path[1]);}
  }
  let latest:number|null=null;
  for(const file of files){
    if(!ids.has(file.id)||file.purpose==="avatar"||file.purpose==="solution")continue;
    const time=creationTime(file.createdAt);
    if(time!==null&&(latest===null||time>latest))latest=time;
  }
  return latest??creationTime(resource.createdAt);
}

/** Original uploads keep their position after opening, reviewing or adding solutions. */
export function compareResourceUploads(a:Item,b:Item,files:Item[]=[]):number{
  const aTime=resourceUploadTime(a,files),bTime=resourceUploadTime(b,files);
  if(aTime!==bTime){
    if(aTime===null)return 1;
    if(bTime===null)return -1;
    return bTime-aTime;
  }
  return String(a.title??"").localeCompare(String(b.title??""),"es")||String(a.id??"").localeCompare(String(b.id??""));
}

/** Partition by where work is kept, even when access rules omit its file metadata. */
export function groupResourcesBySource(resources:Item[],_files:Item[]=[]):{materials:Item[];external:Item[]}{
  const materials:Item[]=[],external:Item[]=[];
  for(const resource of resources){
    const url=typeof resource.url==="string"?resource.url.trim():"";
    const uploaded=typeof resource.fileId==="string"&&Boolean(resource.fileId.trim())||Array.isArray(resource.fileIds)&&resource.fileIds.some((id:unknown)=>typeof id==="string"&&Boolean(id.trim()));
    if(uploaded||url.startsWith("/api/files/")||!url)materials.push(resource);
    else external.push(resource);
  }
  return {materials,external};
}
