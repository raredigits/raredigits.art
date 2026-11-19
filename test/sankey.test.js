import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Sankey } from '../assets/charts/src/charts/Sankey.js';
import { mount, track, tooltipOf } from './helpers.js';

const budget = {
  nodes: [
    { id: 'tax', label: 'Taxes' }, { id: 'debt', label: 'Borrowing' },
    { id: 'health', label: 'Health' }, { id: 'schools', label: 'Schools' }, { id: 'roads', label: 'Roads' },
  ],
  links: [
    { source: 'tax', target: 'health', value: 120, type: 'grant' },
    { source: 'tax', target: 'schools', value: 80 },
    { source: 'debt', target: 'roads', value: 50 },
    { source: 'debt', target: 'health', value: 30 },
  ],
};

describe('Sankey', () => {
  let host;
  beforeEach(() => {
    document.body.innerHTML = '<div id="chart"></div>';
    host = document.getElementById('chart');
  });

  it('renders one rect per node and one band per flow, with an accessible svg', () => {
    new Sankey('#chart', { title: 'Budget', orientation: 'horizontal', animate: false }).setData(budget);
    expect(host.querySelectorAll('.rc-sankey-node')).toHaveLength(5);
    expect(host.querySelectorAll('.rc-sankey-link')).toHaveLength(4);
    expect(host.querySelector('svg').getAttribute('aria-label')).toBe('Budget');
    expect(host.querySelector('.rc-sankey-link').getAttribute('aria-label')).toBe('Taxes → Health: 120');
  });

  it('derives nodes from links when none are given, and accepts from/to and flows', () => {
    new Sankey('#chart', { animate: false, orientation: 'horizontal' })
      .setData({ flows: [{ from: 'a', to: 'b', value: 2 }, { from: 'b', to: 'c', value: 1 }] });
    expect(host.querySelectorAll('.rc-sankey-node')).toHaveLength(3);
  });

  it('drops invalid values and unknown nodes with warnings; sums repeated pair+type', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    new Sankey('#chart', { animate: false, orientation: 'horizontal' }).setData({
      nodes: [{ id: 'a' }, { id: 'b' }],
      links: [
        { source: 'a', target: 'b', value: 2 },
        { source: 'a', target: 'b', value: 3 },          // summed
        { source: 'a', target: 'b', value: 0 },          // dropped
        { source: 'a', target: 'b', value: 'x' },        // dropped
        { source: 'a', target: 'zzz', value: 1 },        // unknown node
        { source: 'a', target: 'b', value: 1, type: 't' }, // separate band
      ],
    });
    expect(host.querySelectorAll('.rc-sankey-link')).toHaveLength(2);
    expect(warn).toHaveBeenCalledTimes(4);
  });

  it('throws on a cycle', () => {
    const s = new Sankey('#chart', { animate: false });
    expect(() => s.setData({ links: [
      { source: 'a', target: 'b', value: 1 }, { source: 'b', target: 'a', value: 1 },
    ] })).toThrow(/cycle/);
  });

  it("orientation 'auto' switches to vertical on a narrow container", () => {
    const narrow = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
    Object.defineProperty(host, 'clientWidth', { configurable: true, get: () => 360 });
    new Sankey('#chart', { animate: false }).setData(budget);
    // Read the drawing, not the private flag (S-04): the flow runs top to
    // bottom, so the sources share one row above every target, side by side.
    const rect = name => host.querySelector(`rect.rc-sankey-node[aria-label^="${name}:"]`);
    const y = name => +rect(name).getAttribute('y');
    const x = name => +rect(name).getAttribute('x');
    expect(y('Taxes')).toBe(y('Borrowing'));
    expect(x('Taxes')).not.toBe(x('Borrowing'));
    ['Health', 'Schools', 'Roads'].forEach(t => expect(y(t)).toBeGreaterThan(y('Taxes')));
    // two columns × rowHeight 140 → the container grows to fit
    expect(parseFloat(host.style.height)).toBeGreaterThanOrEqual(280);
    Object.defineProperty(host, 'clientWidth', narrow);
  });

  it('click on a band pins its tooltip with the share of the source', () => {
    new Sankey('#chart', { animate: false, orientation: 'horizontal' }).setData(budget);
    const band = [...host.querySelectorAll('.rc-sankey-link')]
      .find(p => p.getAttribute('aria-label') === 'Taxes → Schools: 80');
    band.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const tt = host.querySelector('.rc-tooltip');
    expect(tt.classList.contains('is-pinned')).toBe(true);
    expect(tt.textContent).toContain('40% of Taxes');
  });

  it('gradient ids are unique per instance', () => {
    document.body.innerHTML = '<div id="a"></div><div id="b"></div>';
    new Sankey('#a', { animate: false, orientation: 'horizontal', linkColor: 'gradient' }).setData(budget);
    new Sankey('#b', { animate: false, orientation: 'horizontal', linkColor: 'gradient' }).setData(budget);
    const ga = document.querySelector('#a linearGradient').id;
    const gb = document.querySelector('#b linearGradient').id;
    expect(ga).not.toBe(gb);
  });

  it('renders a screen-reader table of flows, and none when disabled', () => {
    new Sankey('#chart', { animate: false, orientation: 'horizontal' }).setData(budget);
    expect(host.querySelectorAll('.rc-sankey-table tbody tr')).toHaveLength(4);
    document.body.innerHTML = '<div id="chart"></div>';
    new Sankey('#chart', { animate: false, tableFallback: false }).setData(budget);
    expect(document.querySelector('.rc-sankey-table')).toBeNull();
  });

  it('empty data renders nothing and does not throw', () => {
    new Sankey('#chart', { animate: false }).setData({ links: [] });
    expect(host.querySelectorAll('.rc-sankey-link')).toHaveLength(0);
  });

  it('linkColor type builds the legend from linkTypes', () => {
    new Sankey('#chart', {
      animate: false, orientation: 'horizontal', linkColor: 'type',
      linkTypes: { grant: { color: '#0a0', label: 'Grant' } },
    }).setData(budget);
    expect(host.querySelector('.rc-legend').textContent).toContain('Grant');
  });
});

describe('Sankey — a rejected payload (K-02)', () => {
  it('a cycle throws at setData and the chart keeps its previous data', () => {
    document.body.innerHTML = '<div id="chart"></div>';
    const s = new Sankey('#chart', { animate: false }).setData(budget);
    const bands = () => document.querySelectorAll('#chart .rc-sankey-link').length;
    const before = bands();
    expect(() => s.setData({ links: [{ source: 'a', target: 'b', value: 1 }, { source: 'b', target: 'a', value: 1 }] })).toThrow();
    expect(() => s.render()).not.toThrow();       // a resize after the error
    expect(bands()).toBe(before);
    s.destroy();
  });
});

describe('Sankey — keys and colours', () => {
  it('ids with separators do not merge different pairs (R-20)', () => {
    document.body.innerHTML = '<div id="chart"></div>';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = new Sankey('#chart', { animate: false }).setData({
      links: [{ source: 'a→b', target: 'c', value: 1 }, { source: 'a', target: 'b→c', value: 2 }],
    });
    expect(document.querySelectorAll('#chart .rc-sankey-link')).toHaveLength(2);
    expect(warn).not.toHaveBeenCalled();
    s.destroy();
  });

  it("linkColor: 'type' keeps an undescribed type muted — the legend lists described types only", () => {
    document.body.innerHTML = '<div id="chart"></div>';
    const s = new Sankey('#chart', { animate: false, linkColor: 'type', linkTypes: { grant: { color: '#123456', label: 'Grant' } } })
      .setData({ links: [{ source: 'a', target: 'b', value: 1, type: 'grant' }, { source: 'a', target: 'c', value: 1, type: 'loan' }] });
    const fills = [...document.querySelectorAll('#chart .rc-sankey-link')].map(p => [p.__data__.data.type, p.getAttribute('stroke') ?? p.getAttribute('fill')]);
    expect(Object.fromEntries(fills)).toMatchObject({ grant: '#123456' });
    expect(Object.fromEntries(fills).loan).not.toBe('#123456');
    s.destroy();
  });
});

// ─── The type legend (RC-052; the legend spec §9.6) ────────────────────────
// A header legend item that names a link type toggles that type's bands.
// Hidden bands leave without a new layout: the nodes, their labels and the
// other bands stay byte-equal. Read from the drawing, the legend, the
// tooltip and the table (S-17).

describe('Sankey — the type legend (RC-052)', () => {
  // the money trail of /charts/sankey/ (#sankey-trail) as it was before its
  // holdings were balanced (2026-11-19): the legend reads the types, not the sums
  const trail = {
    links: [
      { from: 'Pension fund',  to: 'Holding A',  value: 140, type: 'equity', label: 'Series B, 2021' },
      { from: 'Pension fund',  to: 'Holding B',  value: 60,  type: 'equity' },
      { from: 'Family office', to: 'Holding A',  value: 45,  type: 'loan',   label: 'Bridge loan, 8%' },
      { from: 'Family office', to: 'Holding B',  value: 30,  type: 'equity' },
      { from: 'Sovereign fund', to: 'Holding B', value: 90,  type: 'equity' },
      { from: 'Holding A',     to: 'Operating co', value: 120, type: 'equity' },
      { from: 'Holding A',     to: 'Founders',   value: 40,  type: 'payout', label: 'Secondary sale' },
      { from: 'Holding B',     to: 'Operating co', value: 95,  type: 'loan' },
      { from: 'Holding B',     to: 'Advisers',   value: 18,  type: 'payout' },
      { from: 'Holding B',     to: 'Founders',   value: 50,  type: 'payout' },
    ],
  };
  const linkTypes = {
    equity: { color: '#00aaff', label: 'Equity' },
    loan:   { color: '#fa8c16', label: 'Loan' },
    payout: { color: '#00c97a', label: 'Payout' },
  };
  const sankey = (o = {}) => track(new Sankey(mount('chart', { width: 800, height: 400 }), {
    animate: false, orientation: 'horizontal', linkColor: 'type', linkTypes, ...o,
  }));

  const q = (c, sel) => [...c.container.querySelectorAll(sel)];
  const bands = c => q(c, '.rc-sankey-link');
  const bandNames = c => bands(c).map(p => p.getAttribute('aria-label'));
  const bandOf = (c, name) => bands(c).find(p => p.getAttribute('aria-label') === name);
  const nodeOf = (c, name) => q(c, '.rc-sankey-node').find(r => r.getAttribute('aria-label').startsWith(`${name}:`));
  const layer = (c, cls) => c.container.querySelector(`.${cls}`).outerHTML;
  const itemOf = (c, key) => c.container.querySelector(`.rc-legend-item[data-key="${key}"]`);
  const resetOf = c => c.container.querySelector('.rc-legend-reset');
  const tableRows = c => q(c, '.rc-sankey-table tbody tr').map(tr => tr.textContent);
  const tipText = c => tooltipOf(c).textContent.replace(/\s+/g, ' ');
  const pinned = c => tooltipOf(c).classList.contains('is-pinned');
  const click = (el, detail = 0) => el.dispatchEvent(new MouseEvent('click', { detail, bubbles: true }));
  const hover = el => el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  const enter = el => el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  const LOAN = ['Family office → Holding A: 45', 'Holding B → Operating co: 95'];

  beforeEach(() => { document.body.innerHTML = ''; });
  afterEach(() => vi.useRealTimers());

  it('the auto legend keys each described type: a toggle per type, in the linkTypes order and colours', () => {
    const c = sankey().setData(trail);
    expect(c.options.legend.map(i => i.series)).toEqual(['equity', 'loan', 'payout']);
    const items = q(c, '.rc-legend > button.rc-legend-item');
    expect(items.map(b => `${b.dataset.key}:${b.lastElementChild.textContent}:${b.getAttribute('aria-pressed')}`))
      .toEqual(['equity:Equity:true', 'loan:Loan:true', 'payout:Payout:true']);
    expect(items.map(b => b.firstElementChild.className)).toEqual(['rc-legend-dot', 'rc-legend-dot', 'rc-legend-dot']);
    expect(items.map(b => b.firstElementChild.style.getPropertyValue('--rc-swatch-color'))).toEqual(['#00aaff', '#fa8c16', '#00c97a']);
    expect(resetOf(c).hidden).toBe(true);
  });

  it('hiding a type takes its bands away without a new layout: nodes, labels and the other bands are byte-equal', () => {
    const c = sankey().setData(trail);
    const nodes = layer(c, 'rc-sankey-nodes');
    const labels = layer(c, 'rc-sankey-labels');
    const others = bands(c).filter(p => !LOAN.includes(p.getAttribute('aria-label'))).map(p => p.outerHTML);
    const all = layer(c, 'rc-sankey-links');
    expect(bandNames(c)).toEqual(expect.arrayContaining(LOAN));

    click(itemOf(c, 'loan'));                                   // Enter, Space or a screen reader: at once
    expect(itemOf(c, 'loan').getAttribute('aria-pressed')).toBe('false');
    expect(bandNames(c).filter(n => LOAN.includes(n))).toEqual([]);
    expect(bands(c).map(p => p.outerHTML)).toEqual(others);
    expect(layer(c, 'rc-sankey-nodes')).toBe(nodes);
    expect(layer(c, 'rc-sankey-labels')).toBe(labels);           // node values stay whole
    expect(c.container.querySelector('.rc-sankey-nodes').innerHTML).toContain('aria-label="Holding A: 185"');
    expect(resetOf(c).hidden).toBe(false);

    click(itemOf(c, 'loan'));                                   // back: the same drawing, in the same order
    expect(layer(c, 'rc-sankey-links')).toBe(all);
    expect(layer(c, 'rc-sankey-nodes')).toBe(nodes);
    expect(resetOf(c).hidden).toBe(true);
  });

  it('the vertical layout keeps its nodes too', () => {
    const c = sankey({ orientation: 'vertical' }).setData(trail);
    const nodes = layer(c, 'rc-sankey-nodes');
    c.setLinkTypesVisible(['equity']);
    expect(bands(c)).toHaveLength(5);
    expect(layer(c, 'rc-sankey-nodes')).toBe(nodes);
  });

  it('the node tooltip sums the shown bands; a band keeps its share of the whole source', () => {
    const c = sankey().setData(trail);
    hover(nodeOf(c, 'Holding B'));
    expect(tipText(c)).toMatch(/in 180 .*out 163/);
    hover(bandOf(c, 'Holding B → Advisers: 18'));
    expect(tipText(c)).toContain('11% of Holding B');

    c.setLinkTypesVisible(['equity', 'payout']);
    hover(nodeOf(c, 'Holding B'));
    expect(tipText(c)).toMatch(/in 180 .*out 68/);
    expect(tipText(c)).not.toContain('Operating co');           // its loan band hidden
    hover(nodeOf(c, 'Family office'));                          // its loan band hidden: one band out
    expect(tipText(c)).toMatch(/out 30 Holding B 30 ?$/);
    hover(bandOf(c, 'Holding B → Advisers: 18'));
    expect(tipText(c)).toContain('11% of Holding B');           // 18 of 163, not of 68

    c.setLinkTypesVisible(['loan']);
    hover(nodeOf(c, 'Holding A'));                              // in by a loan, out by none shown
    expect(tipText(c)).toMatch(/in 45 Family office 45/);
    expect(tipText(c)).not.toMatch(/out/);
  });

  it('RC-022: the node tooltip lists each shown band in and out by its other node, with its value and swatch', () => {
    const c = sankey().setData(trail);
    hover(nodeOf(c, 'Holding B'));
    const rows = q(c, '.rc-tooltip .rc-tooltip-row').map(r => r.textContent.replace(/\s+/g, ' ').trim());
    // the totals, then the bands in the order they meet the node (top to bottom)
    expect(rows[0]).toBe('in 180');
    expect(rows.slice(1, 4).sort()).toEqual(['Family office 30', 'Pension fund 60', 'Sovereign fund 90']);
    expect(rows[4]).toBe('out 163');
    expect(rows.slice(5).sort()).toEqual(['Advisers 18', 'Founders 50', 'Operating co 95']);
    const swatches = q(c, '.rc-tooltip .rc-tooltip-swatch--band');
    expect(swatches).toHaveLength(6);                           // the totals carry none
    const advisers = q(c, '.rc-tooltip .rc-tooltip-row').find(r => r.textContent.includes('Advisers'));
    expect(advisers.querySelector('.rc-tooltip-swatch').style.getPropertyValue('--rc-swatch-color')).toBe('#00c97a');
    expect(advisers.querySelector('.rc-tooltip-note')).toBeNull();
  });

  it('RC-022: two bands with one other node are told apart by their type', () => {
    const c = sankey().setData({ links: [
      { from: 'Fund', to: 'Co', value: 40, type: 'equity' },
      { from: 'Fund', to: 'Co', value: 10, type: 'loan' },
      { from: 'Fund', to: 'Bank', value: 5, type: 'loan' },
    ] });
    hover(nodeOf(c, 'Fund'));
    const rows = q(c, '.rc-tooltip .rc-tooltip-row');
    const co = rows.filter(r => r.querySelector('.rc-tooltip-label').textContent === 'Co');
    expect(co.map(r => r.querySelector('.rc-tooltip-note')?.textContent)).toEqual(expect.arrayContaining(['Equity', 'Loan']));
    const bank = rows.find(r => r.querySelector('.rc-tooltip-label').textContent === 'Bank');
    expect(bank.querySelector('.rc-tooltip-note')).toBeNull();
  });

  it('RC-022: with a gradient, a band\'s swatch takes the colour of its other node', () => {
    const c = sankey({ linkColor: 'gradient' }).setData({ nodes: [
      { id: 'a', color: '#111111' }, { id: 'b', color: '#222222' }, { id: 'c', color: '#333333' },
    ], links: [{ from: 'a', to: 'b', value: 3 }, { from: 'b', to: 'c', value: 2 }] });
    hover(nodeOf(c, 'b'));
    const colours = q(c, '.rc-tooltip .rc-tooltip-swatch').map(el => el.style.getPropertyValue('--rc-swatch-color'));
    expect(colours).toEqual(['#111111', '#333333']);
  });

  it('RC-027: a pinned band tooltip is released by a click elsewhere or by Escape', async () => {
    const c = sankey().setData(trail);
    const tick = () => new Promise(r => setTimeout(r, 0));
    click(bandOf(c, 'Holding B → Advisers: 18'), 1);
    expect(pinned(c)).toBe(true);
    await tick();                                               // the outside listeners come after the click
    tooltipOf(c).dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(pinned(c)).toBe(true);                               // a press inside keeps it
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(pinned(c)).toBe(false);
    expect(tooltipOf(c).classList.contains('is-visible')).toBe(false);
    expect(bands(c).every(b => b.getAttribute('stroke-opacity') === '0.45')).toBe(true);   // the highlight goes too

    click(bandOf(c, 'Holding B → Advisers: 18'), 1);
    await tick();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(pinned(c)).toBe(false);
    expect(bands(c).every(b => b.getAttribute('stroke-opacity') === '0.45')).toBe(true);
  });

  it('K-24: the svg is a group while it holds its focusable nodes, an image without them', () => {
    const c = sankey({ title: 'Trail' }).setData(trail);
    const svg = c.container.querySelector('svg');
    expect(svg.getAttribute('role')).toBe('group');
    expect(svg.getAttribute('aria-label')).toBe('Trail');
    expect(q(c, '.rc-sankey-node').every(n => n.getAttribute('tabindex') === '0')).toBe(true);
    expect(q(c, '[tabindex]').every(el => el.classList.contains('rc-sankey-node'))).toBe(true);   // Tab stops on nodes only
    c.setData({ links: [] });
    expect(svg.getAttribute('role')).toBe('img');
    expect(q(c, '.rc-sankey-link-hit')).toHaveLength(0);
  });

  it('tooltipFormat gets the shown bands in and out, and all of them as links', () => {
    const seen = [];
    const c = sankey({
      tooltipFormat: ({ node, incoming, outgoing, links }) => {
        seen.push(`${node.id}|${incoming.map(l => l.type).join(',')}|${outgoing.map(l => l.type).join(',')}`);
        expect(links).toEqual([...incoming, ...outgoing]);   // RC-010: as MapFlow and Graph name it
        return node.id;
      },
    }).setData(trail);
    hover(nodeOf(c, 'Holding A'));
    c.setLinkTypesVisible(['equity', 'payout']);
    hover(nodeOf(c, 'Holding A'));
    expect(seen).toEqual(['Holding A|equity,loan|equity,payout', 'Holding A|equity|equity,payout']);
  });

  it('the hover reads the shown bands: a node lights its neighbours by shown bands only', () => {
    const c = sankey().setData(trail);
    const lit = () => ['Holding A', 'Holding B'].map(n => nodeOf(c, n).style.opacity);
    hover(nodeOf(c, 'Family office'));
    expect(lit()).toEqual(['1', '1']);
    c.setLinkTypesVisible(['equity', 'payout']);
    hover(nodeOf(c, 'Family office'));
    expect(lit()).toEqual(['0.35', '1']);
    expect(bands(c).filter(p => p.getAttribute('stroke-opacity') !== '0.12').map(p => p.getAttribute('aria-label')))
      .toEqual(['Family office → Holding B: 30']);
  });

  it('the screen-reader table lists the shown bands', () => {
    const c = sankey().setData(trail);
    expect(tableRows(c)).toHaveLength(10);
    click(itemOf(c, 'loan'));
    expect(tableRows(c)).toHaveLength(8);
    expect(tableRows(c).filter(r => r.startsWith('Family officeHolding A'))).toEqual([]);
  });

  it('every type hidden: no band and no table; every node and label stays', () => {
    const c = sankey().setData(trail);
    const nodes = layer(c, 'rc-sankey-nodes');
    const labels = layer(c, 'rc-sankey-labels');
    c.setLinkTypesVisible([]);
    expect(bands(c)).toHaveLength(0);
    expect(c.container.querySelector('.rc-sankey-table')).toBeNull();
    expect(layer(c, 'rc-sankey-nodes')).toBe(nodes);
    expect(layer(c, 'rc-sankey-labels')).toBe(labels);
    expect(q(c, '.rc-legend button[aria-pressed="false"]')).toHaveLength(3);
    click(resetOf(c));
    expect(bands(c)).toHaveLength(10);
  });

  it('a pinned band whose type is hidden is let go; a pinned band of another type stays', () => {
    const c = sankey().setData(trail);
    click(bandOf(c, 'Holding B → Operating co: 95'), 1);       // a loan
    expect(pinned(c)).toBe(true);
    click(itemOf(c, 'payout'));                                 // the keyboard: no pointerdown outside
    expect(pinned(c)).toBe(true);
    click(itemOf(c, 'loan'));
    expect(pinned(c)).toBe(false);

    c.setLinkTypesVisible(null);
    click(bandOf(c, 'Holding B → Founders: 50'), 1);            // a payout
    c.setLinkTypesVisible(['payout']);                          // the setter too: its band stays
    expect(pinned(c)).toBe(true);
    c.setLinkTypesVisible(['equity']);
    expect(pinned(c)).toBe(false);
  });

  it('a pinned node tooltip whose shown sums change is let go; one that still holds stays', () => {
    const c = sankey().setData(trail);
    enter(nodeOf(c, 'Pension fund'));                           // out by equity only
    expect(pinned(c)).toBe(true);
    c.setLinkTypesVisible(['equity', 'payout']);
    expect(pinned(c)).toBe(true);
    c.setLinkTypesVisible(null);
    enter(nodeOf(c, 'Holding A'));                              // in by equity and a loan
    expect(tipText(c)).toMatch(/in 185/);
    click(itemOf(c, 'loan'));
    expect(pinned(c)).toBe(false);
  });

  it('hiddenLinkTypes hides types from the start: the item is off and Show all shows them', () => {
    const c = sankey({ hiddenLinkTypes: ['loan'] }).setData(trail);
    expect(bands(c)).toHaveLength(8);
    expect(itemOf(c, 'loan').getAttribute('aria-pressed')).toBe('false');
    expect(resetOf(c).hidden).toBe(false);
    click(resetOf(c));
    expect(bands(c)).toHaveLength(10);
    expect(itemOf(c, 'loan').getAttribute('aria-pressed')).toBe('true');
  });

  it('setLinkTypesVisible: a list, one type, null; it returns the chart and fires no event', () => {
    const onLegendToggle = vi.fn();
    const c = sankey({ onLegendToggle }).setData(trail);
    expect(c.setLinkTypesVisible(['loan', 'payout'])).toBe(c);
    expect(bands(c)).toHaveLength(5);
    c.setLinkTypesVisible('loan');
    expect(bandNames(c)).toEqual(LOAN);
    expect(q(c, '.rc-legend button[data-key]').map(b => b.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
    c.setLinkTypesVisible(null);
    expect(bands(c)).toHaveLength(10);
    expect(onLegendToggle).not.toHaveBeenCalled();
  });

  it('legend gestures: a click toggles, a double click keeps one type, each tells the page once', () => {
    vi.useFakeTimers();
    const onLegendToggle = vi.fn();
    const c = sankey({ onLegendToggle }).setData(trail);
    click(itemOf(c, 'loan'));
    expect(onLegendToggle).toHaveBeenLastCalledWith({ name: 'loan', visible: false, visibleNames: ['equity', 'payout'] });

    click(itemOf(c, 'equity'), 1);                              // a double click on equity
    click(itemOf(c, 'equity'), 2);
    itemOf(c, 'equity').dispatchEvent(new MouseEvent('dblclick', { detail: 2, bubbles: true }));
    vi.advanceTimersByTime(1000);
    expect(onLegendToggle).toHaveBeenCalledTimes(2);
    expect(onLegendToggle).toHaveBeenLastCalledWith({ name: 'equity', visible: true, visibleNames: ['equity'] });
    expect(bands(c)).toHaveLength(5);
    expect(new Set(bands(c).map(p => p.getAttribute('stroke')))).toEqual(new Set(['#00aaff']));
  });

  it('an untyped band is "default": the API hides it; the auto legend lists neither it nor a described type the data lacks', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const c = sankey({ linkTypes: { grant: { color: '#123456', label: 'Grant' }, unused: { color: '#654321', label: 'Unused' } } });
    // before any data (a resize or the fonts render one) every described type stays, a label
    c.render();
    expect(q(c, '.rc-legend > *').map(el => `${el.localName}:${el.textContent}`)).toEqual(['div:Grant', 'div:Unused']);
    c.setData({ links: [{ source: 'a', target: 'b', value: 2, type: 'grant' }, { source: 'a', target: 'c', value: 1 }] });
    expect(q(c, '.rc-legend > *').map(el => `${el.localName}:${el.dataset.key ?? ''}:${el.textContent}`))
      .toEqual(['button:grant:Grant', 'button::Show all']);
    c.setLinkTypesVisible('default');
    expect(bandNames(c)).toEqual(['a → c: 1']);
    c.setLinkTypesVisible(['grant']);
    expect(bandNames(c)).toEqual(['a → b: 2']);
    expect(resetOf(c).hidden).toBe(false);                      // something is hidden, listed or not
    click(resetOf(c));
    expect(bands(c)).toHaveLength(2);
    expect(warn).not.toHaveBeenCalled();
  });

  it('a page legend maps by series, else name, else label; an item without a colour takes its bands\' one', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const legend = [{ label: 'Loans', series: 'loan' }, { label: 'payout' }, { label: 'Note', series: false }];
    const c = sankey({ legend }).setData(trail);
    expect(q(c, '.rc-legend > *').map(el => `${el.localName}:${el.dataset.key ?? ''}:${el.lastElementChild.textContent}`))
      .toEqual(['button:loan:Loans', 'button:payout:payout', 'div::Note', 'button::Show all']);
    expect(itemOf(c, 'loan').firstElementChild.style.getPropertyValue('--rc-swatch-color')).toBe('#fa8c16');
    click(itemOf(c, 'loan'));
    expect(bands(c)).toHaveLength(8);
    // by source, a type has no one colour: the item takes the accent (the card's
    // token, K-14); with a CSS colour, the bands' colour
    const swatch = s => s.container.querySelector('[data-key="loan"]').firstElementChild.style.getPropertyValue('--rc-swatch-color');
    const bySource = track(new Sankey(mount('s2'), { animate: false, legend: [{ label: 'loan' }] })).setData(trail);
    expect(swatch(bySource)).toBe('var(--rc-accent, #1677ff)');
    const oneColour = track(new Sankey(mount('s3'), { animate: false, linkColor: '#336699', legend: [{ label: 'loan' }] })).setData(trail);
    expect(swatch(oneColour)).toBe('#336699');
  });

  it('legendInteractive: false keeps plain labels and leaves a type hidden by the API out', () => {
    const c = sankey({ legendInteractive: false }).setData(trail);
    expect(q(c, '.rc-legend > *').map(el => el.localName)).toEqual(['div', 'div', 'div']);
    c.setLinkTypesVisible(['equity', 'payout']);
    expect(q(c, '.rc-legend > *').map(el => el.textContent)).toEqual(['Equity', 'Payout']);
    expect(bands(c)).toHaveLength(8);
  });

  it('linkColor gradient: a hidden band has no gradient', () => {
    const c = sankey({ linkColor: 'gradient', legend: [{ label: 'loan' }] }).setData(trail);
    expect(q(c, 'linearGradient')).toHaveLength(10);
    click(itemOf(c, 'loan'));
    expect(q(c, 'linearGradient')).toHaveLength(8);
    const ids = new Set(q(c, 'linearGradient').map(g => `url(#${g.id})`));
    bands(c).forEach(p => expect(ids.has(p.getAttribute('stroke'))).toBe(true));
  });
});

// RC-024: every band takes the pointer on an invisible stroke above the
// bands and below the nodes, at least 8 px wide, the thinnest on top.
describe('Sankey — thin bands get an 8 px hit area', () => {
  beforeEach(() => { document.body.innerHTML = '<div id="chart"></div>'; });
  const data = { links: [{ from: 'a', to: 'b', value: 1000 }, { from: 'a', to: 'c', value: 3 }, { from: 'a', to: 'd', value: 1 }] };

  it('a thin band\'s is 8 px wide and drawn last, and it shows the band\'s tooltip', () => {
    const c = new Sankey('#chart', { animate: false, orientation: 'horizontal' }).setData(data);
    const host = document.getElementById('chart');
    const bands = [...host.querySelectorAll('.rc-sankey-link')];
    const hits = [...host.querySelectorAll('.rc-sankey-link-hit')];
    const thin = bands.filter(b => b.__data__.width < 8);
    expect(thin.length).toBe(2);
    expect(hits.map(h => h.__data__.target.id)).toEqual(['b', 'c', 'd']);
    hits.forEach(h => {
      const band = bands.find(b => b.__data__ === h.__data__);
      expect(+h.getAttribute('stroke-width')).toBe(Math.max(8, band.__data__.width));
      expect(h.getAttribute('stroke')).toBe('transparent');
      expect(h.style.pointerEvents).toBe('stroke');
      expect(h.getAttribute('d')).toBe(band.getAttribute('d'));
    });
    expect(+hits[0].getAttribute('stroke-width')).toBeGreaterThan(8);
    const layers = [...host.querySelectorAll('.rc-sankey > g')].map(g => g.getAttribute('class'));
    expect(layers).toEqual(['rc-sankey-links', 'rc-sankey-link-hits', 'rc-sankey-nodes', 'rc-sankey-labels']);
    expect(host.querySelector('.rc-sankey-link-hits').getAttribute('aria-hidden')).toBe('true');
    hits[2].dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(c._tooltip.el.textContent).toContain('a → d');
    hits[2].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(c._tooltip.isPinned).toBe(true);
  });
});
