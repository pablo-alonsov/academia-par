import { env } from "cloudflare:workers";
import { cleanString, cookie, createSession, currentProfile, database, deleteSession, digest, fail, HttpError, json, PROFILES, readBody, sameOrigin, verifyPin, type Profile } from "@/lib/server-auth";
import { seed } from "@/lib/server-data";

export const dynamic = "force-dynamic";
export async function GET(request:Request) { try { return json({profile:await currentProfile(request)}); } catch(error) {return fail(error);} }
export async function POST(request:Request) {
  try {
    sameOrigin(request);
    const {profile,pin}=await readBody(request);
    if(!PROFILES.includes(profile)) throw new HttpError(400,"Selecciona un perfil válido.");
    if(profile==="teacher") {
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
    }
    await seed();
    await deleteSession(request);
    const token=await createSession(request,profile as Profile);
    return json({profile},200,{"Set-Cookie":cookie(request,token)});
  } catch(error) {return fail(error);}
}
export async function DELETE(request:Request) {
  try {sameOrigin(request);await deleteSession(request);return json({profile:null},200,{"Set-Cookie":cookie(request,"",0)});} catch(error){return fail(error);}
}
