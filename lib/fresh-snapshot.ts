/** A full refresh must not replace a mutation confirmed while its read was in flight. */
export async function freshSnapshot<T>(read:()=>Promise<T>,revision:()=>number,isCurrent:()=>boolean,install:(snapshot:T)=>void=()=>{}):Promise<T|null>{
  for(let attempt=0;attempt<3;attempt++){
    if(!isCurrent())return null;
    const before=revision(),snapshot=await read();
    if(!isCurrent())return null;
    if(before===revision()){install(snapshot);return snapshot;}
  }
  throw Error('Se han guardado cambios recientes. Reintenta para actualizar la vista.');
}
