import { api, get, el, dateTime } from './agenda-api.js';

const feedback = get('feedback');
const day = get('day');
const catalog = get('catalog');
let key = '';
let services = [];
let requestNumber = 0;
let authenticated = false;
function request(path, method = 'GET', data) {
  return api('/admin' + path, { method, data, headers: key ? { Authorization: 'Bearer ' + key } : {} });
}
function report(error) { feedback.textContent = error.message; }
function action(label, fn) {
  const button = el('button', label, 'booking-previous');
  button.type = 'button';
  button.addEventListener('click', async () => {
    button.disabled = true;
    try { await fn(); }
    catch (error) { report(error); }
    finally { button.disabled = false; }
  });
  return button;
}

async function load() {
  const attempt = ++requestNumber;
  const data = await request('/agendamentos?' + new URLSearchParams({ data: day.value }));
  if (attempt !== requestNumber) return;
  get('bookings').replaceChildren(...data.reservas.map(bookingRow));
  if (!data.reservas.length) get('bookings').append(el('p', 'Sem reservas neste dia.'));
  get('blocks').replaceChildren(...data.bloqueios.map(blockRow));
  if (!data.bloqueios.length) get('blocks').append(el('p', 'Sem bloqueios neste dia.'));
  const person = get('block-person');
  const selected = person.value;
  person.replaceChildren(new Option('Toda a equipe', ''), ...data.profissionais.map(p => new Option(p.name, p.id)));
  person.value = selected;
}

function blockRow(block) {
  const row = el('div', '', 'agenda-row');
  row.append(el('p', (block.profissional || 'Toda a equipe') + ' · '
    + dateTime.format(new Date(block.starts_at)) + ' até ' + dateTime.format(new Date(block.ends_at))));
  row.append(action('Remover bloqueio', async () => {
    if (!window.confirm('Remover este bloqueio?')) return;
    await request('/bloqueios/' + block.id, 'DELETE');
    await load();
    feedback.textContent = 'Bloqueio removido.';
  }));
  return row;
}

function bookingRow(booking) {
  const row = el('div', '', 'agenda-row');
  row.append(el('p', [booking.servico, booking.profissional, dateTime.format(new Date(booking.starts_at)),
    booking.status === 'confirmed' ? 'Confirmada' : 'Cancelada'].join(' · ')));
  if (booking.status === 'confirmed') {
    row.append(action('Cancelar', async () => {
      if (!window.confirm('Cancelar esta reserva?')) return;
      await request('/agendamentos/' + booking.id + '/cancelar', 'POST');
      await load();
      feedback.textContent = 'Reserva cancelada.';
    }));
    const move = action('Remarcar', () => {
      move.hidden = true;
      row.append(moveForm(booking));
    });
    row.append(move);
  }
  return row;
}

function moveForm(booking) {
  const panel = el('div', '', 'agenda-row');
  const label = el('label', 'Nova data');
  const input = el('input', '', 'agenda-input');
  input.type = 'date';
  input.value = day.value;
  label.append(input);
  const optionsLabel = el('label', 'Novo horário');
  const choices = el('select', '', 'agenda-input');
  choices.disabled = true;
  optionsLabel.append(choices);
  let slots = [];
  const save = action('Salvar remarcação', async () => {
    const slot = slots[Number(choices.value)];
    if (!slot) return;
    await request('/agendamentos/' + booking.id + '/remarcar', 'POST', { inicio: slot.inicio, profissionalId: slot.profissionalId });
    await load();
    feedback.textContent = 'Reserva remarcada.';
  });
  save.disabled = true;
  input.addEventListener('change', () => {
    slots = [];
    save.disabled = true;
    choices.disabled = true;
    choices.replaceChildren();
  });
  panel.append(label, action('Buscar horários', async () => {
    if (!input.value) return;
    const date = input.value;
    const data = await request('/agendamentos/' + booking.id + '/horarios?' + new URLSearchParams({ data: date }));
    if (date !== input.value) return;
    slots = data.horarios;
    choices.replaceChildren(...slots.map((slot, i) =>
      new Option(dateTime.format(new Date(slot.inicio)) + ' · ' + slot.profissional, String(i))));
    choices.disabled = !slots.length;
    save.disabled = !slots.length;
    feedback.textContent = slots.length ? 'Selecione o novo horário.' : 'Sem horários para essa data.';
  }), optionsLabel, save);
  return panel;
}

function catalogFields() {
  const service = services.find(s => s.id === catalog.value);
  if (!service) return;
  get('duration').value = service.duration_min;
  get('price').value = service.price_cents === null ? '' : service.price_cents / 100;
}
async function enter() {
  const data = await api('/servicos');
  day.min = '2000-01-01';
  day.value ||= data.today;
  await load();
  services = data.servicos;
  catalog.replaceChildren(...services.map(s => new Option(s.name, s.id)));
  catalogFields();
  authenticated = true;
  get('login').hidden = true;
  get('workspace').hidden = false;
  feedback.textContent = '';
}
function submit(id, handler) {
  get(id).addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.submitter;
    if (button) button.disabled = true;
    try { await handler(); }
    catch (error) { report(error); }
    finally { if (button) button.disabled = false; }
  });
}

submit('login-form', async () => {
  key = get('key').value.trim();
  get('key').value = '';
  try { await enter(); } catch (error) { key = ''; throw error; }
});
submit('filter', async () => { await load(); feedback.textContent = ''; });
get('logout').addEventListener('click', () => {
  key = '';
  authenticated = false;
  requestNumber++;
  get('workspace').hidden = true;
  get('bookings').replaceChildren();
  get('blocks').replaceChildren();
  get('login').hidden = false;
  get('key').focus();
  feedback.textContent = 'Painel encerrado neste navegador.';
});
submit('block', async () => {
  const iso = value => new Date(value + ':00-03:00').toISOString();
  await request('/bloqueios', 'POST', {
    inicio: iso(get('block-start').value), fim: iso(get('block-end').value),
    profissionalId: get('block-person').value || null,
  });
  await load();
  feedback.textContent = 'Bloqueio criado.';
});
catalog.addEventListener('change', catalogFields);
submit('catalog-form', async () => {
  const price = get('price').value;
  await request('/servicos/' + catalog.value, 'PUT', {
    duracaoMin: Number(get('duration').value), precoCentavos: price === '' ? null : Math.round(Number(price) * 100),
  });
  const data = await api('/servicos');
  services = data.servicos;
  catalogFields();
  feedback.textContent = 'Serviço atualizado.';
});
enter().catch(error => { if (error.status !== 401 && !authenticated) report(error); });
