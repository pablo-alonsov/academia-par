type Item=Record<string,any>;
/** Uses authenticated file metadata, never a URL suffix or a filename guess. */
export function pdfFileForResource(resource:Item|null|undefined,files:Item[]=[]):Item|undefined{
  if(typeof resource?.fileId!=="string"||!resource.fileId)return undefined;
  return files.find(file=>file.id===resource.fileId&&file.type==="application/pdf"&&file.purpose!=="avatar");
}
