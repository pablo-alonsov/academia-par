import { env } from "cloudflare:workers";
import { database, digest, fail, HttpError, json, ownStudent, requireProfile, sameOrigin } from "@/lib/server-auth";
import { actionPatch, collectAction, get, required, studentPatchStatement, trackChange, type RecordData } from "@/lib/server-data";
import { detectImageType } from "@/lib/upload-format";
import { avatarUrl, MAX_PROFILE_PHOTO_BYTES, PROFILE_PHOTO_TYPES, validAvatarFile } from "@/lib/server-avatar";
export const dynamic="force-dynamic";

export async function POST(request:Request){
  try{
    sameOrigin(request);const profile=await requireProfile(request);
    const bucket=env.BUCKET;if(!bucket)throw new HttpError(503,"El almacenamiento de fotos no está disponible.");
    if(Number(request.headers.get("content-length") || 0)>MAX_PROFILE_PHOTO_BYTES+128*1024)throw new HttpError(413,"La foto de perfil debe ocupar como máximo 2 MB.");
    const form=await request.formData(),file=form.get("file"),studentId=ownStudent(profile,form.get("studentId") || profile);
    await required("students",studentId);
    if(!file || typeof file==="string" || !("arrayBuffer" in file))throw new HttpError(400,"Selecciona una foto de perfil.");
    if(file.size===0 || file.size>MAX_PROFILE_PHOTO_BYTES)throw new HttpError(413,"La foto de perfil debe ocupar entre 1 byte y 2 MB.");
    const uploadId=form.get("uploadId");if(uploadId!==null && (typeof uploadId!=="string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uploadId)))throw new HttpError(400,"El identificador de carga no es válido.");
    const bytes=new Uint8Array(await file.arrayBuffer()),type=detectImageType(bytes);
    if(!type || !PROFILE_PHOTO_TYPES.includes(type as typeof PROFILE_PHOTO_TYPES[number]))throw new HttpError(400,"Usa una foto JPG, PNG o WebP. Convierte otros formatos antes de guardarla.");
    const contentHash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))).map(b=>b.toString(16).padStart(2,"0")).join("");
    const id=uploadId?await digest(`profile-photo:${studentId}:${uploadId.toLowerCase()}`):await digest(crypto.randomUUID()),nonce=crypto.randomUUID();
    const key=`avatars/${studentId}/${id}/${nonce}`,avatarRevision=await digest(id);
    const item:RecordData={id,studentId,key,purpose:"avatar",name:file.name.replace(/[\r\n"\\/\x00-\x1f\x7f]/g,"_").slice(0,150).trim() || "foto",type,size:file.size,contentHash,avatarRevision,shared:false,_profileUploadNonce:nonce,createdAt:new Date().toISOString()};
    const check=(saved:RecordData)=>{if(!validAvatarFile(studentId,saved) || saved.contentHash!==contentHash || saved.type!==type || saved.size!==file.size)throw new HttpError(409,"Este intento de carga corresponde a otra foto. Vuelve a seleccionarla.");};
    const currentUrl=async()=>{const current=await required("students",studentId);if(current.avatar!=="photo" || current.avatarFileId!==id)throw new HttpError(409,"Esta foto ya se subió, pero el perfil cambió después. Vuelve a seleccionarla si quieres usarla.");return avatarUrl(current,await get("files",id));};
    const {result,changes}=await collectAction(async()=>{
      trackChange("students",studentId);
      const old=await get("files",id);
      if(old){check(old);return {id,avatarUrl:await currentUrl(),alreadyUploaded:true};}
      await bucket.put(key,bytes,{httpMetadata:{contentType:type}});
      try{
        const now=new Date().toISOString();
        item.updatedAt=now;
        // The winning insertion and profile selection are atomic. Replaying an
        // older upload cannot reactivate it after another photo/icon was chosen.
        await database().batch([database().prepare("INSERT OR IGNORE INTO files (id,student_id,data,updated_at) VALUES (?,?,?,?)").bind(id,studentId,JSON.stringify(item),now),studentPatchStatement(studentId,{avatar:"photo",avatarFileId:id},["avatarUrl"],{fileId:id,nonce})]);
        const saved=await required("files",id);if(saved.key!==key)await bucket.delete(key);check(saved);
        return {id,avatarUrl:await currentUrl(),...(saved.key!==key?{alreadyUploaded:true}:{})};
      }catch(error){try{const saved=await get("files",id);if(!saved || saved.key!==key)await bucket.delete(key);}catch{}throw error;}
    });
    return json({ok:true,...result,...await actionPatch(profile,changes)});
  }catch(error){return fail(error);}
}
