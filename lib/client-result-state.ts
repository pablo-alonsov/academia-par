'use client';

export const RESULT_VERSION_STORAGE_KEY = 'arp-result-version-v1';
export const RESULT_VERSION_CHANGED_EVENT = 'arp:result-version-changed';
export const RESULT_STORAGE_PREFIXES = ['arp-draft-v2:', 'arp-local-form-v1:', 'arp-review-read-v1:', 'arp-teacher-session:'] as const;
type ResultStorage = Pick<Storage, 'length' | 'key' | 'getItem' | 'setItem' | 'removeItem'>;
let resultVersion = 'initial';
const valid = (value:unknown):value is string => typeof value==='string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(value);

export function getResultVersion():string { return resultVersion; }
export function isCurrentResultVersion(version:string):boolean { return version===resultVersion; }
export function resultStoragePrefix(prefix:string, version=getResultVersion()):string { return version==='initial' ? prefix : `${prefix}v:${encodeURIComponent(version)}:`; }
export function storedResultVersion():string {
  try { const value=localStorage.getItem(RESULT_VERSION_STORAGE_KEY); return valid(value)?value:'initial'; } catch { return 'initial'; }
}

/** Preferences and reusable teaching materials never live in these prefixes. */
export function pruneResultStorage(storage:ResultStorage, version=getResultVersion()):string[] {
  if(version==='initial')return [];
  const removed:string[]=[],keys:string[]=[];
  for(let index=0;index<storage.length;index++){const key=storage.key(index);if(key)keys.push(key);}
  for(const key of keys){
    const prefix=RESULT_STORAGE_PREFIXES.find(prefix=>key.startsWith(prefix));
    if(key==='par:notification-test-request'||prefix&&!key.startsWith(resultStoragePrefix(prefix,version))){storage.removeItem(key);removed.push(key);}
  }
  return removed;
}

/** Install before mounting editors; stale cleanup callbacks immediately become inert. */
export function setResultVersion(version:string):void {
  if(!valid(version))throw new Error('La versión de los resultados no es válida.');
  const changed=resultVersion!==version;resultVersion=version;
  try { pruneResultStorage(localStorage,version);localStorage.setItem(RESULT_VERSION_STORAGE_KEY,version); } catch { /* Namespaces still isolate old data when storage is unavailable. */ }
  try { pruneResultStorage(sessionStorage,version); } catch { /* A private tab may not expose sessionStorage. */ }
  if(changed&&typeof window!=='undefined')window.dispatchEvent(new Event(RESULT_VERSION_CHANGED_EVENT));
}

/** Give existing form helpers a version-bound view without changing their saved format. */
export function resultScopedStorage(storage:ResultStorage, version=getResultVersion()):ResultStorage {
  const map=(key:string)=>{const prefix=RESULT_STORAGE_PREFIXES.find(prefix=>key.startsWith(prefix));return prefix?resultStoragePrefix(prefix,version)+key.slice(prefix.length):key;};
  return {
    get length(){return storage.length;},
    key(index:number){const key=storage.key(index);if(!key)return null;const prefix=RESULT_STORAGE_PREFIXES.find(prefix=>key.startsWith(prefix));if(!prefix)return key;const scoped=resultStoragePrefix(prefix,version);if(!key.startsWith(scoped))return null;if(version==='initial'&&key.slice(prefix.length).startsWith('v:'))return null;return prefix+key.slice(scoped.length);},
    getItem(key:string){return isCurrentResultVersion(version)?storage.getItem(map(key)):null;},
    setItem(key:string,value:string){if(!isCurrentResultVersion(version))throw new Error('Los resultados se han reiniciado. Vuelve a entrar en tu perfil.');storage.setItem(map(key),value);},
    removeItem(key:string){if(isCurrentResultVersion(version))storage.removeItem(map(key));},
  };
}
