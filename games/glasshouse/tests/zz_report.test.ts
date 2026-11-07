import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { FLOWERS } from '../src/flora';
import { LEVELS } from '../src/game/levels';
import { rate } from '../src/game/roomgen';
import { parse } from '../src/game/rules';
it('report', () => {
  const out: string[] = [];
  LEVELS.forEach((l, i) => {
    const pots = parse(l.rows).start.pots.length;
    const w = Math.max(...l.rows.map((r) => r.length)), h = l.rows.length;
    const inner = l.rows.join('').split('').filter((c) => c !== '#' && !'<>^v'.includes(c)).length;
    const c = rate(l.rows, 600000, [0, 999], true);
    const free = i >= 3 ? rate(l.rows, 600000, [0, 999], false) === null : '-';
    out.push([i + 1, FLOWERS[i].id, `${w}x${h}`, inner, pots, l.par, c?.moves, c?.pushes, c?.detours, c?.states, c?.score, free].join('\t'));
  });
  writeFileSync(process.env.OUT!, out.join('\n'));
}, 600000);
