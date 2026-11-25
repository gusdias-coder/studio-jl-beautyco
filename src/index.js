import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { availability, bounds, canonicalTime, dayOf, localTime, validDay, CANCEL_HOURS } from './agenda.js';
import { admin, hash, payloadLimit, proof, sameOrigin, throttle, token } from './security.js';

const app = new Hono();
const identifier = /^[a-z0-9-]{1,64}$/;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

const jsonError = (c, erro, status) => c.json({ erro }, status);
const publicBooking = `SELECT b.id, b.service_id, b.professional_id, b.starts_at, b.ends_at, b.status,
  b.duration_min, b.price_cents, s.name AS servico, p.name AS profissional
  FROM bookings b JOIN services s ON s.id = b.service_id JOIN professionals p ON p.id = b.professional_id`;

app.use('/api/*', secureHeaders(), async (c, next) => {
  c.header('Cache-Control', 'no-store');
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') return sameOrigin(c, next);
  await next();
});
app.use('/api/admin/*', admin);
app.use('/api/*', payloadLimit);
app.get('/api/status', async c => {
  await c.env.DB.prepare('SELECT 1 FROM services LIMIT 1').first();
  return c.json({ online: true, demo: true });
});

app.get('/api/servicos', async c => {
  const db = c.env.DB;
  const [services, professionals] = await db.batch([
    db.prepare('SELECT id, name, duration_min, price_cents FROM services ORDER BY name'),
    db.prepare(`SELECT p.id, p.name, ps.service_id FROM professionals p
      JOIN professional_services ps ON ps.professional_id = p.id ORDER BY p.name`),
  ]);
  return c.json({
    servicos: services.results.map(service => ({
      ...service, profissionais: professionals.results.filter(item => item.service_id === service.id)
        .map(({ id, name }) => ({ id, name })),
    })),
    ...bounds(), turnstile: c.env.TURNSTILE_SITE_KEY || null,
  });
});

app.get('/api/disponibilidade', async c => {
  const { data = '', servico = '', profissional = '' } = c.req.query();
  const { today, last } = bounds();
  if (!validDay(data) || data < today || data > last || !identifier.test(servico)
    || (profissional && !identifier.test(profissional))) return jsonError(c, 'dados_invalidos', 400);
  return c.json({ horarios: await availability(c.env.DB, data, servico, profissional) });
});

async function body(c) {
  if (!/^application\/json(?:\s*;|$)/i.test(c.req.header('Content-Type') || '')) return null;
  try {
    const value = await c.req.json();
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  } catch { return null; }
}

app.post('/api/agendamentos', async c => {
  const data = await body(c);
  if (!data || typeof data.servicoId !== 'string' || typeof data.profissionalId !== 'string'
    || !identifier.test(data.servicoId) || !identifier.test(data.profissionalId)
    || !canonicalTime(data.inicio) || typeof data.codigoDemo !== 'string' || !uuid.test(data.codigoDemo)) {
    return jsonError(c, 'dados_invalidos', 400);
  }
  if (!(await proof(c, data.turnstile))) return jsonError(c, 'verificacao_falhou', 403);
  if (!(await throttle(c))) return jsonError(c, 'limite_de_reservas', 429);
  const db = c.env.DB;
  const service = await db.prepare('SELECT duration_min, price_cents FROM services WHERE id = ?').bind(data.servicoId).first();
  if (!service) return jsonError(c, 'dados_invalidos', 400);
  const slots = await availability(db, dayOf(data.inicio), data.servicoId, data.profissionalId);
  const slot = slots.find(item => item.inicio === data.inicio);
  if (!slot || slot.duracaoMin !== service.duration_min) return jsonError(c, 'horario_indisponivel', 409);
  const id = crypto.randomUUID();
  const manage = token();
  const stored = await db.prepare(`INSERT INTO bookings
    (id, service_id, professional_id, starts_at, ends_at, duration_min, price_cents, demo_code, manage_token_hash)
    SELECT ?, id, ?, ?, ?, duration_min, price_cents, ?, ? FROM services
    WHERE id = ? AND duration_min = ? AND price_cents IS ?`)
    .bind(id, data.profissionalId, slot.inicio, slot.fim, data.codigoDemo, await hash(manage),
      data.servicoId, service.duration_min, service.price_cents).run();
  if (!stored.meta.changes) return jsonError(c, 'horario_indisponivel', 409);
  return c.json({ id, token: manage, inicio: slot.inicio }, 201);
});

async function managed(c) {
  const value = c.req.header('X-Manage-Token');
  const id = c.req.param('id');
  if (!uuid.test(id) || !/^[a-f0-9]{64}$/.test(value || '')) return null;
  return c.env.DB.prepare(publicBooking + ' WHERE b.id = ? AND b.manage_token_hash = ?')
    .bind(id, await hash(value)).first();
}

app.get('/api/agendamentos/:id', async c => {
  const booking = await managed(c);
  if (!booking) return jsonError(c, 'reserva_nao_encontrada', 404);
  return c.json({ reserva: booking, cancelavel: booking.status === 'confirmed'
    && Date.parse(booking.starts_at) - Date.now() >= CANCEL_HOURS * 3600000 });
});

app.post('/api/agendamentos/:id/cancelar', async c => {
  const booking = await managed(c);
  if (!booking) return jsonError(c, 'reserva_nao_encontrada', 404);
  if (booking.status === 'cancelled') return c.json({ cancelado: true });
  const deadline = new Date(Date.now() + CANCEL_HOURS * 3600000).toISOString();
  const result = await c.env.DB.prepare(`UPDATE bookings SET status = 'cancelled' WHERE id = ?
    AND status = 'confirmed' AND starts_at = ? AND starts_at >= ?`).bind(booking.id, booking.starts_at, deadline).run();
  if (!result.meta.changes) return jsonError(c, 'cancelamento_indisponivel', 409);
  return c.json({ cancelado: true });
});

app.get('/api/admin/agendamentos', async c => {
  const { data = bounds().today } = c.req.query();
  if (!validDay(data)) return jsonError(c, 'dados_invalidos', 400);
  const from = localTime(data, 0);
  const until = localTime(data, 1440);
  const db = c.env.DB;
  const [bookings, blocks, professionals] = await db.batch([
    db.prepare(publicBooking + ' WHERE b.starts_at < ? AND b.ends_at > ? ORDER BY b.starts_at').bind(until, from),
    db.prepare(`SELECT t.*, p.name AS profissional FROM time_off t LEFT JOIN professionals p ON p.id = t.professional_id
      WHERE t.starts_at < ? AND t.ends_at > ? ORDER BY t.starts_at`).bind(until, from),
    db.prepare('SELECT id, name FROM professionals ORDER BY name'),
  ]);
  return c.json({ reservas: bookings.results, bloqueios: blocks.results, profissionais: professionals.results });
});

app.post('/api/admin/agendamentos/:id/cancelar', async c => {
  const result = await c.env.DB.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ? AND status = 'confirmed'")
    .bind(c.req.param('id')).run();
  return result.meta.changes ? c.json({ cancelado: true }) : jsonError(c, 'reserva_nao_encontrada', 404);
});

app.get('/api/admin/agendamentos/:id/horarios', async c => {
  const data = c.req.query('data') || '';
  if (!validDay(data)) return jsonError(c, 'dados_invalidos', 400);
  const booking = await c.env.DB.prepare("SELECT id, service_id FROM bookings WHERE id = ? AND status = 'confirmed'")
    .bind(c.req.param('id')).first();
  if (!booking) return jsonError(c, 'reserva_nao_encontrada', 404);
  return c.json({ horarios: await availability(c.env.DB, data, booking.service_id, '', booking.id) });
});

app.post('/api/admin/agendamentos/:id/remarcar', async c => {
  const data = await body(c);
  if (!data || !canonicalTime(data.inicio) || typeof data.profissionalId !== 'string' || !identifier.test(data.profissionalId)) {
    return jsonError(c, 'dados_invalidos', 400);
  }
  const db = c.env.DB;
  const id = c.req.param('id');
  const booking = await db.prepare("SELECT * FROM bookings WHERE id = ? AND status = 'confirmed'").bind(id).first();
  if (!booking) return jsonError(c, 'reserva_nao_encontrada', 404);
  const slots = await availability(db, dayOf(data.inicio), booking.service_id, data.profissionalId, id);
  const slot = slots.find(item => item.inicio === data.inicio);
  if (!slot) return jsonError(c, 'horario_indisponivel', 409);
  const result = await db.prepare(`UPDATE bookings SET professional_id = ?, starts_at = ?, ends_at = ?,
    duration_min = ?
    WHERE id = ? AND status = 'confirmed' AND starts_at = ? AND professional_id = ?
      AND ? = (SELECT duration_min FROM services WHERE id = service_id)`)
    .bind(slot.profissionalId, slot.inicio, slot.fim, slot.duracaoMin, id, booking.starts_at, booking.professional_id, slot.duracaoMin).run();
  return result.meta.changes ? c.json({ remarcado: true }) : jsonError(c, 'horario_indisponivel', 409);
});

app.post('/api/admin/bloqueios', async c => {
  const data = await body(c);
  if (!data || !canonicalTime(data.inicio) || !canonicalTime(data.fim) || data.inicio >= data.fim
    || (data.profissionalId !== null && (typeof data.profissionalId !== 'string' || !identifier.test(data.profissionalId)))) {
    return jsonError(c, 'dados_invalidos', 400);
  }
  const db = c.env.DB;
  if (data.profissionalId && !(await db.prepare('SELECT id FROM professionals WHERE id = ?').bind(data.profissionalId).first())) {
    return jsonError(c, 'dados_invalidos', 400);
  }
  const id = crypto.randomUUID();
  await db.batch([
    db.prepare('INSERT INTO time_off VALUES (?, ?, ?, ?)').bind(id, data.profissionalId, data.inicio, data.fim),
    db.prepare("INSERT INTO audit_log(actor,action,entity_id) VALUES ('equipe','bloqueio_criado',?)").bind(id),
  ]);
  return c.json({ id }, 201);
});

app.delete('/api/admin/bloqueios/:id', async c => {
  const id = c.req.param('id');
  const db = c.env.DB;
  const [result] = await db.batch([
    db.prepare('DELETE FROM time_off WHERE id = ?').bind(id),
    db.prepare("INSERT INTO audit_log(actor,action,entity_id) SELECT 'equipe','bloqueio_excluido',? WHERE changes() = 1").bind(id),
  ]);
  return result.meta.changes ? c.json({ removido: true }) : jsonError(c, 'bloqueio_nao_encontrado', 404);
});

app.put('/api/admin/servicos/:id', async c => {
  const data = await body(c);
  if (!data || !Number.isInteger(data.duracaoMin) || data.duracaoMin < 15 || data.duracaoMin > 480
    || (data.precoCentavos !== null && (!Number.isInteger(data.precoCentavos)
      || data.precoCentavos < 0 || data.precoCentavos > 10000000))) return jsonError(c, 'dados_invalidos', 400);
  const id = c.req.param('id');
  const db = c.env.DB;
  const [result] = await db.batch([
    db.prepare('UPDATE services SET duration_min = ?, price_cents = ? WHERE id = ?').bind(data.duracaoMin, data.precoCentavos, id),
    db.prepare("INSERT INTO audit_log(actor,action,entity_id) SELECT 'equipe','servico_editado',? WHERE changes() = 1").bind(id),
  ]);
  return result.meta.changes ? c.json({ atualizado: true }) : jsonError(c, 'servico_nao_encontrado', 404);
});

app.onError((error, c) => {
  if (error.message.includes('schedule_conflict')) return jsonError(c, 'horario_indisponivel', 409);
  if (error.message.includes('demo_booking_limit')) return jsonError(c, 'limite_de_reservas', 429);
  console.error('agenda_request_failed', { route: c.req.routePath });
  return jsonError(c, 'erro_interno', 500);
});

app.all('/api/*', c => jsonError(c, 'rota_nao_encontrada', 404));
app.all('*', c => c.env.ASSETS.fetch(c.req.raw));

export default {
  fetch: app.fetch,
  async scheduled(_event, env) {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM demo_limits WHERE bucket < strftime('%Y-%m-%dT%H','now','-1 day')"),
      env.DB.prepare("DELETE FROM bookings WHERE ends_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-30 days')"),
      env.DB.prepare("DELETE FROM time_off WHERE ends_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-30 days')"),
      env.DB.prepare("DELETE FROM audit_log WHERE at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-90 days')"),
    ]);
  },
};
