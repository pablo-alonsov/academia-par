import { fail, HttpError, json, readBody, requireProfile, sameOrigin } from "@/lib/server-auth";
import { perform } from "@/lib/server-actions";
export const dynamic="force-dynamic";
export async function POST(request:Request) {
  try {
    sameOrigin(request);const profile=await requireProfile(request);const body=await readBody(request);
    if(typeof body.action!=="string" || !body.data || typeof body.data!=="object" || Array.isArray(body.data)) throw new HttpError(400,"Acción no válida.");
    return json({ok:true,...await perform(profile,body.action,body.data)});
  } catch(error) {return fail(error);}
}
