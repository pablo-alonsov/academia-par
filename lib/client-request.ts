'use client';
import {getResultVersion} from './client-result-state';

let onExpired:(()=>void)|undefined;
let accessCheck:(()=>boolean)|undefined;
let sessionGeneration=0;
let expectedProfile:string|null=null;
export function setRequestProfile(profile:string|null){if(expectedProfile!==profile)sessionGeneration++;expectedProfile=profile;}
export function invalidateSessionRequests(){sessionGeneration++;}
export function setSessionExpiryHandler(handler?:()=>void){onExpired=handler;}
export function setSessionAccessCheck(check?:()=>boolean){accessCheck=check;}

function expireRequestSession(){
  if(!expectedProfile)return;
  expectedProfile=null;sessionGeneration++;onExpired?.();
}
function assertAccess(){
  if(!expectedProfile)throw requestError('Elige tu perfil para continuar.',401);
  if(accessCheck&&!accessCheck()){expireRequestSession();throw requestError('El acceso ha caducado. Vuelve a seleccionar tu perfil.',401);}
}

/** Private requests never sign in again or replay a write after expiration. */
export async function authorizedFetch(input:string|URL,init?:RequestInit):Promise<Response>{
  assertAccess();
  const generation=sessionGeneration,requestProfile=expectedProfile,resultVersion=getResultVersion();
  const assertCurrent=()=>{if(generation!==sessionGeneration||requestProfile!==expectedProfile)throw requestError('El perfil ha cambiado. Vuelve a abrir el contenido para continuar.',409);if(resultVersion!==getResultVersion())throw requestError('Los resultados se han reiniciado. Vuelve a abrir el contenido para continuar.',409);};
  const headers=new Headers(init?.headers);headers.set('X-ARP-Profile',requestProfile!);headers.set('X-ARP-Result-Version',resultVersion);
  const hidden=typeof document!=='undefined'&&document.visibilityState==='hidden';
  const keepalive=hidden&&typeof init?.body==='string'&&new TextEncoder().encode(init.body).byteLength<=48000;
  let response:Response;
  try{response=await fetch(input,{...init,headers,...(keepalive?{keepalive:true}:{})});}
  catch{assertCurrent();assertAccess();throw requestError('No se ha podido conectar. Comprueba la conexión y vuelve a intentar guardar.',0);}
  assertCurrent();assertAccess();
  if(response.status===401){expireRequestSession();throw requestError('El acceso ha caducado. Selecciona tu perfil para continuar.',401);}
  if(response.status===409&&response.headers.get('X-ARP-Profile-Changed')==='true'){
    expectedProfile=null;sessionGeneration++;
    if(typeof window!=='undefined')window.dispatchEvent(new Event('arp:profile-changed'));
    throw requestError('El perfil ha cambiado en otra pestaña. Vuelve a elegir tu perfil.',409);
  }
  if(response.status===409){
    const body:any=await response.clone().json().catch(()=>null);
    if(body?.code==='RESULTS_RESET'){
      expectedProfile=null;sessionGeneration++;
      if(typeof window!=='undefined')window.dispatchEvent(new Event('arp:results-reset'));
      throw Object.assign(requestError('Se han reiniciado los resultados. Selecciona tu perfil para continuar.',409),{code:'RESULTS_RESET'});
    }
  }
  return response;
}

export function requestError(message:string,status:number){return Object.assign(new Error(message),{status});}
