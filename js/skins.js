// 계절 스킨: 화면 뒤에 계절별 입자(벚꽃잎·여름 물방울·낙엽·눈송이)가 천천히 움직이는 배경을 그린다.
// 배경 캔버스 하나를 쓰고, 탭이 가려지면 멈추며, 움직임 줄이기 설정이면 멈춘 한 장면만 그린다.
(function (global) {
  'use strict';

  const SKINS = ['spring', 'summer', 'autumn', 'winter'];

  // 기기 날짜로 정하는 기본 스킨. 봄 3~5월, 여름 6~9월, 가을 10~11월, 겨울 12~2월.
  function seasonOf(date) {
    const month = date.getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 9) return 'summer';
    if (month >= 10 && month <= 11) return 'autumn';
    return 'winter';
  }

  // fall: 한 프레임에 움직이는 세로 거리(음수면 위로 떠오름), size: 크기 범위(px).
  // 겨울 눈은 라이트 모드의 밝은 배경에서도 보이도록 옅은 하늘색으로 그린다.
  const STYLES = {
    spring: { shape: 'petal', fall: 0.7, size: [6, 10], light: ['#f48fb1', '#f8a5c2', '#f9bfd0'], dark: ['#f8a5c2', '#fbc4d4', '#f7d6e0'] },
    summer: { shape: 'bubble', fall: -0.4, size: [5, 14], light: ['#3cbf8a', '#5cc8bb', '#f2b630'], dark: ['#7fe0b8', '#8fe0d4', '#ffd66b'] },
    autumn: { shape: 'leaf', fall: 0.8, size: [8, 13], light: ['#e0701f', '#c9452c', '#d49a1f', '#9c5a2a'], dark: ['#f08a3c', '#e2604a', '#e8b23e', '#c07a45'] },
    winter: { shape: 'flake', fall: 0.5, size: [2.5, 6], light: ['#9dbfe6', '#b4cfee', '#88b0de'], dark: ['#ffffff', '#e3ecf8', '#cbdcf2'] },
  };

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let canvas = null;
  let ctx = null;
  let skin = null;
  let particles = [];
  let width = 0;
  let height = 0;
  let frameId = 0;
  let last = 0;

  // anywhere 가 true 면 화면 아무 곳에, 아니면 들어오는 쪽 가장자리 바깥에서 새로 만든다.
  function makeParticle(anywhere) {
    const style = STYLES[skin];
    const dark = document.documentElement.dataset.theme === 'dark';
    const colors = dark ? style.dark : style.light;
    const size = style.size[0] + Math.random() * (style.size[1] - style.size[0]);
    return {
      x: Math.random() * width,
      y: anywhere ? Math.random() * height : style.fall > 0 ? -20 : height + 20,
      size: size,
      speed: style.fall * (0.6 + Math.random() * 0.8),
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.008 + Math.random() * 0.015,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.04,
      color: colors[Math.floor(Math.random() * colors.length)],
    };
  }

  function drawParticle(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;
    const s = p.size;
    switch (STYLES[skin].shape) {
      case 'petal': // 끝이 살짝 갈라진 벚꽃잎
        ctx.beginPath();
        ctx.moveTo(0, s);
        ctx.bezierCurveTo(s, s * 0.4, s * 0.8, -s * 0.8, s * 0.15, -s);
        ctx.lineTo(0, -s * 0.7);
        ctx.lineTo(-s * 0.15, -s);
        ctx.bezierCurveTo(-s * 0.8, -s * 0.8, -s, s * 0.4, 0, s);
        ctx.fill();
        break;
      case 'bubble': // 속이 비치는 물방울
        ctx.globalAlpha *= 0.35;
        ctx.beginPath();
        ctx.arc(0, 0, s, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha /= 0.35;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
      case 'leaf': // 가운데 잎맥이 있는 잎
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.quadraticCurveTo(s * 0.9, -s * 0.1, 0, s);
        ctx.quadraticCurveTo(-s * 0.9, -s * 0.1, 0, -s);
        ctx.fill();
        ctx.globalAlpha *= 0.5;
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.8);
        ctx.lineTo(0, s * 1.3);
        ctx.stroke();
        break;
      default: // 눈송이
        ctx.beginPath();
        ctx.arc(0, 0, s, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = document.documentElement.dataset.theme === 'dark' ? 0.5 : 0.6;
    particles.forEach(drawParticle);
  }

  function frame(now) {
    const step = Math.min((now - last) / 16.7, 3); // 60fps 기준 한 프레임 = 1
    last = now;
    particles.forEach((p, i) => {
      p.sway += p.swaySpeed * step;
      p.x += Math.sin(p.sway) * 0.5 * step;
      p.y += p.speed * step;
      p.rot += p.spin * step;
      if (p.y > height + 30 || p.y < -30 || p.x < -30 || p.x > width + 30) particles[i] = makeParticle(false);
    });
    render();
    frameId = requestAnimationFrame(frame);
  }

  function stop() {
    cancelAnimationFrame(frameId);
    frameId = 0;
  }

  function play() {
    stop();
    if (!skin || document.hidden) return;
    if (reducedMotion.matches) {
      render(); // 움직이지 않는 한 장면만
      return;
    }
    last = performance.now();
    frameId = requestAnimationFrame(frame);
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  // 화면 넓이에 맞춰 입자 수를 정한다(16 ~ 40개).
  function reset() {
    const count = Math.max(16, Math.min(40, Math.round((width * height) / 12000)));
    particles = Array.from({ length: count }, () => makeParticle(true));
    play();
  }

  // 스킨을 바꾸거나 테마가 바뀌었을 때 부른다. 입자 색이 테마를 따르므로 새로 만든다.
  function apply(name) {
    skin = SKINS.indexOf(name) >= 0 ? name : seasonOf(new Date());
    document.documentElement.dataset.skin = skin;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'skin-bg';
      canvas.setAttribute('aria-hidden', 'true');
      document.body.prepend(canvas);
      ctx = canvas.getContext('2d');
      resize();
      window.addEventListener('resize', () => {
        resize();
        if (!frameId) render();
      });
      document.addEventListener('visibilitychange', play);
      reducedMotion.addEventListener('change', play);
    }
    reset();
  }

  global.UpDownSkins = { SKINS: SKINS, seasonOf: seasonOf, apply: apply };
})(window);
