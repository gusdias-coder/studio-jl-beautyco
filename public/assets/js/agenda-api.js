const messages = {
  dados_invalidos: 'Revise os dados selecionados.',
  horario_indisponivel: 'O horário escolhido ficou indisponível. Selecione outro.',
  limite_de_reservas: 'Você atingiu o limite da demonstração. Cancele uma reserva futura ou tente mais tarde.',
  verificacao_falhou: 'Refaça a verificação e tente novamente.',
  nao_autorizado: 'Acesso não autorizado. Confira sua chave ou sessão.',
  reserva_nao_encontrada: 'A reserva não foi encontrada ou o link está incompleto.',
  cancelamento_indisponivel: 'O cancelamento online está disponível até 12 horas antes do horário.',
};

export async function api(path, { method = 'GET', data, headers = {}, signal } = {}) {
  const response = await fetch('/api' + path, {
    method, signal, cache: 'no-store',
    headers: data === undefined ? headers : { ...headers, 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(messages[result.erro] || 'Ocorreu um erro. Tente novamente.'), { status: response.status });
  return result;
}

export const get = id => document.getElementById(id);
export const clock = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
export const dateTime = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'full', timeStyle: 'short' });
export const money = cents => cents === null ? 'Sob consulta'
  : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

export function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}
