import { fail, HttpError, json, readBody, requireProfile, sameOrigin } from "@/lib/server-auth";
import { perform } from "@/lib/server-actions";
import {actionPatch,collectAction} from "@/lib/server-data";
import { triggerNotificationDelivery } from "@/lib/server-notifications";
export const dynamic="force-dynamic";
export async function POST(request:Request) {
  try {
    sameOrigin(request);const profile=await requireProfile(request);const body=await readBody(request);
    if(typeof body.action!=="string" || !body.data || typeof body.data!=="object" || Array.isArray(body.data)) throw new HttpError(400,"Acción no válida.");
    const {result,changes}=await collectAction(()=>perform(profile,body.action,body.data));
    if(profile!=="teacher")await triggerNotificationDelivery();
    return json({ok:true,...result,...await actionPatch(profile,changes)});
  } catch(error) {return fail(error);}
}
