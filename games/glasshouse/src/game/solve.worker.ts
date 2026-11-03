/**
 * 출시 전 확인(TEST) "풀이 보기": 하다 만 상태에서 이어지는 가장 적은 이동 풀이를 찾는다.
 * 큰 판은 몇 초 걸려 화면이 멈추지 않게 따로 돈다. 못 깨는 상태면 null
 */
import { parse, type State } from './rules';
import { explore, solve } from './solver';

self.onmessage = (e: MessageEvent<{ rows: string[]; state: State }>) => {
  const { board } = parse(e.data.rows);
  const sol = solve(board, e.data.state, explore(board, e.data.state, 3_000_000));
  self.postMessage(sol ? sol.path : null);
};
