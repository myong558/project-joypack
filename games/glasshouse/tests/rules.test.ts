import { describe, expect, it } from 'vitest';
import { Game, levelScore, petals } from '../src/game/engine';
import { lit, parse, solved, step, stuckPots } from '../src/game/rules';

describe('햇살 자리', () => {
  it('창 바로 앞 한 칸이 햇살 자리이고, 모든 햇살 자리에 화분이 있으면 깸', () => {
    const { board, start } = parse(['#####', '>.o.#', '#@..#', '#####']);
    expect(board.spots).toEqual([6]);
    expect(lit(board, start.pots)).toEqual([false]);
    expect(solved(board, [6])).toBe(true);
    expect(solved(board, [7])).toBe(false);
  });

  it('화분 수와 창 수가 다르거나 창 앞이 벽이면 판이 아니다', () => {
    expect(() => parse(['#####', '>.o.#', '#@o.#', '#####'])).toThrow();
    expect(() => parse(['#####', '>#o.#', '#@..#', '#####'])).toThrow();
  });
});

describe('움직임', () => {
  it('화분을 한 칸씩 밀고, 뒤가 벽이면 못 민다', () => {
    const { board, start } = parse(['######', '#@o..<', '######']);
    const a = step(board, start, 1);
    expect(a.pushed).toBe(0);
    expect(a.state.pots).toEqual([9]);
    const b = step(board, a.state, 1);
    expect(b.state.pots).toEqual([10]);
    expect(step(board, b.state, 1).moved).toBe(false);
  });

  it('화분 두 개는 한꺼번에 못 민다', () => {
    const { board, start } = parse(['#v#v###', '#.....#', '#@oo..#', '#######']);
    expect(step(board, start, 1).moved).toBe(false);
  });

  it('구석에 몰려 다시는 못 옮기는 화분을 알려 준다(햇살 자리의 구석은 괜찮음)', () => {
    const { board, start } = parse(['#####', '>...#', '#@.o#', '#####']);
    expect(stuckPots(board, start)).toEqual([0]);
    const ok = parse(['#####', '#...<', '#@.o#', '#####']);
    expect(stuckPots(ok.board, { player: ok.start.player, pots: [8] })).toEqual([]);
  });
});

describe('판 진행', () => {
  const ROOM = ['###v##', '#....#', '#..o.#', '#..@.#', '######'];

  it('되돌리기는 이동 수도 되돌리고, 깨면 더 움직이지 않는다', () => {
    const g = new Game(ROOM);
    g.move(3);
    expect(g.moves).toBe(1);
    g.undo();
    expect(g.moves).toBe(0);
    // 화분을 위로 밀면 창 앞 햇살 자리에 들어가 깸
    const h = new Game(ROOM);
    h.move(0);
    expect(h.done).toBe(true);
    expect(h.lit).toEqual([true]);
    expect(h.move(2).moved).toBe(false);
    expect(h.canUndo).toBe(false);
  });

  it('걸어서 갈 길은 화분을 피해 가장 짧게', () => {
    const g = new Game(['#####', '#@o.#', '#...#', '##^##']);
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
