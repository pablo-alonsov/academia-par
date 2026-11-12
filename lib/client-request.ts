'use client';

type Recovery = () => Promise<void>;
let recover: Recovery | undefined;
let sessionGeneration = 0;
let expectedProfile:string|null=null;
export function setRequestProfile(profile:string|null){expectedProfile=profile;}
export function invalidateSessionRequests() { sessionGeneration++; }

/** The mounted academy owns the re-entry dialog; editors remain mounted. */
export function setSessionRecovery(handler?: Recovery) { recover = handler; }

export async function authorizedFetch(input: string | URL, init?: RequestInit): Promise<Response> {
  const generation = sessionGeneration;
  const requestProfile=expectedProfile;
  const assertCurrent = () => { if (generation !== sessionGeneration) throw requestError('El perfil ha cambiado. Vuelve a abrir el contenido para continuar.',409); };
  const headers=new Headers(init?.headers);if(requestProfile)headers.set('X-ARP-Profile',requestProfile);
  const hidden=typeof document!=='undefined'&&document.visibilityState==='hidden';
  const keepalive=hidden&&typeof init?.body==='string'&&new TextEncoder().encode(init.body).byteLength<=48000;
  const send = async () => { try { return await fetch(input,{...init,headers,...(keepalive?{keepalive:true}:{})}); } catch { throw requestError('No se ha podido conectar. Comprueba la conexión y vuelve a intentar guardar.',0); } };
  let response = await send();
  assertCurrent();
  if (response.status === 401 && recover) {
    if(typeof document!=='undefined'&&document.visibilityState==='hidden')throw requestError('El acceso ha caducado. Vuelve a entrar para guardar los cambios pendientes.',401);
    assertCurrent();
    await recover();
    assertCurrent();
    response = await send();
    assertCurrent();
  }
  if(response.status===409&&response.headers.get('X-ARP-Profile-Changed')==='true'){
    if(typeof window!=='undefined')window.dispatchEvent(new Event('arp:profile-changed'));
    throw requestError('El perfil ha cambiado en otra pestaña. Vuelve a elegir tu perfil.',409);
  }
  return response;
}

export function requestError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}
