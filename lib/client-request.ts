'use client';

type Recovery = () => Promise<void>;
let recover: Recovery | undefined;
let sessionGeneration = 0;
export function invalidateSessionRequests() { sessionGeneration++; }

/** The mounted academy owns the re-entry dialog; editors remain mounted. */
export function setSessionRecovery(handler?: Recovery) { recover = handler; }

export async function authorizedFetch(input: string | URL, init?: RequestInit): Promise<Response> {
  const generation = sessionGeneration;
  const assertCurrent = () => { if (generation !== sessionGeneration) throw requestError('El perfil ha cambiado. Vuelve a abrir el contenido para continuar.',409); };
  const send = async () => { try { return await fetch(input,init); } catch { throw requestError('No se ha podido conectar. Comprueba la conexión y vuelve a intentar guardar.',0); } };
  let response = await send();
  assertCurrent();
  if (response.status === 401 && recover) {
    assertCurrent();
    await recover();
    assertCurrent();
    response = await send();
    assertCurrent();
  }
  return response;
}

export function requestError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}
