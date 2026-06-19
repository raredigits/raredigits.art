import { describe, it, expect } from 'vitest';
import * as d3 from 'd3';
import { applySvgA11y } from '../assets/charts/src/core/renderHelpers.js';

function makeSvg() {
  return d3.create('svg');
}

describe('applySvgA11y', () => {
  it('sets role="img" and a label from title + subtitle', () => {
    const svg = makeSvg();
    applySvgA11y(svg, { title: 'Revenue', subtitle: 'USD, 12 months' });
    expect(svg.attr('role')).toBe('img');
    expect(svg.attr('aria-label')).toBe('Revenue — USD, 12 months');
  });

  it('uses the title alone when there is no subtitle', () => {
    const svg = makeSvg();
    applySvgA11y(svg, { title: 'Revenue' });
    expect(svg.attr('aria-label')).toBe('Revenue');
  });

  it('an explicit ariaLabel overrides title/subtitle', () => {
    const svg = makeSvg();
    applySvgA11y(svg, { ariaLabel: 'Quarterly revenue chart', title: 'Revenue' });
    expect(svg.attr('aria-label')).toBe('Quarterly revenue chart');
  });

  it('falls back to "Chart" when there is no string slot', () => {
    const svg = makeSvg();
    applySvgA11y(svg, {});
    expect(svg.attr('aria-label')).toBe('Chart');
  });

  it('ignores non-string (HTMLElement) title/subtitle slots', () => {
    const svg = makeSvg();
    const el = document.createElement('div');
    applySvgA11y(svg, { title: el, subtitle: el });
    expect(svg.attr('aria-label')).toBe('Chart');
  });

  it('is a no-op when given no selection', () => {
    expect(() => applySvgA11y(null, { title: 'x' })).not.toThrow();
  });
});
