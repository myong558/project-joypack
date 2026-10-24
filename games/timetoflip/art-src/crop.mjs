// 명화 → 카드 그림(200×256 webp). 중심(cx, cy)·세로 비율(hf)로 잘라 낸다. pop 은 4단 포스터(팔레트), ink 는 흑백·대비 늘림
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const sharp = (await import(new URL('../../../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp/lib/index.js', import.meta.url).href)).default;
const [rawDir, outDir, specFile] = process.argv.slice(2);
const spec = JSON.parse(readFileSync(specFile, 'utf8'));
mkdirSync(outDir, { recursive: true });
const W = 200, H = 256;
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
for (const s of spec) {
  const img = sharp(`${rawDir}/${s.id}.jpg`);
  const { width, height } = await img.metadata();
  let ch = Math.round(height * s.hf), cw = Math.round(ch * (W / H));
  if (cw > width) { cw = width; ch = Math.round(cw * (H / W)); }
  const left = Math.max(0, Math.min(width - cw, Math.round(width * s.cx - cw / 2)));
  const top = Math.max(0, Math.min(height - ch, Math.round(height * s.cy - ch / 2)));
  let p = sharp(`${rawDir}/${s.id}.jpg`).extract({ left, top, width: cw, height: ch }).resize(W, H);
  if (s.mode === 'ink') p = p.grayscale().normalise({ lower: 1, upper: 72 }).sharpen();
  if (s.mode === 'pop') {
    const { data } = await p.clone().grayscale().normalise().blur(0.8).raw().toBuffer({ resolveWithObject: true });
    const pal = s.palette.map(hex);
    const out = Buffer.alloc(W * H * 3);
    for (let i = 0; i < W * H; i++) {
      const v = data[i];
      const k = v < 70 ? 0 : v < 125 ? 1 : v < 185 ? 2 : 3;
      out.set(pal[k], i * 3);
    }
    p = sharp(out, { raw: { width: W, height: H, channels: 3 } });
  }
  if (!s.mode) p = p.modulate({ saturation: 1.08 }).sharpen();
  await p.webp({ quality: s.mode === 'pop' ? 80 : 72 }).toFile(`${outDir}/${s.face}.webp`);
}
console.log('ok', spec.length);
