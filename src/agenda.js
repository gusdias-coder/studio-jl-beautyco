export const SLOT_MIN = 30;
export const NOTICE_HOURS = 2;
export const HORIZON_DAYS = 60;
export const CANCEL_HOURS = 12;
const TZ = 'America/Sao_Paulo';
const MINUTE = 60000;
const DAY = 86400000;
const localDate = new Intl.DateTimeFormat('sv-SE', { timeZone: TZ });
const offsetFormat = new Intl.DateTimeFormat('en', { timeZone: TZ, timeZoneName: 'longOffset' });

export function validDay(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const date = new Date(day + 'T00:00:00Z');
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === day;
}

export function bounds(now = Date.now()) {
  const today = localDate.format(new Date(now));
  const last = new Date(+new Date(today) + HORIZON_DAYS * DAY).toISOString().slice(0, 10);
  return { today, last };
}

export function localTime(day, min) {
  const guess = +new Date(day + 'T00:00:00Z') + min * MINUTE;
  const offset = offsetFormat.formatToParts(guess).find(part => part.type === 'timeZoneName').value;
  const [, sign, hours, minutes] = /^GMT([+-])(\d\d):(\d\d)$/.exec(offset);
  const delta = (Number(hours) * 60 + Number(minutes)) * (sign === '+' ? 1 : -1);
  return new Date(guess - delta * MINUTE).toISOString();
}

export function availabilityFromRows(day, service, hours, occupied, now = Date.now()) {
  const minimum = now + NOTICE_HOURS * 60 * MINUTE;
  const blockMin = Math.ceil(service.duration_min / SLOT_MIN) * SLOT_MIN;
  const result = [];
  for (const row of hours) {
    for (let m = row.start_min; m + blockMin <= row.end_min; m += SLOT_MIN) {
      const start = localTime(day, m);
      if (Date.parse(start) < minimum) continue;
      const end = new Date(Date.parse(start) + blockMin * MINUTE).toISOString();
      if (occupied.some(item => (!item.professional_id || item.professional_id === row.id)
        && item.starts_at < end && item.ends_at > start)) continue;
      result.push({ profissionalId: row.id, profissional: row.name, inicio: start, fim: end, duracaoMin: service.duration_min });
    }
  }
  return result.sort((a, b) => a.inicio.localeCompare(b.inicio) || a.profissional.localeCompare(b.profissional));
}

export async function availability(db, day, serviceId, professionalId = '', excludeId = '') {
  const { today, last } = bounds();
  if (!validDay(day) || day < today || day > last) return [];
  const start = localTime(day, 0);
  const end = localTime(day, 1440);
  const weekday = new Date(day + 'T12:00:00Z').getUTCDay();
  const [services, hours, unavailable] = await db.batch([
    db.prepare('SELECT duration_min FROM services WHERE id = ?').bind(serviceId),
    db.prepare(`SELECT p.id, p.name, h.start_min, h.end_min FROM working_hours h
      JOIN professionals p ON p.id = h.professional_id
      JOIN professional_services ps ON ps.professional_id = p.id
      WHERE h.weekday = ? AND ps.service_id = ? AND (? = '' OR p.id = ?)`)
      .bind(weekday, serviceId, professionalId, professionalId),
    db.prepare(`SELECT professional_id, starts_at, ends_at FROM bookings
      WHERE status = 'confirmed' AND starts_at < ? AND ends_at > ? AND id <> ?
      UNION ALL SELECT professional_id, starts_at, ends_at FROM time_off
      WHERE starts_at < ? AND ends_at > ?`).bind(end, start, excludeId, end, start),
  ]);
  if (!services.results.length) return [];
  return availabilityFromRows(day, services.results[0], hours.results, unavailable.results);
}

export function dayOf(iso) { return localDate.format(new Date(iso)); }

export function canonicalTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:00\.000Z$/.test(value)) return false;
  const ms = Date.parse(value);
  return Number.isFinite(ms) && new Date(ms).toISOString() === value;
}
