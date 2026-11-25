import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

const base = process.env.AGENDA_URL || 'http://127.0.0.1:8787';
const key = process.env.AGENDA_ADMIN_KEY || /^ADMIN_KEY=(.+)$/m.exec(readFileSync('.dev.vars', 'utf8'))?.[1];
const auth = { Authorization: 'Bearer ' + key };
async function call(path, method = 'GET', data, headers = {}) {
  const response = await fetch(base + '/api' + path, {
    method, headers: { ...headers, ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: JSON.stringify(data),
  });
  return { status: response.status, body: await response.json() };
}
const list = async day => (await call('/disponibilidade?' + new URLSearchParams({ data: day, servico: 'corte', profissional: 'lia' }))).body.horarios;
assert.equal((await call('/status')).status, 200);
const config = (await call('/servicos')).body;
assert.equal(config.servicos.length, 9);
const day = new Date(config.today);
day.setUTCDate(day.getUTCDate() + 4);
while (![2, 3, 4, 5, 6].includes(day.getUTCDay())) day.setUTCDate(day.getUTCDate() + 1);
const date = day.toISOString().slice(0, 10);
const slots = await list(date);
assert.ok(slots.length >= 7);
assert.equal((await call('/disponibilidade?data=2026-02-30&servico=corte')).status, 400);
assert.equal((await call('/admin/agendamentos')).status, 401);
assert.equal((await call('/admin/agendamentos', 'GET', undefined, auth)).status, 200);
const payload = {
  inicio: slots[0].inicio, servicoId: 'corte', profissionalId: 'lia',
  codigoDemo: randomUUID(), precoCentavos: 1,
};
assert.equal((await call('/agendamentos', 'POST', payload, { Origin: 'https://example.com' })).status, 403);
const attempts = await Promise.all(Array.from({ length: 2 }, () => call('/agendamentos', 'POST', payload)));
assert.deepEqual(attempts.map(result => result.status).sort(), [201, 409]);
const { id, token } = attempts.find(result => result.status === 201).body;
const manage = { 'X-Manage-Token': token };
assert.equal((await call('/agendamentos/' + id)).status, 404);
assert.equal((await call('/agendamentos/' + id, 'GET', undefined, { 'X-Manage-Token': '0'.repeat(64) })).status, 404);
const booking = (await call('/agendamentos/' + id, 'GET', undefined, manage)).body.reserva;
assert.ok(booking.price_cents > 1);
const overlap = await call('/admin/bloqueios', 'POST', {
  profissionalId: 'lia', inicio: slots[0].inicio, fim: slots[0].fim,
}, auth);
assert.equal(overlap.status, 409);
const open = slots[4];
const block = await call('/admin/bloqueios', 'POST', {
  profissionalId: 'lia', inicio: open.inicio, fim: open.fim,
}, auth);
assert.equal(block.status, 201);
assert.ok(!(await list(date)).some(slot => slot.inicio === open.inicio));
assert.equal((await call('/admin/bloqueios/' + block.body.id, 'DELETE', undefined, auth)).status, 200);
const moved = await call('/admin/agendamentos/' + id + '/remarcar', 'POST', {
  profissionalId: 'lia', inicio: open.inicio,
}, auth);
assert.equal(moved.status, 200);
assert.equal((await call('/agendamentos/' + id, 'GET', undefined, manage)).body.reserva.starts_at, open.inicio);
assert.equal((await call('/agendamentos/' + id + '/cancelar', 'POST', undefined, manage)).status, 200);
assert.ok((await list(date)).some(slot => slot.inicio === open.inicio));
const limitSlots = [slots[0], slots[3], slots[6], slots.at(-1)];
const profile = randomUUID();
const bookings = [];
for (const slot of limitSlots) {
  const result = await call('/agendamentos', 'POST', { ...payload, inicio: slot.inicio, codigoDemo: profile });
  bookings.push(result);
}
assert.deepEqual(bookings.map(result => result.status), [201, 201, 201, 429]);
for (const result of bookings.slice(0, 3)) {
  assert.equal((await call('/agendamentos/' + result.body.id + '/cancelar', 'POST', undefined,
    { 'X-Manage-Token': result.body.token })).status, 200);
}
console.log('OK: catálogo, disponibilidade, concorrência, proteção, bloqueio, remarcação, cancelamento e limite.');
