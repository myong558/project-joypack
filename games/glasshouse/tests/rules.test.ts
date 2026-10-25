import { describe, expect, it } from 'vitest';
import { Game, levelScore, petals } from '../src/game/engine';
import { happy, light, parse, step, stuckPots } from '../src/game/rules';

describe('햇살 줄기', () => {
  it('창에서 곧게 나아가 첫 화분에서 멈춘다(뒤 화분은 그늘)', () => {
    const { board, start } = parse(['#####', '>.SH#', '#.@.#', '#####']);
    const l = light(board, start.pots);
    expect(l.lit).toEqual([true, false]);
    expect(happy(board, start.pots)).toEqual([true, true]);
  });

  it('반사판이 빛을 90° 꺾는다', () => {
    // 오른쪽으로 가던 빛이 '/' 에서 위로, '\' 에서 아래로
    const up = parse(['#####', '#.S.#', '>./.#', '#.@.#', '#####']);
    expect(light(up.board, up.start.pots).lit).toEqual([true]);
    const down = parse(['#####', '>.\\.#', '#.S.#', '#.@.#', '#####']);
    expect(light(down.board, down.start.pots).lit).toEqual([true]);
  });

  it('물길 위로는 빛이 지나가고 벽에서 멈춘다', () => {
    const { board, start } = parse(['######', '>~~.S#', '#@...#', '######']);
    expect(light(board, start.pots).lit).toEqual([true]);
    const wall = parse(['######', '>.#.S#', '#@...#', '######']);
    expect(light(wall.board, wall.start.pots).lit).toEqual([false]);
  });
});

describe('움직임', () => {
  it('화분을 밀고, 뒤가 막히면 못 민다', () => {
    const { board, start } = parse(['#####', '#@S.#', '#####']);
    const r = step(board, start, 1);
    expect(r.pushed).toBe(0);
    expect(r.state.pots).toEqual([8]);
    expect(step(board, r.state, 1).moved).toBe(false);
  });

  it('언 물길 위 화분은 막힐 때까지 미끄러지고, 바닥에 닿으면 멈춘다', () => {
    const { board, start } = parse(['#######', '#@S===#', '#######']);
    const r = step(board, start, 1);
    expect(r.trail.length).toBe(3);
    expect(r.state.pots).toEqual([12]);
    const stop = parse(['#######', '#@S=..#', '#######']);
    expect(step(stop.board, stop.start, 1).state.pots).toEqual([11]);
  });

  it('물길에는 사람도 화분도 못 들어간다', () => {
    const { board, start } = parse(['#####', '#@S~#', '#####']);
    expect(step(board, start, 1).moved).toBe(false);
  });

  it('물가 꽃은 물길 바로 옆이면 핀다(언 물길은 아님)', () => {
    const a = parse(['#####', '#@M~#', '#####']);
    expect(happy(a.board, a.start.pots)).toEqual([true]);
    const b = parse(['#####', '#@M=#', '#####']);
    expect(happy(b.board, b.start.pots)).toEqual([false]);
  });

  it('구석에 몰려 다시는 못 피는 햇살 꽃을 알려 준다(그늘 꽃은 다른 화분이 가려 줄 수 있어 빼기)', () => {
    const { board, start } = parse(['#v###', '#..S#', '#@..#', '#####']);
    expect(stuckPots(board, start)).toEqual([0]);
    const shade = parse(['#v###', '#..H#', '#@..#', '#####']);
    expect(stuckPots(shade.board, shade.start)).toEqual([]);
  });
});

describe('판 진행', () => {
  it('되돌리기는 이동 수도 되돌리고, 깨면 더 움직이지 않는다', () => {
    const g = new Game(['######', '>....#', '#..S.#', '#..@.#', '######']);
    g.move(3);
    expect(g.moves).toBe(1);
    g.undo();
    expect(g.moves).toBe(0);
    // 화분을 위로 밀어 햇살 줄에 넣으면 깸
    const h = new Game(['######', '>....#', '#..S.#', '#..@.#', '######']);
    h.move(0);
    expect(h.done).toBe(true);
    expect(h.move(2).moved).toBe(false);
    expect(h.canUndo).toBe(false);
  });

  it('걸어서 갈 길은 화분을 피해 가장 짧게', () => {
    const g = new Game(['#####', '#@S.#', '#...#', '#####']);
    expect(g.pathTo(3 + 5)?.length).toBe(4);
  });

  it('점수: 기준 이하 1000점·꽃잎 3장, 많을수록 줄어듦', () => {
    expect(levelScore(20, 20)).toBe(1000);
    expect(levelScore(20, 18)).toBe(1000);
    expect(levelScore(20, 25)).toBe(800);
    expect(levelScore(10, 1000)).toBe(100);
    expect(petals(20, 20)).toBe(3);
    expect(petals(20, 26)).toBe(2);
    expect(petals(20, 27)).toBe(1);
  });
});
