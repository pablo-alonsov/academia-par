import { env } from "cloudflare:workers";
import { cleanString, cookie, createSession, currentSession, database, deleteSession, digest, fail, HttpError, json, PROFILES, readBody, sameOrigin, verifyPin, rememberedTeacherSession, rememberTeacher, teacherRememberCookie, SESSION_MAX_AGE_SECONDS, type Profile } from "@/lib/server-auth";
import { seed } from "@/lib/server-data";

export const dynamic = "force-dynamic";
export async function GET(request:Request) { try { const session=await currentSession(request);return json({...(session || {profile:null,expiresAt:null}),serverNow:Date.now()}); } catch(error) {return fail(error);} }
export async function POST(request:Request) {
  try {
    sameOrigin(request);
    const {profile,pin,resume}=await readBody(request);
    if(!PROFILES.includes(profile)) throw new HttpError(400,"Selecciona un perfil válido.");
    const remembered=await rememberedTeacherSession(request);
    let teacherDeadline:number|undefined;
    if(profile==="teacher"&&resume===true){
      if(!remembered)throw new HttpError(401,"Introduce tu contraseña para entrar en el panel docente.","TEACHER_PIN_REQUIRED");
      teacherDeadline=remembered.expiresAt;
    }else if(profile==="teacher") {
      const attemptKey=await digest(`${request.headers.get("cf-connecting-ip") || "unknown"}:teacher`);
      const now=Date.now();
      // Atomic counter prevents concurrent requests bypassing the attempt window.
      await database().prepare("INSERT INTO login_attempts (key,count,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset_at<? THEN 1 ELSE count+1 END,reset_at=CASE WHEN reset_at<? THEN excluded.reset_at ELSE reset_at END").bind(attemptKey,now+600000,now,now).run();
      const attempts=await database().prepare("SELECT count FROM login_attempts WHERE key=?").bind(attemptKey).first<{count:number}>();
      if((attempts?.count || 0)>8) throw new HttpError(429,"Demasiados intentos. Espera diez minutos antes de volver a intentarlo.");
      const stored=(env as unknown as Record<string,string>).TEACHER_PIN_HASH;
      if(!stored) throw new HttpError(503,"Falta configurar la clave docente en el servidor.");
      if(!await verifyPin(cleanString(pin,100),stored)) throw new HttpError(401,"La contraseña no es correcta.");
      await database().prepare("DELETE FROM login_attempts WHERE key=?").bind(attemptKey).run();
      teacherDeadline=Date.now()+SESSION_MAX_AGE_SECONDS*1000;
    }
    await seed();
    const previous=await currentSession(request);
    // Preserve an already open teacher session when this version is first
    // adopted, using its original deadline rather than granting another day.
    const reminder=profile==="teacher"&&resume!==true?await rememberTeacher(request,teacherDeadline!):!remembered&&previous?.profile==="teacher"?await rememberTeacher(request,previous.expiresAt):null;
    await deleteSession(request);
    const {token,expiresAt}=await createSession(request,profile as Profile,teacherDeadline);
    const headers=new Headers();headers.append("Set-Cookie",cookie(request,token,Math.max(0,Math.ceil((expiresAt-Date.now())/1000))));
    if(reminder)headers.append("Set-Cookie",teacherRememberCookie(request,reminder.token,reminder.expiresAt));
    return json({profile,expiresAt,serverNow:Date.now()},200,headers);
  } catch(error) {return fail(error);}
}
export async function DELETE(request:Request) {
  try {
    sameOrigin(request);
    const previous=await currentSession(request),remembered=await rememberedTeacherSession(request);
    const reminder=previous?.profile==="teacher"&&!remembered?await rememberTeacher(request,previous.expiresAt):null;
    await deleteSession(request);
    const headers=new Headers();headers.append("Set-Cookie",cookie(request,"",0));
    if(reminder)headers.append("Set-Cookie",teacherRememberCookie(request,reminder.token,reminder.expiresAt));
    return json({profile:null,expiresAt:null},200,headers);
  } catch(error){return fail(error);}
}
