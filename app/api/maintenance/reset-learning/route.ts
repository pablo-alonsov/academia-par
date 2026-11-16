import {cookie,fail,json,readBody,requireProfile,sameOrigin,teacherOnly} from '@/lib/server-auth';
import {learningResetStatus,resetLearningResults} from '@/lib/reset-learning';
export const dynamic='force-dynamic';

export async function GET(request:Request){
  try{teacherOnly(await requireProfile(request));return json(await learningResetStatus());}catch(error){return fail(error);}
}
export async function POST(request:Request){
  try{
    sameOrigin(request);teacherOnly(await requireProfile(request));
    const result=await resetLearningResults(await readBody(request));
    return json(result,200,result.alreadyReset?undefined:{'Set-Cookie':cookie(request,'',0)});
  }catch(error){return fail(error);}
}
