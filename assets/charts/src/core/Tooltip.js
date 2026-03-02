// RareCharts — Tooltip
// Универсальный тултип для всех типов графиков.
// Цвета берутся из theme.tooltip, не хардкодятся.

export class Tooltip {
  constructor(container, theme) {
    this._container = container;
    this.theme = theme;

    const tt = theme.tooltip ?? {};

    this.el = document.createElement('div');
    this.el.className = 'rc-tooltip';

    Object.assign(this.el.style, {
      fontFamily: theme.numericFont ?? theme.font,
      fontSize:   '13px',
      color:      tt.text  ?? theme.text,
      background: tt.bg    ?? '#fff',
      border:     `1px solid ${tt.border ?? theme.border}`,
      boxShadow:  tt.shadow ?? 'none',
    });

    container.appendChild(this.el);
  }

  show(x, y, html) {
    this.el.innerHTML = html;
    this.el.classList.add('is-visible');

    // Не выходим за правый и нижний края контейнера
    const maxX = this._container.clientWidth  - this.el.offsetWidth  - 12;
    const maxY = this._container.clientHeight - this.el.offsetHeight - 8;

    this.el.style.left = `${Math.min(x + 12, maxX)}px`;
    this.el.style.top  = `${Math.min(Math.max(y - 20, 8), maxY)}px`;
  }

  hide() {
    this.el.classList.remove('is-visible');
  }

  destroy() {
    this.el.remove();
  }
}
