import { api, get, el, dateTime, money } from './agenda-api.js';

const params = new URLSearchParams(location.hash.slice(1));
const id = params.get('id') || '';
const headers = { 'X-Manage-Token': params.get('token') || '' };
const feedback = get('feedback');
const cancel = get('cancel');
const detail = get('detail');

async function show() {
  if (!/^[a-f0-9-]{36}$/.test(id) || !/^[a-f0-9]{64}$/.test(headers['X-Manage-Token'])) {
    feedback.textContent = 'Abra o link completo exibido na confirmação da reserva.';
    return;
  }
  try {
    const { reserva, cancelavel } = await api('/agendamentos/' + id, { headers });
    detail.replaceChildren(el('h2', reserva.status === 'confirmed' ? 'Reserva confirmada' : 'Reserva cancelada'),
      el('p', reserva.servico + ' · ' + reserva.profissional),
      el('p', dateTime.format(new Date(reserva.starts_at))),
      el('p', reserva.duration_min + ' min · ' + money(reserva.price_cents)));
    cancel.hidden = !cancelavel;
    if (!cancelavel && reserva.status === 'confirmed') detail.append(el('p', 'O prazo para cancelamento online já passou.'));
  } catch (error) { feedback.textContent = error.message; }
}

cancel.addEventListener('click', async () => {
  if (!window.confirm('Cancelar esta reserva de teste?')) return;
  cancel.disabled = true;
  try {
    await api('/agendamentos/' + id + '/cancelar', { method: 'POST', headers });
    feedback.textContent = 'Reserva cancelada. O horário foi liberado.';
    await show();
  } catch (error) { feedback.textContent = error.message; }
  finally { cancel.disabled = false; }
});
show();
