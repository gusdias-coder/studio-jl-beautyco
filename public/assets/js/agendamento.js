import { api, get, el, clock, dateTime, money } from './agenda-api.js';

const panels = [...document.querySelectorAll('[data-panel]')];
const steps = [...document.querySelectorAll('[data-step]')];
const refs = { avela: 'Avelã', loiro: 'Loiro', cherry: 'Cherry brown', mel: 'Mel e caramelo' };
const query = new URLSearchParams(location.search);
const reference = refs[query.get('ref')];
const feedback = get('feedback');
const day = get('day');
let services = [];
let service;
let slot;
let slots = [];
let step = 0;
let unlocked = 0;
let sending = false;
let challengeId;
let readyChallenge;
let availabilityRequest;
let demoCode = crypto.randomUUID();
try {
  demoCode = localStorage.getItem('studio-jl-demo-id') || demoCode;
  localStorage.setItem('studio-jl-demo-id', demoCode);
} catch { /* Storage can be disabled. The current page retains its demo code. */ }

function details(node) {
  node.replaceChildren(el('p', service ? service.name : 'Escolha um serviço para começar.'));
  if (service) node.append(el('p', service.duration_min + ' min · ' + money(service.price_cents)));
  if (slot) node.append(el('p', slot.profissional), el('p', dateTime.format(new Date(slot.inicio))));
}

function go(next) {
  if (sending) return;
  if (next !== 2) availabilityRequest?.abort();
  step = next;
  unlocked = Math.max(unlocked, next);
  panels.forEach((panel, i) => { panel.hidden = i !== next; });
  steps.forEach((button, i) => {
    button.disabled = i > unlocked || next === 4;
    if (i === next) button.parentElement.setAttribute('aria-current', 'step');
    else button.parentElement.removeAttribute('aria-current');
  });
  feedback.textContent = '';
  panels[next].querySelector('h2').focus();
}

function choose(item) {
  if (item !== service) {
    service = item;
    slot = null;
    slots = [];
    unlocked = 1;
    get('slots').replaceChildren();
    get('review').disabled = true;
    get('professional').replaceChildren(new Option('Qualquer profissional', ''),
      ...item.profissionais.map(p => new Option(p.name, p.id)));
  }
  get('choose-date').disabled = false;
  for (const button of get('services').children) button.setAttribute('aria-pressed', String(button.dataset.id === item.id));
  details(get('summary'));
}

async function init() {
  get('retry').hidden = true;
  feedback.textContent = 'Carregando serviços…';
  try {
    const result = await api('/servicos');
    services = result.servicos;
    day.min = result.today;
    day.max = result.last;
    day.value = result.today;
    get('services').replaceChildren(...services.map(item => {
      const button = el('button', '', 'service-option');
      const label = el('span', '', 'service-option-copy');
      label.append(el('strong', item.name), el('small', item.duration_min + ' min'));
      button.type = 'button';
      button.dataset.id = item.id;
      button.setAttribute('aria-pressed', 'false');
      button.append(label, el('span', money(item.price_cents), 'service-option-side'));
      button.addEventListener('click', () => choose(item));
      return button;
    }));
    const initial = services.find(item => item.id === query.get('servico'));
    if (initial) choose(initial);
    if (initial && reference) {
      get('look').hidden = false;
      get('look').textContent = 'Referência da galeria · ' + reference;
    }
    details(get('summary'));
    if (result.turnstile) readyChallenge = loadChallenge(result.turnstile);
    feedback.textContent = '';
  } catch {
    feedback.textContent = 'Não foi possível carregar os serviços.';
    get('retry').hidden = false;
  }
}

function loadChallenge(sitekey) {
  return new Promise(resolve => {
    const script = el('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.onload = () => window.turnstile.ready(() => {
      challengeId = window.turnstile.render('#challenge', { sitekey, action: 'reserva_demo' });
      resolve(true);
    });
    script.onerror = () => resolve(false);
    document.head.append(script);
  });
}

async function loadSlots() {
  availabilityRequest?.abort();
  const controller = new AbortController();
  availabilityRequest = controller;
  slot = null;
  slots = [];
  get('slots').replaceChildren();
  get('review').disabled = true;
  details(get('summary'));
  go(2);
  feedback.textContent = 'Consultando horários…';
  const params = new URLSearchParams({ data: day.value, servico: service.id, profissional: get('professional').value });
  get('date-label').textContent = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', dateStyle: 'full' }).format(new Date(day.value));
  try {
    ({ horarios: slots } = await api('/disponibilidade?' + params, { signal: controller.signal }));
    feedback.textContent = slots.length ? '' : 'Não há horários livres nesse dia. Experimente outra data ou profissional.';
    get('slots').replaceChildren(...slots.map(item => {
      const button = el('button', '', 'agenda-slot');
      button.type = 'button';
      button.append(el('strong', clock.format(new Date(item.inicio))), el('span', item.profissional));
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => {
        slot = item;
        for (const option of get('slots').children) option.setAttribute('aria-pressed', String(option === button));
        get('review').disabled = false;
        details(get('summary'));
      });
      return button;
    }));
  } catch (error) {
    if (error.name !== 'AbortError') feedback.textContent = 'Não foi possível consultar os horários. Volte e tente de novo.';
  }
}

function showReview() {
  if (!slot) return;
  details(get('review-details'));
  go(3);
}

function changeStep(next) {
  if (next === 2 && !slots.length) return loadSlots();
  if (next === 3) return showReview();
  if (next <= unlocked) go(next);
}

for (const button of steps) button.addEventListener('click', () => changeStep(Number(button.dataset.step)));
for (const button of document.querySelectorAll('[data-back]')) button.addEventListener('click', () => changeStep(Number(button.dataset.back)));
get('retry').addEventListener('click', init);
get('choose-date').addEventListener('click', () => go(1));
get('review').addEventListener('click', showReview);
get('date-form').addEventListener('submit', event => { event.preventDefault(); void loadSlots(); });
for (const field of [day, get('professional')]) field.addEventListener('change', () => {
  slot = null;
  slots = [];
  unlocked = 1;
  for (const button of steps.slice(2)) button.disabled = true;
  details(get('summary'));
});
get('reserve').addEventListener('submit', async event => {
  event.preventDefault();
  if (!slot || sending || step !== 3) return;
  sending = true;
  get('confirm').disabled = true;
  feedback.textContent = 'Confirmando reserva…';
  try {
    const enabled = readyChallenge ? await readyChallenge : false;
    if (readyChallenge && !enabled) throw new Error('Não foi possível carregar a verificação. Recarregue a página.');
    const turnstile = enabled ? window.turnstile.getResponse(challengeId) : undefined;
    if (enabled && !turnstile) throw new Error('Conclua a verificação para reservar.');
    const result = await api('/agendamentos', { method: 'POST', data: {
      servicoId: service.id, profissionalId: slot.profissionalId, inicio: slot.inicio, codigoDemo: demoCode, turnstile,
    } });
    const link = '/minha-reserva.html#' + new URLSearchParams({ id: result.id, token: result.token });
    get('manage').href = link;
    details(get('confirmed-details'));
    sending = false;
    go(4);
  } catch (error) {
    sending = false;
    if (error.status === 409) await loadSlots();
    feedback.textContent = error.message || 'Não foi possível confirmar.';
    if (challengeId !== undefined) window.turnstile.reset(challengeId);
  } finally {
    sending = false;
    get('confirm').disabled = false;
  }
});
init();
