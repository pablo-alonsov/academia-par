import { fail, HttpError, json, readBody, requireProfile, sameOrigin, teacherOnly } from "@/lib/server-auth";
import { dispatchNotifications, notificationConfiguration, notificationStatus, queueTestNotification } from "@/lib/server-notifications";
export const dynamic="force-dynamic";

export async function GET(request: Request) {
  try {
    teacherOnly(await requireProfile(request));
    return json(await notificationStatus());
  } catch(error) {return fail(error);}
}

export async function POST(request: Request) {
  try {
    sameOrigin(request);teacherOnly(await requireProfile(request));
    const body=await readBody(request);
    if(!["retry","sendTest"].includes(body.action))throw new HttpError(400,"Acción de correo no válida.");
    if(!notificationConfiguration().enabled)throw new HttpError(409,"Los avisos están pendientes de conectar y activar Resend.");
    if(body.action==="sendTest") {
      if(typeof body.requestId!=="string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId))throw new HttpError(400,"El identificador del correo de prueba no es válido.");
      await queueTestNotification(body.requestId);
    }
    const result=await dispatchNotifications({manual:true,limit:10});
    return json({ok:true,...result,message:result.failed?"Hay avisos sin confirmar. Consulta su estado antes de reintentarlos.":result.accepted?`${result.accepted} ${result.accepted===1?"aviso aceptado":"avisos aceptados"} por Resend.`:"No hay avisos pendientes que se puedan enviar ahora."});
  } catch(error) {return fail(error);}
}
