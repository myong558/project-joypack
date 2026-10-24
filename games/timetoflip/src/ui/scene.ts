import { ALL_FACES, type FaceId } from '../game/faces';
import { CARD_BACK, faceSvg } from './art';
import { reducedMotion } from './effects';

/**
 * 깊이감 있는 움직이는 배경(화면 뒤 고정 층). 색은 스킨을 따른다(styles.css .scene).
 *   빛      스킨 색이 번지는 오로라 덩어리 3개가 천천히 흐르고, 위에서 빛줄기가 느리게 돈다. 가장자리는 살짝 어둡게(비네트)
 *   먼 층   큰 빛망울이 떠다니며 숨 쉬듯 커졌다 작아짐 + 작은 반짝이
 *   중간 층 실제 카드(뒷면·도형·팝아트·명화)가 좌우로 흔들리며 떠오르고, 가끔 뒤집혀 그림을 보였다 다시 덮음
 *   가까운 층 큰 카드가 더 빠르게, 살짝 흐릿하게(초점 밖) 지나감
 * 가까울수록 크고·빠르고·흐리게 해서 깊이를 낸다. PC 에서는 마우스를 따라 층마다 다른 만큼 움직인다(시차).
 * 움직임은 transform·opacity 만 쓰고(GPU 합성), 게임 중에는 흐리게 해 카드를 방해하지 않는다.
 * 동작 줄이기가 켜져 있으면 멈춘 그림으로 둔다
 */
export function mountScene(): void {
  if (document.querySelector('.scene')) return;
  // 매번 같은 배치(새로고침해도 배경이 덜컥 바뀌지 않게)
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pick = (a: number, b: number) => (a + rnd() * (b - a)).toFixed(2);
  // 떠다니는 카드 그림: 48장에서 고르게 섞어 뽑는다(도형·팝아트·명화가 골고루 보이게)
  const faces = [...ALL_FACES].sort(() => rnd() - 0.5);
  let next = 0;
  const face = (): FaceId => faces[next++ % faces.length];

  const bokeh = Array.from(
    { length: 6 },
    () => `<i class="bokeh" style="--x:${pick(0, 100)}%;--y:${pick(0, 100)}%;--s:${pick(120, 280)}px;--d:${pick(18, 30)}s;--t:-${pick(0, 30)}s"></i>`,
  ).join('');
  const sparks = Array.from(
    { length: 14 },
    () => `<i class="spark" style="--x:${pick(0, 100)}%;--y:${pick(0, 100)}%;--d:${pick(2.5, 5)}s;--t:-${pick(0, 5)}s"></i>`,
  ).join('');
  const cards = (n: number, size: [number, number], dur: [number, number]) =>
    Array.from({ length: n }, () => {
      const d = Number(pick(...dur));
      const f = Number(pick(6, 11));
      return (
        `<i class="fc" style="--x:${pick(2, 94)}%;--s:${pick(...size)}px;--d:${d}s;--t:-${pick(0, d)}s;--r:${pick(-25, 25)}deg;--w:${pick(14, 40)}px;--sw:${pick(4, 7)}s;--f:${f}s;--ft:-${pick(0, f)}s">` +
        `<span class="sway"><span class="flip"><b class="side back">${CARD_BACK}</b><b class="side front">${faceSvg(face())}</b></span></span></i>`
      );
    }).join('');

  const scene = document.createElement('div');
  scene.className = 'scene';
  scene.setAttribute('aria-hidden', 'true');
  scene.innerHTML = `
    <div class="aurora"><i class="a1"></i><i class="a2"></i><i class="a3"></i></div>
    <div class="rays"></div>
    <div class="layer far" style="--k:6">${bokeh}${sparks}</div>
    <div class="layer mid" style="--k:14">${cards(7, [26, 40], [30, 44])}</div>
    <div class="layer near" style="--k:28">${cards(4, [56, 76], [18, 26])}</div>`;
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
