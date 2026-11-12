import { env } from "cloudflare:workers";
import { digest, fail, HttpError } from "@/lib/server-auth";
import { get } from "@/lib/server-data";
import { MAX_PROFILE_PHOTO_BYTES, validAvatarFile } from "@/lib/server-avatar";
import { detectImageType } from "@/lib/upload-format";
export const dynamic="force-dynamic";
export async function GET(request:Request,context:{params:Promise<{id:string}>}){
  try{
    const {id}=await context.params;
    if(id!=="rocio" && id!=="alejandra")throw new HttpError(404,"No hay una foto de perfil disponible.");
    const student=await get("students",id),file=student?.avatarFileId?await get("files",student.avatarFileId):null;
    if(!student || student.avatar!=="photo" || !validAvatarFile(id,file) || new URL(request.url).searchParams.get("v")!==file!.avatarRevision || await digest(file!.id)!==file!.avatarRevision)throw new HttpError(404,"No hay una foto de perfil disponible.");
    if(!env.BUCKET)throw new HttpError(503,"La foto no está disponible.");
    const object=await env.BUCKET.get(file!.key);if(!object || object.size>MAX_PROFILE_PHOTO_BYTES)throw new HttpError(404,"La foto no está disponible.");
    const bytes=new Uint8Array(await object.arrayBuffer());
    if(!bytes.length || bytes.length>MAX_PROFILE_PHOTO_BYTES || bytes.length!==file!.size || detectImageType(bytes)!==file!.type)throw new HttpError(404,"La foto no está disponible.");
    return new Response(bytes,{headers:{"Content-Type":file!.type,"Content-Length":String(bytes.length),"Content-Disposition":"inline","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; sandbox","Cross-Origin-Resource-Policy":"same-origin"}});
  }catch(error){return fail(error);}
}
