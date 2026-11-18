(() => {
  'use strict';
  document.getElementById('ano').textContent = new Date().getFullYear();

  const header = document.querySelector('.header-inner');
  const toggle = header.querySelector('.menu-toggle');
  const menu = document.getElementById('menu');
  const mobile = window.matchMedia('(max-width: 700px)');
  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

  function setOpen(open) {
    toggle.setAttribute('aria-expanded', String(open));
    menu.hidden = mobile.matches && !open;
  }

  function syncMenu() {
    toggle.hidden = !mobile.matches;
    if (mobile.matches && menu.contains(document.activeElement)) toggle.focus();
    setOpen(false);
  }

  toggle.addEventListener('click', () => setOpen(!isOpen()));

  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', event => {
      if (!isOpen() || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const section = document.querySelector(link.hash);
      section.setAttribute('tabindex', '-1');
      section.focus({ preventScroll: true });
      setOpen(false);
    });
  });

  document.addEventListener('click', event => {
    if (isOpen() && !menu.contains(event.target) && !toggle.contains(event.target)) {
      setOpen(false);
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && isOpen()) {
      setOpen(false);
      toggle.focus();
    }
  });

  header.addEventListener('focusout', event => {
    if (isOpen() && event.relatedTarget && !header.contains(event.relatedTarget)) setOpen(false);
  });

  mobile.addEventListener('change', syncMenu);
  syncMenu();
  header.dataset.menuReady = '';
})();

(() => {
  const previews = [...document.querySelectorAll('.look-preview')];
  const dialog = document.getElementById('look-dialog');
  let current = 0;

  function showLook(index) {
    current = (index + previews.length) % previews.length;
    const preview = previews[current];
    const card = preview.closest('figure');
    const photo = document.getElementById('look-photo');
    photo.src = preview.href;
    photo.alt = preview.querySelector('img').alt;
    document.getElementById('look-title').textContent = card.querySelector('h3').textContent;
    document.getElementById('look-caption').textContent = card.querySelector('p').textContent;
    document.getElementById('look-book').href = card.querySelector('.text-link').href;
  }

  if (typeof dialog.showModal === 'function') {
    previews.forEach((preview, index) => preview.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      showLook(index);
      dialog.showModal();
    }));
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
    dialog.querySelector('[data-prev]').addEventListener('click', () => showLook(current - 1));
    dialog.querySelector('[data-next]').addEventListener('click', () => showLook(current + 1));
    dialog.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') showLook(current - 1);
      if (event.key === 'ArrowRight') showLook(current + 1);
    });
  }

  const mobileBook = document.querySelector('.mobile-book');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      mobileBook.hidden = entry.isIntersecting || entry.boundingClientRect.bottom > 74;
    }, { rootMargin: '-74px 0px 0px' });
    observer.observe(document.querySelector('.hero .btn'));
  }
})();

(() => {
  function element(tag, text) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    return node;
  }
  function photo(src, alt) {
    const image = element('img');
    image.src = src;
    image.alt = alt;
    image.loading = 'lazy';
    return image;
  }
  function link(label, url) {
    const anchor = element('a', label);
    anchor.className = 'text-link';
    anchor.href = url;
    return anchor;
  }
  function display(id, entries, build) {
    const section = document.getElementById(id);
    for (const entry of entries) section.querySelector('.extra-grid').append(build(entry));
    section.hidden = entries.length === 0;
  }
  display('comparacoes', studioContent.comparacoes, item => {
    const card = element('article');
    const frame = element('div');
    frame.className = 'comparison';
    frame.append(photo(item.depois, item.descricaoDepois), photo(item.antes, item.descricaoAntes));
    const range = element('input');
    range.type = 'range';
    range.value = '50';
    range.setAttribute('aria-label', 'Comparar antes e depois de ' + item.nome);
    range.addEventListener('input', () => frame.style.setProperty('--split', range.value + '%'));
    card.append(element('h3', item.nome), frame, element('p', 'Antes / Depois'), range,
      link('Quero esse resultado', 'agendamento.html?' + new URLSearchParams({servico: item.servico, comparacao: item.nome})));
    return card;
  });
  display('equipe', studioContent.equipe, item => {
    const card = element('article');
    card.append(photo(item.foto, item.nome), element('h3', item.nome), element('p', item.especialidade),
      link('Ver trabalhos de ' + item.nome, item.portfolio),
      link('Solicitar atendimento com ' + item.nome, 'agendamento.html?profissional=' + encodeURIComponent(item.id)));
    return card;
  });
  display('avaliacoes', studioContent.avaliacoes, item => {
    const review = element('figure');
    review.append(element('blockquote', item.texto), element('figcaption', item.nome), link('Ver avaliação no Google', item.fonte));
    return review;
  });
})();
