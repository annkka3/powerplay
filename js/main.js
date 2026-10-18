'use strict';
/* Start-up: the parent screen is reached from "Я", every other screen through the bottom bar. */
const _render = render;
render = function () {
  if (UI.tab === 'parent') {
    const app = $('#app');
    app.replaceChildren(el('main', { class: 'main wrap' }, screenParent()));
    return;
  }
  _render();
};
grLoad();
render();
if (S.cfg.fk) scLoad();
// streak and achievements can change overnight; refresh when the app comes back
document.addEventListener('visibilitychange', () => { if (!document.hidden && !OV) render(); });
