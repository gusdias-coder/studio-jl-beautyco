/* Os horários são preferências; sem banco de dados, a equipe confirma pelo WhatsApp. */
const DEFAULT_SERVICES = [
  { id: 'coloracao', nome: 'Coloração', preco: null, tipoPreco: 'sobConsulta', duracaoMin: null },
  { id: 'mechas-loiros', nome: 'Mechas e loiros', preco: null, tipoPreco: 'sobConsulta', duracaoMin: null },
  { id: 'morena-iluminada', nome: 'Morena iluminada', preco: null, tipoPreco: 'sobConsulta', duracaoMin: null },
  { id: 'corte', nome: 'Corte', preco: null, tipoPreco: 'sobConsulta', duracaoMin: null },
  { id: 'tratamento', nome: 'Tratamento capilar', preco: null, tipoPreco: 'sobConsulta', duracaoMin: null },
  { id: 'retoque-raiz', nome: 'Retoque de raiz', preco: null, tipoPreco: 'sobConsulta', duracaoMin: null },
  { id: 'mega-hair', nome: 'Mega Hair', preco: null, tipoPreco: 'sobConsulta', duracaoMin: null },
  { id: 'penteado', nome: 'Penteado', preco: null, tipoPreco: 'sobConsulta', duracaoMin: null },
  { id: 'maquiagem', nome: 'Maquiagem', preco: null, tipoPreco: 'sobConsulta', duracaoMin: null },
];
const CONFIG = {
  empresa: 'Studio JL Beauty&Co.',
  whatsapp: '5562998634371',
  fusoHorario: 'America/Sao_Paulo',
  intervaloSlotMin: 30,
  antecedenciaMinHoras: 2,
  janelaMaxDias: 60,
  funcionamento: {
    0: null,
    1: null, // Segunda: agendamentos pelo WhatsApp, sem atendimento no calendário.
    2: [{ inicio: '09:00', fim: '18:00' }],
    3: [{ inicio: '09:00', fim: '18:00' }],
    4: [{ inicio: '09:00', fim: '18:00' }],
    5: [{ inicio: '09:00', fim: '18:00' }],
    6: [{ inicio: '09:00', fim: '18:00' }],
  },
  diasBloqueados: [],
  horariosBloqueados: {},
  // Atualize preços e durações quando o salão confirmar os dados.
  servicos: DEFAULT_SERVICES,
};

(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const panels = [...document.querySelectorAll('[data-step]')];
  const indicators = [...document.querySelectorAll('[data-step-indicator]')];
  const serviceList = $('service-list');
  const calendarDays = $('calendar-days');
  const slotsContainer = $('time-slots');
  const feedback = $('booking-feedback');
  const nameInput = $('client-name');
  const phoneInput = $('client-phone');
  const noteInput = $('client-note');
  const sendLink = $('send-whatsapp');
  const copyButton = $('copy-message');
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const storageKey = 'studio-jl-booking-v2';
  const state = { step: 0, selected: new Set(), date: null, time: null };
  const hasService = () => state.selected.size > 0;
  const hasDuration = () => hasService() && selectedServices().every(service => Number.isFinite(service.duracaoMin) && service.duracaoMin > 0);

  const zonedNow = () => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: CONFIG.fusoHorario, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date());
    const data = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return {
      date: `${data.year}-${data.month}-${data.day}`,
      minutes: Number(data.hour) * 60 + Number(data.minute),
    };
  };
  const dateParts = key => key.split('-').map(Number);
  const ordinal = key => {
    const [year, month, day] = dateParts(key);
    return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
  };
  const dateKey = (year, month, day) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dateFromOrdinal = number => new Date(number * 86400000).toISOString().slice(0, 10);
  const weekday = key => {
    const [year, month, day] = dateParts(key);
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  };
  const dateObject = key => {
    const [year, month, day] = dateParts(key);
    return new Date(Date.UTC(year, month - 1, day, 12));
  };
  const prettyDate = key => new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(dateObject(key));
  const monthTitle = (year, month) => {
    const title = new Intl.DateTimeFormat('pt-BR', {
      month: 'long', year: 'numeric', timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, 1, 12)));
    return title.charAt(0).toUpperCase() + title.slice(1);
  };
  const toMinutes = time => {
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
  };
  const toTime = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  const durationText = minutes => {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return [hours ? `${hours}h` : '', rest ? `${rest}min` : ''].filter(Boolean).join('') || '0min';
  };
  const selectedServices = () => CONFIG.servicos.filter(service => state.selected.has(service.id));
  const totalDuration = () => selectedServices().reduce((total, service) => total + (service.duracaoMin || 0), 0);
  const servicePrice = service => service.preco == null
    ? 'Sob consulta'
    : service.tipoPreco === 'aPartirDe'
      ? `A partir de ${currency.format(service.preco)}`
      : currency.format(service.preco);
  const totalPrice = () => {
    const services = selectedServices();
    const priced = services.filter(service => service.preco != null);
    if (!priced.length) return '';
    const total = priced.reduce((sum, service) => sum + service.preco, 0);
    const prefix = services.some(service => service.tipoPreco === 'aPartirDe') ? 'A partir de ' : '';
    const suffix = services.some(service => service.preco == null) ? ' + itens sob consulta' : '';
    return `${prefix}${currency.format(total)}${suffix}`;
  };
  const isSelectableDay = key => {
    if (!key) return false;
    const today = zonedNow().date;
    const distance = ordinal(key) - ordinal(today);
    return distance >= 0 && distance <= CONFIG.janelaMaxDias
      && Array.isArray(CONFIG.funcionamento[weekday(key)])
      && CONFIG.funcionamento[weekday(key)].length > 0
      && !CONFIG.diasBloqueados.includes(key);
  };
  const availableSlots = key => {
    if (!key || !isSelectableDay(key) || !hasService()) return [];
    const now = zonedNow();
    const distance = ordinal(key) - ordinal(now.date);
    const minNotice = CONFIG.antecedenciaMinHoras * 60;
    const blocked = (CONFIG.horariosBloqueados[key] || []).map(toMinutes);
    const slots = [];
    for (const period of CONFIG.funcionamento[weekday(key)]) {
      const start = toMinutes(period.inicio);
      const end = toMinutes(period.fim);
      // Sem duração confirmada, cada início é apenas uma preferência, nunca uma vaga garantida.
      const requiredMinutes = hasDuration() ? totalDuration() : CONFIG.intervaloSlotMin;
      for (let minute = start; minute + requiredMinutes <= end; minute += CONFIG.intervaloSlotMin) {
        if (distance * 1440 + minute - now.minutes < minNotice) continue;
        if (blocked.some(block => minute < block + CONFIG.intervaloSlotMin && minute + requiredMinutes > block)) continue;
        slots.push(toTime(minute));
      }
    }
    return [...new Set(slots)];
  };
  const setFeedback = message => { feedback.textContent = message; };
  const monthState = (() => {
    const [year, month] = dateParts(zonedNow().date);
    return { year, month };
  })();

  const maxUnlockedStep = () => !hasService() ? 0
    : !isSelectableDay(state.date) ? 1
      : !availableSlots(state.date).includes(state.time) ? 2 : 3;

  function saveDraft() {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({
        step: state.step,
        selected: [...state.selected],
        date: state.date,
        time: state.time,
        name: nameInput.value,
        phone: phoneInput.value,
        note: noteInput.value,
      }));
    } catch { /* O formulário continua funcional se o navegador bloquear o armazenamento. */ }
  }

  function restoreDraft() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
      if (!saved || typeof saved !== 'object') return;
      const validIds = new Set(CONFIG.servicos.map(service => service.id));
      state.selected = new Set(Array.isArray(saved.selected) ? saved.selected.filter(id => validIds.has(id)) : []);
      state.date = typeof saved.date === 'string' && isSelectableDay(saved.date) ? saved.date : null;
      state.time = typeof saved.time === 'string' && availableSlots(state.date).includes(saved.time) ? saved.time : null;
      if (state.date) [monthState.year, monthState.month] = dateParts(state.date);
      nameInput.value = typeof saved.name === 'string' ? saved.name.slice(0, 80) : '';
      phoneInput.value = typeof saved.phone === 'string' ? formatPhone(saved.phone) : '';
      noteInput.value = typeof saved.note === 'string' ? saved.note.slice(0, 300) : '';
      state.step = Number.isInteger(saved.step) ? Math.max(0, Math.min(saved.step, maxUnlockedStep())) : 0;
    } catch { /* Um rascunho inválido não impede uma nova solicitação. */ }
  }

  function renderServices() {
    serviceList.replaceChildren();
    for (const service of CONFIG.servicos) {
      const label = document.createElement('label');
      label.className = 'service-option';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = service.id;
      input.checked = state.selected.has(service.id);
      const copy = document.createElement('span');
      copy.className = 'service-option-copy';
      const title = document.createElement('strong');
      title.textContent = service.nome;
      copy.append(title);
      if (Number.isFinite(service.duracaoMin) && service.duracaoMin > 0) {
        const duration = document.createElement('small');
        duration.textContent = `Duração estimada: ${durationText(service.duracaoMin)}`;
        copy.append(duration);
      }
      const side = document.createElement('span');
      side.className = 'service-option-side';
      const price = document.createElement('span');
      price.textContent = servicePrice(service);
      const check = document.createElement('span');
      check.className = 'service-check';
      check.setAttribute('aria-hidden', 'true');
      side.append(price, check);
      label.append(input, copy, side);
      serviceList.append(label);
    }
  }

  function renderCalendar() {
    const { year, month } = monthState;
    $('calendar-month').textContent = monthTitle(year, month);
    calendarDays.replaceChildren();
    const firstDayOffset = (weekday(dateKey(year, month, 1)) + 6) % 7;
    for (let index = 0; index < firstDayOffset; index++) {
      const blank = document.createElement('span');
      blank.className = 'calendar-blank';
      calendarDays.append(blank);
    }
    const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
    for (let day = 1; day <= count; day++) {
      const key = dateKey(year, month, day);
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.date = key;
      button.textContent = String(day);
      button.setAttribute('aria-label', prettyDate(key));
      button.setAttribute('aria-pressed', String(state.date === key));
      button.disabled = !isSelectableDay(key);
      calendarDays.append(button);
    }
    const now = zonedNow().date;
    const firstCurrentMonth = ordinal(dateKey(...dateParts(now).slice(0, 2), 1));
    const lastMonth = dateFromOrdinal(ordinal(now) + CONFIG.janelaMaxDias).slice(0, 7);
    $('previous-month').disabled = ordinal(dateKey(year, month, 1)) <= firstCurrentMonth;
    $('next-month').disabled = `${year}-${String(month).padStart(2, '0')}` >= lastMonth;
  }

  function renderSlots() {
    slotsContainer.replaceChildren();
    $('selected-day-label').textContent = state.date
      ? `Data escolhida: ${prettyDate(state.date)}. ${hasDuration() ? 'Horários sugeridos conforme a duração estimada.' : 'Escolha um horário de preferência; a equipe confirma a disponibilidade e a duração.'}`
      : '';
    const slots = availableSlots(state.date);
    $('no-slots').hidden = slots.length > 0;
    for (const time of slots) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.time = time;
      button.textContent = time;
      button.setAttribute('aria-pressed', String(state.time === time));
      slotsContainer.append(button);
    }
    if (state.time && !slots.includes(state.time)) state.time = null;
  }

  function renderSummary() {
    const services = selectedServices();
    const summary = $('summary-services');
    summary.replaceChildren();
    if (services.length) {
      const list = document.createElement('ul');
      for (const service of services) {
        const item = document.createElement('li');
        const name = document.createElement('span');
        name.textContent = service.nome;
        const price = document.createElement('span');
        price.textContent = servicePrice(service);
        item.append(name, price);
        list.append(item);
      }
      summary.append(list);
    } else {
      const empty = document.createElement('p');
      empty.textContent = 'Escolha seus serviços para começar.';
      summary.append(empty);
    }
    $('summary-date').textContent = state.date ? prettyDate(state.date) : 'A escolher';
    $('summary-time').textContent = state.time || 'A escolher';
    $('summary-duration').textContent = hasDuration() ? durationText(totalDuration()) : 'A confirmar';
    $('summary-price-row').hidden = !totalPrice();
    $('summary-price').textContent = totalPrice();
    $('mobile-summary-text').textContent = services.length
      ? `${services.length} ${services.length === 1 ? 'serviço' : 'serviços'}${hasDuration() ? ` · ${durationText(totalDuration())}` : ''}`
      : 'Escolha os serviços';
    $('mobile-summary-value').textContent = totalPrice();
  }

  function renderReview() {
    const review = $('final-review');
    review.replaceChildren();
    const heading = document.createElement('strong');
    heading.textContent = 'Sua escolha';
    review.append(heading);
    const rows = [
      selectedServices().map(service => service.nome).join(' · '),
      state.date ? prettyDate(state.date) : '',
      state.time ? `${state.time}${hasDuration() ? ` · duração estimada de ${durationText(totalDuration())}` : ' · horário de preferência'}` : '',
      totalPrice() ? `Valor: ${totalPrice()}` : 'Valor e duração a confirmar',
    ];
    for (const text of rows.filter(Boolean)) {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      review.append(paragraph);
    }
  }

  const digits = value => value.replace(/\D/g, '');
  const validName = () => nameInput.value.trim().length >= 2;
  const validPhone = () => digits(phoneInput.value).length === 11;
  function formatPhone(value) {
    const rawDigits = digits(value);
    const valueDigits = (rawDigits.length === 13 && rawDigits.startsWith('55') ? rawDigits.slice(2) : rawDigits).slice(0, 11);
    if (valueDigits.length <= 2) return valueDigits ? `(${valueDigits}` : '';
    if (valueDigits.length <= 7) return `(${valueDigits.slice(0, 2)}) ${valueDigits.slice(2)}`;
    return `(${valueDigits.slice(0, 2)}) ${valueDigits.slice(2, 7)}-${valueDigits.slice(7)}`;
  }

  function messageText() {
    const lines = [
      `Olá! Gostaria de solicitar um agendamento no ${CONFIG.empresa}:`,
      '',
      `👤 Nome: ${nameInput.value.trim()}`,
      `📱 Telefone: ${phoneInput.value.trim()}`,
      `📅 Data: ${prettyDate(state.date)}`,
      `🕐 Horário de preferência: ${state.time}${hasDuration() ? ` (duração estimada: ${durationText(totalDuration())})` : ''}`,
      '',
      '✂️ Serviços desejados:',
      ...selectedServices().map(service => `• ${service.nome}: ${servicePrice(service)}`),
    ];
    if (totalPrice()) lines.push('', `💰 Total indicado: ${totalPrice()}`);
    if (noteInput.value.trim()) lines.push('', `📝 Observação: ${noteInput.value.trim()}`);
    lines.push('', 'Aguardo a confirmação de disponibilidade e valores pela equipe.');
    return lines.join('\n');
  }

  function validBooking() {
    return hasService()
      && isSelectableDay(state.date) && availableSlots(state.date).includes(state.time)
      && validName() && validPhone();
  }

  function updateSendLink() {
    const valid = validBooking();
    sendLink.setAttribute('aria-disabled', String(!valid));
    if (valid) {
      sendLink.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(messageText())}`;
      sendLink.tabIndex = 0;
    } else {
      sendLink.removeAttribute('href');
      sendLink.tabIndex = -1;
    }
    copyButton.disabled = !valid;
  }

  function render() {
    renderCalendar();
    renderSlots();
    renderSummary();
    renderReview();
    updateSendLink();
    state.step = Math.min(state.step, maxUnlockedStep());
    panels.forEach((panel, index) => { panel.hidden = index !== state.step; });
    indicators.forEach((indicator, index) => {
      if (index === state.step) indicator.setAttribute('aria-current', 'step');
      else indicator.removeAttribute('aria-current');
      indicator.classList.toggle('is-complete', index < state.step);
      indicator.querySelector('button').disabled = index > maxUnlockedStep();
    });
    panels.forEach((panel, index) => {
      const button = panel.querySelector('[data-next]');
      if (button) button.disabled = index === 0 && !hasService()
        || index === 1 && !state.date
        || index === 2 && !state.time;
    });
    saveDraft();
  }

  function changeStep(next) {
    if (next < 0 || next >= panels.length) return;
    state.step = next;
    setFeedback('');
    render();
    panels[next].querySelector('h2').focus({ preventScroll: true });
    panels[next].scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start',
    });
  }

  document.querySelectorAll('[data-step-target]').forEach(button => button.addEventListener('click', () => {
    if (!button.disabled) changeStep(Number(button.dataset.stepTarget));
  }));
  serviceList.addEventListener('change', event => {
    if (!event.target.matches('input[type="checkbox"]')) return;
    if (event.target.checked) state.selected.add(event.target.value);
    else state.selected.delete(event.target.value);
    const hadTime = Boolean(state.time);
    if (state.time && !availableSlots(state.date).includes(state.time)) state.time = null;
    setFeedback(hadTime && !state.time ? 'Os serviços mudaram. Escolha outro horário.' : '');
    render();
  });
  calendarDays.addEventListener('click', event => {
    const button = event.target.closest('button[data-date]');
    if (!button || button.disabled) return;
    state.date = button.dataset.date;
    state.time = null;
    setFeedback('');
    render();
    calendarDays.querySelector(`button[data-date="${state.date}"]`).focus({ preventScroll: true });
  });
  calendarDays.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    const current = document.activeElement;
    if (!current.matches('button[data-date]')) return;
    event.preventDefault();
    const enabled = [...calendarDays.querySelectorAll('button[data-date]:not(:disabled)')];
    if (event.key === 'Home') return enabled[0]?.focus();
    if (event.key === 'End') return enabled.at(-1)?.focus();
    const movement = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
    let target = ordinal(current.dataset.date) + movement;
    for (let attempt = 0; attempt < 31; attempt++, target += movement) {
      const next = calendarDays.querySelector(`button[data-date="${dateFromOrdinal(target)}"]`);
      if (!next) break;
      if (!next.disabled) { next.focus(); break; }
    }
  });
  for (const [id, delta] of [['previous-month', -1], ['next-month', 1]]) {
    $(id).addEventListener('click', () => {
      const monthStart = new Date(Date.UTC(monthState.year, monthState.month - 1 + delta, 1));
      monthState.year = monthStart.getUTCFullYear();
      monthState.month = monthStart.getUTCMonth() + 1;
      renderCalendar();
    });
  }
  slotsContainer.addEventListener('click', event => {
    const button = event.target.closest('button[data-time]');
    if (!button) return;
    state.time = button.dataset.time;
    setFeedback('');
    render();
    slotsContainer.querySelector(`button[data-time="${state.time}"]`).focus({ preventScroll: true });
  });
  document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => {
    if (state.step === 0 && !hasService()) return setFeedback('Selecione ao menos um serviço.');
    if (state.step === 1 && !state.date) return setFeedback('Escolha uma data.');
    if (state.step === 2 && !state.time) return setFeedback('Escolha um horário.');
    changeStep(state.step + 1);
  }));
  document.querySelectorAll('[data-previous]').forEach(button => button.addEventListener('click', () => changeStep(state.step - 1)));
  phoneInput.addEventListener('input', () => {
    phoneInput.value = formatPhone(phoneInput.value);
    updateSendLink();
    saveDraft();
  });
  nameInput.addEventListener('input', () => { updateSendLink(); saveDraft(); });
  noteInput.addEventListener('input', () => { updateSendLink(); saveDraft(); });
  copyButton.addEventListener('click', async () => {
    if (!validBooking()) return;
    try {
      await navigator.clipboard.writeText(messageText());
    } catch {
      const temporary = document.createElement('textarea');
      temporary.value = messageText();
      document.body.append(temporary);
      temporary.select();
      const copied = document.execCommand('copy');
      temporary.remove();
      if (!copied) return setFeedback('Não foi possível copiar. Use o botão de WhatsApp.');
    }
    setFeedback('Mensagem copiada.');
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
  $('booking-year').textContent = new Date().getFullYear();
  if (CONFIG.servicos.length) {
    const ids = CONFIG.servicos.map(service => service.id);
    if (new Set(ids).size !== ids.length || CONFIG.servicos.some(service => service.duracaoMin != null && (!Number.isFinite(service.duracaoMin) || service.duracaoMin <= 0))) {
      throw new Error('CONFIG.servicos: IDs únicos e duração positiva quando informada são obrigatórios.');
    }
  }
  restoreDraft();
  renderServices();
  render();
})();
