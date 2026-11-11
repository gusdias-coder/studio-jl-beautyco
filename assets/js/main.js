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
