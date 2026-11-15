import { AsyncLocalStorage } from "node:async_hooks";

type BackgroundContext = { waitUntil: (promise: Promise<unknown>) => void };
const context = new AsyncLocalStorage<BackgroundContext>();
export function runWithNotificationContext<T>(value: BackgroundContext, run: () => T): T {
  return context.run(value, run);
}
export async function continueNotificationDelivery(task: () => Promise<unknown>) {
  const current = context.getStore();
  const promise = task().catch(() => { console.error("PAR notification dispatch did not finish; the queue is retained."); });
  if (current) current.waitUntil(promise);
  else await promise;
}
