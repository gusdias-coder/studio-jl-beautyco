(() => {
  'use strict';
  document.getElementById('ano').textContent = new Date().getFullYear();
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.getElementById('menu');
  const mobile = window.matchMedia('(max-width: 700px)');
  function setOpen(open) {
    toggle.setAttribute('aria-expanded', String(open));
    menu.hidden = mobile.matches && !open;
  }
  function syncMenu() { toggle.hidden = !mobile.matches; setOpen(false); }
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && mobile.matches && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false); toggle.focus();
    }
  });
  mobile.addEventListener('change', syncMenu);
  syncMenu();
})();
