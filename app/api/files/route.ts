import { env } from "cloudflare:workers";
import { fail, HttpError, json, ownStudent, requireProfile, sameOrigin } from "@/lib/server-auth";
import { put, required } from "@/lib/server-data";
export const dynamic="force-dynamic";
const TYPES=["image/jpeg","image/png","image/webp","image/gif","application/pdf","text/plain","application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
export async function POST(request:Request) {
  try {
    sameOrigin(request);const profile=await requireProfile(request);
    if(!env.BUCKET)throw new HttpError(503,"El almacenamiento de archivos no está disponible.");
    if(Number(request.headers.get("content-length") || 0)>9000000)throw new HttpError(413,"El archivo debe ocupar menos de 8 MB.");
    const form=await request.formData();const file=form.get("file");
    if(!file || typeof file==="string" || !("arrayBuffer" in file))throw new HttpError(400,"Selecciona un archivo.");
    if(file.size>8*1024*1024 || file.size===0)throw new HttpError(413,"El archivo debe ocupar entre 1 byte y 8 MB.");
    if(!TYPES.includes(file.type))throw new HttpError(400,"Usa una foto JPG, PNG, WebP, GIF, un PDF, TXT o DOCX.");
    const studentId=ownStudent(profile,form.get("studentId") || profile);
    const sessionId=form.get("sessionId");if(sessionId){const session=await required("sessions",sessionId);if(session.studentId!==studentId)throw new HttpError(403,"La sesión pertenece a otra alumna.");}
    const id=crypto.randomUUID(),key=`${studentId}/${id}`;
    const name=file.name.replace(/[\r\n"\\/\x00-\x1f]/g,"_").slice(0,150);
    await env.BUCKET.put(key,await file.arrayBuffer(),{httpMetadata:{contentType:file.type}});
    const item={id,studentId,key,name,type:file.type,size:file.size,sessionId:sessionId || null,shared:profile!=="teacher" || form.get("shared")==="true",url:`/api/files/${id}`,createdAt:new Date().toISOString()};
    try {await put("files",item);}catch(error){await env.BUCKET.delete(key);throw error;}
    return json({id,url:item.url,name,shared:item.shared});
  }catch(error){return fail(error);}
}
