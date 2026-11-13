import { env } from "cloudflare:workers";
import { database, fail, HttpError, json, requireProfile, sameOrigin, teacherOnly } from "@/lib/server-auth";
import { required } from "@/lib/server-data";
export const dynamic="force-dynamic";
export async function GET(request:Request,context:{params:Promise<{id:string}>}) {
  try {
    const profile=await requireProfile(request),{id}=await context.params;
    const file=await required("files",id);
    if(file.purpose==="avatar")throw new HttpError(404,"Este archivo no está disponible como material.");
    if(profile!=="teacher" && (file.studentId!==profile || file.shared!==true || file.detached===true))throw new HttpError(403,"No tienes acceso a este archivo.");
    if(!env.BUCKET)throw new HttpError(503,"El almacenamiento no está disponible.");
    const object=await env.BUCKET.get(file.key);if(!object)throw new HttpError(404,"El archivo no está disponible.");
    const viewPdf=file.type==="application/pdf"&&new URL(request.url).searchParams.get("view")==="inline";
    const inline=viewPdf||["image/jpeg","image/png","image/webp","image/gif"].includes(file.type);
    const fallback=String(file.name).normalize("NFKD").replace(/[^\x20-\x7e]|["\\/]/g,"_").trim() || "archivo";
    const headers:Record<string,string>={"Content-Type":file.type,"Content-Disposition":`${inline?"inline":"attachment"}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(file.name)}`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; sandbox"};
    const size=object.size ?? file.size;let body=object.body;
    if(typeof size==="number" && Number.isSafeInteger(size) && size>=0){
      headers["Content-Length"]=String(size);
      // Workers ignores a manual length on an ordinary stream. Preserve streaming
      // while making its known R2 length available to the HTTP runtime.
      if(typeof FixedLengthStream!=="undefined" && body instanceof ReadableStream){const fixed=new FixedLengthStream(size);void body.pipeTo(fixed.writable).catch(()=>{});body=fixed.readable;}
    }
    return new Response(body,{headers});
  }catch(error){return fail(error);}
}
export async function DELETE(request:Request,context:{params:Promise<{id:string}>}) {
  try {
    sameOrigin(request);teacherOnly(await requireProfile(request));const {id}=await context.params;
    const file=await required("files",id);
    if(file.purpose==="avatar")throw new HttpError(400,"Retira la foto desde el perfil. El archivo original se conserva.");
    const references=await database().prepare("SELECT id FROM resources WHERE instr(data,?)>0 UNION SELECT id FROM evidence WHERE instr(data,?)>0 UNION SELECT id FROM responses WHERE instr(data,?)>0 UNION SELECT id FROM sessions WHERE instr(data,?)>0 LIMIT 1").bind(id,id,id,id).first();
    if(references)throw new HttpError(409,"Retira primero el archivo de los recursos o evidencias que lo utilizan.");
    if(!env.BUCKET)throw new HttpError(503,"El almacenamiento no está disponible.");
    await env.BUCKET.delete(file.key);await database().prepare("DELETE FROM files WHERE id=?").bind(id).run();
    return json({ok:true});
  }catch(error){return fail(error);}
}
