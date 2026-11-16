type Item=Record<string,any>;
/** Uses authenticated file metadata, never a URL suffix or a filename guess. */
export function pdfFileForResource(resource:Item|null|undefined,files:Item[]=[]):Item|undefined{
  if(typeof resource?.fileId!=="string"||!resource.fileId)return undefined;
  return files.find(file=>file.id===resource.fileId&&file.type==="application/pdf"&&file.purpose!=="avatar");
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
