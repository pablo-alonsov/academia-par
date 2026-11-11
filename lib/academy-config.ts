/** Inicio acordado para el seguimiento de Academia ARP. */
export const ACADEMY_START_DATE = '2026-11-16';
export function madridToday(now: Date = new Date()): string {
  return now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
}
export function trackingToday(now: Date = new Date()): string {
  const today = madridToday(now);
  return today < ACADEMY_START_DATE ? ACADEMY_START_DATE : today;
}
export function isTrackingDate(date?: string | null): boolean {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date) && date.slice(0, 10) >= ACADEMY_START_DATE;
}
