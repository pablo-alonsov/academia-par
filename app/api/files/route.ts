import { env } from "cloudflare:workers";
import { digest, fail, HttpError, json, ownStudent, requireProfile, sameOrigin } from "@/lib/server-auth";
import { get, recordStatement, required, type RecordData } from "@/lib/server-data";
import { detectUploadType, MAX_UPLOAD_BYTES } from "@/lib/upload-format";
export const dynamic="force-dynamic";
function uploadResult(item:RecordData,alreadyUploaded=false){return json({id:item.id,url:item.url,name:item.name,shared:item.shared,type:item.type,size:item.size,...(alreadyUploaded?{alreadyUploaded:true}:{})});}
function checkReplay(old:RecordData,item:RecordData){
  if(old.studentId!==item.studentId)throw new HttpError(403,"Este archivo pertenece a otra alumna.");
  if(old.contentHash!==item.contentHash || old.type!==item.type || old.size!==item.size || (old.sessionId || null)!==(item.sessionId || null))throw new HttpError(409,"Este intento de carga corresponde a otro archivo. Vuelve a seleccionarlo.");
  if(old.detached===true)throw new HttpError(409,"Este archivo se ha retirado. Vuelve a seleccionarlo para adjuntarlo de nuevo.");
}
export async function POST(request:Request) {
  try {
    sameOrigin(request);const profile=await requireProfile(request);
    if(!env.BUCKET)throw new HttpError(503,"El almacenamiento de archivos no está disponible.");
    if(Number(request.headers.get("content-length") || 0)>9000000)throw new HttpError(413,"El archivo debe ocupar menos de 8 MB.");
    const form=await request.formData();const file=form.get("file");
    if(!file || typeof file==="string" || !("arrayBuffer" in file))throw new HttpError(400,"Selecciona un archivo.");
    if(file.size>MAX_UPLOAD_BYTES || file.size===0)throw new HttpError(413,"El archivo debe ocupar entre 1 byte y 8 MB.");
    const studentId=ownStudent(profile,form.get("studentId") || profile);
    const sessionId=form.get("sessionId");if(sessionId){const session=await required("sessions",sessionId);if(session.studentId!==studentId)throw new HttpError(403,"La sesión pertenece a otra alumna.");}
    const uploadId=form.get("uploadId");
    if(uploadId!==null && (typeof uploadId!=="string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uploadId)))throw new HttpError(400,"El identificador de carga no es válido.");
    const bytes=new Uint8Array(await file.arrayBuffer());
    const type=detectUploadType(bytes,file.name,file.type);
    if(!type)throw new HttpError(400,"No se reconoce el formato. Usa una foto JPG, PNG, WebP, GIF, HEIC/HEIF, un PDF, TXT UTF-8 o DOCX válido. SVG y vídeos no están admitidos.");
    const contentHash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))).map(value=>value.toString(16).padStart(2,"0")).join("");
    const id=uploadId?await digest(`upload:${studentId}:${uploadId.toLowerCase()}`):crypto.randomUUID();
    const key=`${studentId}/${id}/${crypto.randomUUID()}`;
    const name=file.name.replace(/[\r\n"\\/\x00-\x1f\x7f]/g,"_").slice(0,150).trim() || "archivo";
    const item={id,studentId,key,name,type,size:file.size,contentHash,sessionId:sessionId || null,shared:profile!=="teacher" || form.get("shared")==="true",url:`/api/files/${id}`,createdAt:new Date().toISOString()};
    const old=await get("files",id);if(old){checkReplay(old,item);return uploadResult(old,true);}
    await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:type}});
    try {
      // Immutable candidate keys avoid one concurrent retry overwriting another.
      await recordStatement("files",item,true).run();
      const saved=await required("files",id);
      if(saved.key!==key)await env.BUCKET.delete(key);
      checkReplay(saved,item);
      return uploadResult(saved,saved.key!==key);
    }catch(error){
      // If D1 is temporarily unavailable, retain the object rather than risk
      // removing an upload whose commit response was interrupted.
      try{const saved=await get("files",id);if(!saved || saved.key!==key)await env.BUCKET.delete(key);}catch{}
      throw error;
    }
  }catch(error){return fail(error);}
}
