import { describe, it, expect, beforeEach } from 'vitest';
import { Graph } from '../assets/charts/src/charts/Graph.js';
import { memorySource } from '../assets/charts/src/graph/source.js';
import { mount, track, setGeometry } from './helpers.js';

// Graph's +N badges keep off the node labels as drawn (D-08). A badge takes
// the first spot along its tie (t 0.5, 0.4, 0.6, 0.3, 0.7; on the chord or
// 12 px either side of it) whose 18 x 14 box covers no node and no label.
// The labels were obstacles at 6.2 px a character of the full name, so on a
// tight ego grid of wide names a badge settled on a neighbour's label.

const R = 22;                  // the default node radius
const CHAR = 8;                // capitals: 8 px a character, not 6.2
const NAMES = ['MWM WOMBAT', 'WOODWARD', 'MAXWELL', 'WAGNER', 'MOWBRAY', 'HAWKWOOD',
  'WARWICK', 'MW GROUP', 'WEMBLEY', 'NEWMAN', 'WARNOW', 'MAMBO'];

// The centre with a +3 badge to each of twelve neighbours, on a 480 x 320
// grid: cells 106 px apart, labels `char` px a character.
async function tightGrid(char = CHAR) {
  setGeometry({ charWidth: char });
  mount('chart', { width: 480 });
  const nodes = [{ id: 'root', label: 'ROOT' }, ...NAMES.map((label, i) => ({ id: `n${i}`, label }))];
  const links = NAMES.flatMap((_, i) => ['a', 'b', 'c', 'd'].map(type => ({ source: 'root', target: `n${i}`, type })));
  const g = track(new Graph('#chart', { dataSource: memorySource({ nodes, links }), depth: 1, height: 320, duration: 0 }));
  await g.focus('root').whenReady();
  return g;
}

const at = el => {
  const [, x, y] = /translate\(([-\d.e]+),([-\d.e]+)\)/.exec(el.getAttribute('transform')).map(Number);
  return { x, y };
};
// A node's label as drawn: the text centred under the node, `char` px a
// character, the backdrop's 3 px either side; r + 3 to r + 19 under the centre.
const labels = (char = CHAR) => new Map([...document.querySelectorAll('.rc-graph-node')].map(el => {
  const { x, y } = at(el);
  const text = el.querySelector('.rc-graph-node-label').textContent;
  const half = text.length * char / 2 + 3;
  return [el.__data__.id, { text, box: { x0: x - half, x1: x + half, y0: y + R + 3, y1: y + R + 19 } }];
}));
const badges = () => [...document.querySelectorAll('.rc-graph-link-more')].map(el => {
  const x = +el.getAttribute('x'), y = +el.getAttribute('y');
  return { ends: [el.__data__.source, el.__data__.target], box: { x0: x - 9, x1: x + 9, y0: y - 7, y1: y + 7 } };
});
const overlap = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

// Every badge that covers a label of a node it does not join.
const onNeighbours = (char = CHAR) => {
  const ls = labels(char);
  return badges().flatMap(b => [...ls]
    .filter(([id, l]) => !b.ends.includes(id) && overlap(b.box, l.box))
    .map(([id, l]) => `${b.ends.join('–')} on ${id} "${l.text}"`));
};

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('Graph +N badges keep off the labels as drawn', () => {
  it('a tight grid of wide names: no badge sits on a neighbour\'s label', async () => {
    await tightGrid();
    expect(badges()).toHaveLength(NAMES.length);
    expect(document.querySelector('.rc-graph-link-more').textContent).toBe('+3');
    // before: root–n1 on n4 "MOWBRAY" (7.2 px of it) and root–n3 on n5
    // "HAWKWOOD" (5.4 px), clear of the 6.2-a-character estimates
    expect(onNeighbours()).toEqual([]);
  });

  it('the two badges that sat on a label moved along their own ties', async () => {
    await tightGrid();
    const ls = labels();
    const byTie = new Map(badges().map(b => [b.ends.join('–'), b.box]));
    // MOWBRAY is drawn 156…218 (with its backdrop); the badge of root–n1
    // took 210.8…228.8 on the same row, now 225.5…243.5 higher up the tie
    expect(ls.get('n4').box).toMatchObject({ x0: 156, x1: 218 });
    expect(overlap(byTie.get('root–n1'), ls.get('n4').box)).toBe(false);
    // HAWKWOOD 258…328; root–n3's badge reached 263.4 there, now 256.1
    expect(ls.get('n5').box).toMatchObject({ x0: 258, x1: 328 });
    expect(overlap(byTie.get('root–n3'), ls.get('n5').box)).toBe(false);
  });

  it('the backdrop\'s padding counts: 6.2 px a character, the old estimate exactly', async () => {
    await tightGrid(6.2);
    // MOWBRAY: 43.4 px of text, 49.4 with its backdrop (162.3…211.7); the
    // badge of root–n1 took 210.8…228.8, on the backdrop's last 0.9 px
    expect(labels(6.2).get('n4').box.x1).toBeCloseTo(211.7, 6);
    expect(onNeighbours(6.2)).toEqual([]);
  });

  it('a label cut to its cell blocks only what is drawn of it, not the whole name', async () => {
    // 6.2 px a character, so the measured width is the old estimate: only
    // the cut differs
    setGeometry({ charWidth: 6.2 });
    mount('chart', { width: 375 });
    const long = 'Anderson Capital Holdings International';
    const names = ['Anderson', long, 'Carter', 'Dawson', 'Ellis', 'Fisher', 'Garcia', 'Hughes', 'Ingram', 'Jensen', 'Keller', 'Lawson'];
    const nodes = [{ id: 'root', label: 'ROOT' }, ...names.map((label, i) => ({ id: `n${i}`, label }))];
    const links = names.flatMap((_, i) => ['a', 'b', 'c', 'd'].map(type => ({ source: 'root', target: `n${i}`, type })));
    const g = track(new Graph('#chart', { dataSource: memorySource({ nodes, links }), depth: 1, height: 260, duration: 0 }));
    await g.focus('root').whenReady();

    const n1 = [...document.querySelectorAll('.rc-graph-node')].find(el => el.__data__.id === 'n1');
    const { x, y } = at(n1);
    expect(labels(6.2).get('n1').text).toBe('Anderson C…');         // cut to the cell
    // the whole name, 39 x 6.2 = 241.8 px, would reach across three cells…
    const whole = { x0: x - 241.8 / 2, x1: x + 241.8 / 2, y0: y + R + 3, y1: y + R + 19 };
    const badge = badges().find(b => b.ends.join('–') === 'root–n6').box;
    // …and the badge of root–n6 now takes the spot it blocked (the middle
    // of the tie, before: 12 px off it), clear of every label as drawn
    expect(overlap(badge, whole)).toBe(true);
    expect(onNeighbours(6.2)).toEqual([]);
  });
});
