// meta.json → public/art-credits.txt(배포본에 함께 들어가는 명화 출처 목록). 공공누리 1유형은 출처 표시가 의무라 꼭 함께 배포한다
import { readFileSync, writeFileSync } from 'node:fs';
const meta = JSON.parse(readFileSync(new URL('./meta.json', import.meta.url), 'utf8'));
const groups = {};
for (const m of Object.values(meta)) (groups[m.license ?? 'CC0 (The Met Open Access)'] ??= []).push(m);
let out = 'Time to Flip — masterpiece card images / 타임 투 플립 명화 카드 그림 출처\n\n' +
  'Cropped and recolored by Joypack. Each image comes from a museum that allows commercial use.\n' +
  '조이팩이 잘라 내고 색을 바꿨습니다. 모두 상업 이용이 허락된 미술관 공개 이미지입니다.\n';
for (const [license, list] of Object.entries(groups)) {
  out += `\n## ${license}\n`;
  if (license.startsWith('공공누리')) out += '이 저작물들은 공공누리 제1유형에 따라 국립중앙박물관(www.museum.go.kr)에서 공개한 저작물을 이용하였습니다.\n';
  for (const m of list) out += `- ${m.title} — ${m.artist}, ${m.date}\n  ${m.url}\n`;
}
writeFileSync(new URL('../public/art-credits.txt', import.meta.url), out);
console.log('ok', Object.keys(meta).length);
