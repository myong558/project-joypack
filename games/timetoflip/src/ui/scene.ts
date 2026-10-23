import { reducedMotion } from './effects';

/**
 * 깊이감 있는 움직이는 배경(화면 뒤 고정 층 3개). 색은 스킨을 따른다(styles.css .scene).
 *   먼 층   큰 빛망울이 천천히 떠다니며 숨 쉬듯 커졌다 작아짐
 *   중간 층 작은 카드가 천천히 뒤집히며 떠오름
 *   가까운 층 큰 카드가 더 빠르게, 더 진하게 떠오름
 * 가까울수록 크고·빠르고·진하게 해서 깊이를 낸다. PC 에서는 마우스를 따라 층마다 다른 만큼 움직인다(시차).
 * 움직임은 transform·opacity 만 쓰고(GPU 합성), 게임 중에는 흐리게 해 카드를 방해하지 않는다.
 * 동작 줄이기가 켜져 있으면 멈춘 그림으로 둔다
 */
export function mountScene(): void {
  if (document.querySelector('.scene')) return;
  // 매번 같은 배치(새로고침해도 배경이 덜컥 바뀌지 않게)
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pick = (a: number, b: number) => (a + rnd() * (b - a)).toFixed(2);

  const bokeh = Array.from(
    { length: 6 },
    () => `<i class="bokeh" style="--x:${pick(0, 100)}%;--y:${pick(0, 100)}%;--s:${pick(120, 260)}px;--d:${pick(18, 30)}s;--t:-${pick(0, 30)}s"></i>`,
  ).join('');
  const cards = (n: number, size: [number, number], dur: [number, number]) =>
    Array.from({ length: n }, (_, i) => {
      const d = Number(pick(...dur));
      return `<i class="fc" style="--x:${pick(2, 94)}%;--y:${pick(10, 90)}%;--s:${pick(...size)}px;--d:${d}s;--t:-${pick(0, d)}s;--f:${pick(5, 9)}s;--r:${pick(-25, 25)}deg"><b class="${i % 2 ? 'face' : 'back'}"></b><b class="${i % 2 ? 'back' : 'face'}"></b></i>`;
    }).join('');

  const scene = document.createElement('div');
  scene.className = 'scene';
  scene.setAttribute('aria-hidden', 'true');
  scene.innerHTML = `
    <div class="layer far" style="--k:6">${bokeh}</div>
    <div class="layer mid" style="--k:14">${cards(7, [22, 34], [34, 46])}</div>
    <div class="layer near" style="--k:28">${cards(5, [44, 60], [22, 30])}</div>`;
  document.body.prepend(scene);

  // 마우스 시차: 화면 가운데에서 벗어난 만큼(−1~1) 층마다 --k px 씩 반대로 옮긴다. 터치 기기·동작 줄이기는 하지 않는다
  if (!matchMedia('(pointer: fine)').matches) return;
  let frame = 0;
  window.addEventListener('pointermove', (e) => {
    if (reducedMotion.matches || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      scene.style.setProperty('--px', ((e.clientX / innerWidth) * 2 - 1).toFixed(3));
      scene.style.setProperty('--py', ((e.clientY / innerHeight) * 2 - 1).toFixed(3));
    });
  });
}
