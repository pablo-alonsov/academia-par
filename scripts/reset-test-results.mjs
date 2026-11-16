import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';

// Maintenance is explicit, teacher-authenticated and never part of page loading.
// Credentials enter through hidden stdin and are never written to the backup.
const input=await new Promise((accept,reject)=>{
  let value='';const terminal=process.stdin.isTTY;
  const finish=()=>{if(terminal)process.stdin.setRawMode(false);process.stdin.pause();accept(value)};
  if(terminal){process.stdin.setRawMode(true);process.stderr.write('Ready for reset maintenance JSON on stdin (input is hidden).\n')}
  process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>{value+=chunk;if(value.includes('\u0003'))reject(Error('Cancelled'));else if(value.length>4096)reject(Error('Input too large'));else if(/[\r\n]/.test(value))finish()});process.stdin.once('end',finish);process.stdin.resume();
});
const config=JSON.parse(input),origin=new URL(config.origin).origin;
if(!['https://academia-par.movingflair1.chatgpt.site','http://127.0.0.1:5173'].includes(origin))throw Error('Use the selected academy origin.');
if(typeof config.pin!=='string'||!config.pin)throw Error('Teacher password required.');
if(config.execute===true&&config.confirmation!=='RESET_TEST_RESULTS')throw Error('Explicit reset confirmation required.');
if(config.operationId!==undefined&&(typeof config.operationId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_-]{7,127}$/.test(config.operationId)))throw Error('Invalid reset operation ID.');
let cookie='',version='initial';
async function request(path,method='GET',body){
  const response=await fetch(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie,'X-ARP-Profile':'teacher','X-ARP-Result-Version':version}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const result=await response.json();if(!response.ok)throw Error(`HTTP ${response.status}: ${result.error||'Request failed'}`);return {response,result};
}
async function signIn(){
  const {response,result}=await request('/api/auth','POST',{profile:'teacher',pin:config.pin});
  const headers=response.headers.getSetCookie?.() || [response.headers.get('set-cookie')||''];
  cookie=headers.find(value=>value.startsWith('arp_access='))?.split(';')[0] || '';
  if(!cookie||result.profile!=='teacher')throw Error('Teacher access was not confirmed.');
}
const fingerprint=items=>createHash('sha256').update(JSON.stringify([...items].sort((a,b)=>a.id.localeCompare(b.id)))).digest('hex');
try{
  await signIn();
  const before=(await request('/api/maintenance/reset-learning')).result;version=before.resultVersion;
  const data=(await request('/api/data')).result;
  const operationId=config.operationId||randomUUID(),directory=resolve('outputs/result-resets');await mkdir(directory,{recursive:true});
  const backup=resolve(directory,`before-${operationId}-${Date.now()}.json`);
  await writeFile(backup,JSON.stringify({formatVersion:1,origin,capturedAt:new Date().toISOString(),status:before,data},null,2),{flag:'wx'});
  console.log(JSON.stringify({phase:'prepared',operationId,resultVersion:version,counts:before.counts,preserved:before.preserved,backup}));
  if(config.execute===true){
    const expectedVersion=config.expectedVersion||version;
    const reset=(await request('/api/maintenance/reset-learning','POST',{operationId,confirmation:config.confirmation,expectedVersion})).result;
    cookie='';version=reset.resultVersion;await signIn();
    const after=(await request('/api/maintenance/reset-learning')).result;
    const fresh=(await request('/api/data')).result;
    if(Object.values(after.counts).some(value=>value!==0))throw Error('Verification failed: some learning results remain.');
    if(JSON.stringify(before.preserved)!==JSON.stringify(after.preserved))throw Error('Verification failed: reusable content counts changed.');
    for(const table of ['subjects','activities','resources','files'])if(fingerprint(data[table])!==fingerprint(fresh[table]))throw Error(`Verification failed: ${table} changed.`);
    const keep=['id','name','level','color','avatar','avatarFileId','priorities','pinnedResourceIds','favoriteResourceIds','curriculumFocus','subjectPlan','secondTermSubjects'];
    const profiles=items=>items.map(item=>Object.fromEntries(keep.filter(key=>item[key]!==undefined).map(key=>[key,item[key]])));
    if(fingerprint(profiles(data.students))!==fingerprint(profiles(fresh.students)))throw Error('Verification failed: profile settings changed.');
    console.log(JSON.stringify({phase:'verified',operationId,alreadyReset:reset.alreadyReset,resultVersion:after.resultVersion,counts:after.counts,preserved:after.preserved,backup}));
  }
}finally{
  if(cookie)await fetch(origin+'/api/auth',{method:'DELETE',headers:{Origin:origin,Cookie:cookie}}).catch(()=>{});
}
