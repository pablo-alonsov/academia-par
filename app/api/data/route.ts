import {fail,json,requireProfile} from "@/lib/server-auth";
import {snapshot} from "@/lib/server-data";
export const dynamic="force-dynamic";
export async function GET(request:Request) {try{return json(await snapshot(await requireProfile(request)));}catch(error){return fail(error);}}
