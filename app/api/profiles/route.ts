import {fail,json} from "@/lib/server-auth";
import {get,list,seed} from "@/lib/server-data";
import {avatarUrl} from "@/lib/server-avatar";
export const dynamic="force-dynamic";
export async function GET(){
  try{
    let students=await list("students");if(!students.length){await seed();students=await list("students");}
    const order=["rocio","alejandra"];
    const visible=students.filter(s=>order.includes(s.id)).sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
    return json(await Promise.all(visible.map(async s=>{const url=s.avatar==='photo'&&s.avatarFileId?avatarUrl(s,await get('files',s.avatarFileId)):undefined;return {id:s.id,name:s.name,level:s.level,color:s.color,avatar:s.avatar,...(url?{avatarUrl:url}:{})};})));
  }catch(error){return fail(error);}
}
