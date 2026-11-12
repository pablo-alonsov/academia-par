import {fail,json} from "@/lib/server-auth";
import {list,seed} from "@/lib/server-data";
export const dynamic="force-dynamic";
export async function GET(){
  try{
    let students=await list("students");if(!students.length){await seed();students=await list("students");}
    const order=["rocio","alejandra"];
    return json(students.filter(s=>order.includes(s.id)).sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id)).map(s=>({id:s.id,name:s.name,level:s.level,color:s.color,avatar:s.avatar})));
  }catch(error){return fail(error);}
}
