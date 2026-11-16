export type SessionAccess = {profile:"rocio"|"alejandra"|"teacher"|null;expiresAt:number|null;serverNow:number};

export function sessionAccessFrom(value:unknown):SessionAccess {
  const raw=value as Partial<SessionAccess>|null;
  if(!raw||![null,"rocio","alejandra","teacher"].includes(raw.profile as any)||typeof raw.serverNow!=="number"||!Number.isFinite(raw.serverNow)||raw.serverNow<0||(raw.profile===null?raw.expiresAt!==null:typeof raw.expiresAt!=="number"||!Number.isFinite(raw.expiresAt)||raw.expiresAt<0))throw Error("El servidor no ha confirmado un plazo de acceso válido. Vuelve a seleccionar tu perfil.");
  return raw as SessionAccess;
}

type Timer = ReturnType<typeof setTimeout>;
type ClockOptions = {now?:()=>number;monotonic?:()=>number;setTimer?:(callback:()=>void,delay:number)=>Timer;clearTimer?:(timer:Timer)=>void};
type Anchor = {expiresAt:number;serverNow:number;wall:number;monotonic:number};

/** A server deadline is never recreated as another 24 hours in the browser. */
export function createSessionExpiry(onExpire:()=>void,options:ClockOptions={}) {
  const now=options.now||(()=>Date.now()),monotonic=options.monotonic||(()=>typeof performance==="undefined"?now():performance.now()),setTimer=options.setTimer||((callback,delay)=>setTimeout(callback,delay)),clearTimer=options.clearTimer||((timer)=>clearTimeout(timer));
  let anchor:Anchor|null=null,timer:Timer|null=null;
  const cancelTimer=()=>{if(timer!==null){clearTimer(timer);timer=null;}};
  const estimatedNow=()=>{
    if(!anchor)return 0;
    const wall=now()-anchor.wall,ticks=monotonic()-anchor.monotonic;
    // Wall time covers suspended devices; monotonic time prevents a backwards
    // clock correction from extending a session that is already open.
    return anchor.serverNow+Math.max(0,Number.isFinite(wall)?wall:0,Number.isFinite(ticks)?ticks:0);
  };
  const remaining=()=>anchor?Math.max(0,anchor.expiresAt-estimatedNow()):0;
  const clear=()=>{cancelTimer();anchor=null;};
  const check=()=>{if(!anchor)return false;if(remaining()>0)return true;clear();onExpire();return false;};
  const schedule=()=>{cancelTimer();if(!check())return;timer=setTimer(()=>{timer=null;if(check())schedule();},Math.max(1,Math.min(2_147_483_647,Math.ceil(remaining()))));};
  const update=(expiresAt:number,serverNow:number)=>{
    if(!Number.isFinite(expiresAt)||!Number.isFinite(serverNow)||expiresAt<0||serverNow<0){clear();onExpire();return false;}
    const effectiveNow=anchor?.expiresAt===expiresAt?Math.max(serverNow,estimatedNow()):serverNow;
    anchor={expiresAt,serverNow:effectiveNow,wall:now(),monotonic:monotonic()};schedule();return Boolean(anchor);
  };
  return {update,check,remaining,clear};
}
