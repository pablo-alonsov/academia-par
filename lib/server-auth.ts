import { env } from "cloudflare:workers";

export type Profile = "teacher" | "rocio" | "alejandra";
export const PROFILES = ["teacher", "rocio", "alejandra"] as const;
const COOKIE = "arp_access";
export const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;
export type AccessSession = {profile: Profile; expiresAt: number};
export function database(): D1Database {
  if (!env.DB) throw new HttpError(503, "La base de datos no está disponible.");
  return env.DB;
}
export class HttpError extends Error { constructor(public status: number, message: string, public code?: string) { super(message); } }
export function json(value: unknown, status = 200, extra?: HeadersInit) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra } });
}
export function fail(error: unknown) {
  if (error instanceof HttpError) return json({error: error.message,...(error.code?{code:error.code}:{})}, error.status,error.code==="PROFILE_CHANGED"?{"X-ARP-Profile-Changed":"true"}:undefined);
  console.error("PAR server operation failed", error instanceof Error ? error.message : "unknown");
  return json({error:"No se pudo guardar. Tus cambios no se han confirmado; vuelve a intentarlo."}, 500);
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, "Origen no autorizado.");
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new HttpError(403, "Origen no autorizado.");
}
function hex(bytes: ArrayBuffer | Uint8Array) { return Array.from(new Uint8Array(bytes)).map(x => x.toString(16).padStart(2,"0")).join(""); }
export async function digest(value: string) { return hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value))); }
export async function hashPin(pin: string) {
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const base=await crypto.subtle.importKey("raw",new TextEncoder().encode(pin),"PBKDF2",false,["deriveBits"]);
  const result=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt,iterations:100000},base,256);
  return `pbkdf2$100000$${hex(salt)}$${hex(result)}`;
}
export async function verifyPin(pin: string, stored: string) {
  const [alg,iterations,salt,expected]=stored.split("$");
  if (alg!=="pbkdf2" || !/^\d+$/.test(iterations) || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{64}$/.test(expected)) return false;
  const base=await crypto.subtle.importKey("raw",new TextEncoder().encode(pin),"PBKDF2",false,["deriveBits"]);
  const actual=hex(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:new Uint8Array(salt.match(/../g)!.map(x=>parseInt(x,16))),iterations:Number(iterations)},base,256));
  let different=0; for(let i=0;i<actual.length;i++) different|=actual.charCodeAt(i)^expected.charCodeAt(i);
  return different===0;
}
export async function currentSession(request: Request): Promise<AccessSession | null> {
  const token=request.headers.get("cookie")?.split(";").map(x=>x.trim()).find(x=>x.startsWith(COOKIE+"="))?.slice(COOKIE.length+1);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const row=await database().prepare("SELECT profile, expires_at FROM app_sessions WHERE token_hash = ?").bind(await digest(token)).first<{profile:Profile,expires_at:number}>();
  // This stored deadline is absolute. Reading/using an access token never
  // extends it, including tokens created under the earlier 12-hour policy.
  if (!row || !Number.isFinite(row.expires_at) || row.expires_at<=Date.now() || !PROFILES.includes(row.profile)) return null;
  return {profile: row.profile, expiresAt: row.expires_at};
}
export async function currentProfile(request: Request): Promise<Profile | null> { return (await currentSession(request))?.profile || null; }
export async function requireProfile(request: Request) {
  const profile=await currentProfile(request); if(!profile) throw new HttpError(401,"Elige tu perfil para continuar.");
  const expected=request.headers.get("X-ARP-Profile");
  if(expected!==null && expected!==profile)throw new HttpError(409,"El perfil ha cambiado en otra pestaña. Vuelve a elegirlo para continuar.","PROFILE_CHANGED");
  if(!['GET','HEAD','OPTIONS'].includes(request.method)&&new URL(request.url).pathname!=='/api/maintenance/reset-learning'){
    const row=await database().prepare("SELECT json_extract(data,'$.resultVersion') AS version FROM students WHERE id='rocio'").first<{version:string|null}>();
    if(row?.version&&request.headers.get('X-ARP-Result-Version')!==row.version)throw new HttpError(409,'Los resultados se han reiniciado. Recarga la página para continuar.','RESULTS_RESET');
  }
  return profile;
}
export function teacherOnly(profile: Profile) { if(profile!=="teacher") throw new HttpError(403,"Esta acción es exclusiva del panel docente."); }
export function cookie(request:Request,token:string,maxAge=SESSION_MAX_AGE_SECONDS) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol==="https:"?"; Secure":""}`;
}
export async function createSession(request:Request,profile:Profile) {
  const token=hex(crypto.getRandomValues(new Uint8Array(32)));
  const expiresAt=Date.now()+SESSION_MAX_AGE_SECONDS*1000;
  // Access belongs to this app's random token, independent of external sign-in.
  // Retain the nullable legacy column so existing database migrations stay intact.
  await database().prepare("INSERT INTO app_sessions (token_hash,profile,expires_at,platform_user_id) VALUES (?,?,?,NULL)").bind(await digest(token),profile,expiresAt).run();
  return {token,expiresAt};
}
export async function deleteSession(request:Request) {
  const token=request.headers.get("cookie")?.split(";").map(x=>x.trim()).find(x=>x.startsWith(COOKIE+"="))?.slice(COOKIE.length+1);
  if(token) await database().prepare("DELETE FROM app_sessions WHERE token_hash = ?").bind(await digest(token)).run();
}
export async function readBody(request:Request): Promise<Record<string, any>> {
  if(Number(request.headers.get("content-length") || 0)>150000) throw new HttpError(413,"El contenido es demasiado largo.");
  const raw=await request.text(); if(raw.length>150000) throw new HttpError(413,"El contenido es demasiado largo.");
  let body; try {body=JSON.parse(raw);} catch {throw new HttpError(400,"El contenido no es válido.");}
  if(!body || typeof body!=="object" || Array.isArray(body)) throw new HttpError(400,"El contenido no es válido."); return body;
}
export function validateStudent(value:unknown): "rocio"|"alejandra" {
  if(value!=="rocio" && value!=="alejandra") throw new HttpError(400,"Selecciona una alumna válida."); return value;
}
export function ownStudent(profile:Profile,value:unknown) {
  const id=validateStudent(value); if(profile!=="teacher" && profile!==id) throw new HttpError(403,"No puedes acceder a otra alumna."); return id;
}
export function cleanString(value:unknown, max=20000) { if(typeof value!=="string" || value.length>max) throw new HttpError(400,"El texto no es válido o es demasiado largo."); return value; }
