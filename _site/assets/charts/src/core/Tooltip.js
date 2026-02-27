// RareCharts — Tooltip
// Универсальный тултип для всех типов графиков.

export class Tooltip {
  constructor(container, theme) {
    this.theme = theme;
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position:      'absolute',
      pointerEvents: 'none',
      background:    '#ffffff',
      border:        '1px solid #3a3a3a',
      padding:       '8px 16px',
      fontFamily:    theme.font,
      fontSize:      '14px',
      color:         theme.text,
      opacity:       '0',
      transition:    'opacity 0.1s',
      whiteSpace:    'nowrap',
      zIndex:        '100',
    });
    container.style.position = 'relative';
    container.appendChild(this.el);
  }

  show(x, y, html) {
    this.el.innerHTML = html;
    // Не выходим за правый край контейнера
    const maxX = this.el.parentElement.clientWidth - this.el.offsetWidth - 12;
    this.el.style.left    = `${Math.min(x + 12, maxX)}px`;
    this.el.style.top     = `${Math.max(y - 20, 8)}px`;
    this.el.style.opacity = '1';
  }

  hide() {
    this.el.style.opacity = '0';
  }

  destroy() {
    this.el.remove();
  }
}
