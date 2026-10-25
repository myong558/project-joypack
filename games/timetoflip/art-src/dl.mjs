// 후보 작품의 웹용 이미지와 메타데이터를 받아 둔다. 상업 이용이 명시된 것만 받고, 아니면 건너뛴다
//   숫자          메트로폴리탄 미술관 Open Access(CC0, API isPublicDomain)
//   aic:<번호>    시카고 미술관(CC0, API is_public_domain)
//   rijks:<번호>  암스테르담 국립미술관(작품 번호 SK-…, 이미지 권리 표시가 Public Domain Mark)
//   nmk:<번호>    국립중앙박물관(relicId, 상세 페이지에 공공누리 1유형 표시 = 출처 표시하면 상업 이용·변경 가능)
// 받은 파일 이름: 메트로폴리탄은 <번호>.jpg, 나머지는 <출처>-<번호>.jpg (spec.json 의 id 와 같음)
import { getJson } from './get.mjs';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
const dir = process.argv[2];
const UA = { headers: { 'User-Agent': 'joypack-art-picker/1.0' } };
const LD = { headers: { Accept: 'application/ld+json' } };

async function met(id) {
  const o = await getJson('https://collectionapi.metmuseum.org/public/collection/v1/objects/' + id);
  if (!o.isPublicDomain) return null;
  return { file: id, metId: +id, title: o.title, artist: o.artistDisplayName, date: o.objectDate, url: o.objectURL, image: o.primaryImageSmall, credit: o.creditLine, license: 'CC0 (The Met Open Access)' };
}

async function aic(id) {
  const d = (await getJson(`https://api.artic.edu/api/v1/artworks/${id}?fields=id,title,is_public_domain,image_id,artist_title,date_display,credit_line`)).data;
  if (!d.is_public_domain) return null;
  return { file: 'aic-' + id, aicId: +id, title: d.title, artist: d.artist_title, date: d.date_display, url: 'https://www.artic.edu/artworks/' + id, image: `https://www.artic.edu/iiif/2/${d.image_id}/full/843,/0/default.jpg`, credit: d.credit_line, license: 'CC0 (Art Institute of Chicago)' };
}

async function rijks(no) {
  const s = await (await fetch('https://data.rijksmuseum.nl/search/collection?objectNumber=' + no, LD)).json();
  const o = await (await fetch(s.orderedItems[0].id, LD)).json();
  const v = JSON.stringify(await (await fetch(o.shows[0].id, LD)).json());
  const all = JSON.stringify(o) + v;
  if (!all.includes('creativecommons.org/publicdomain/')) return null;
  const iiif = all.match(/https:\/\/iiif\.micr\.io\/[A-Za-z0-9]+/)[0];
  const name = (o.identified_by || []).find((x) => x.type === 'Name' && (x.language || []).some((l) => /english|300388277/i.test(JSON.stringify(l))));
  return { file: 'rijks-' + no, rijksId: no, title: name?.content ?? no, url: 'https://www.rijksmuseum.nl/en/collection/' + no, image: iiif + '/full/1000,/0/default.jpg', license: 'Public Domain Mark 1.0 (Rijksmuseum)' };
}

async function nmk(id) {
  const page = 'https://www.museum.go.kr/site/main/relic/search/view?relicId=' + id;
  const t = (await (await fetch(page, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text()).replace(/\s+/g, ' ');
  if (!/alt='공공누리 1유형/.test(t)) return null;
  // 원본 파일(내려받기 단추와 같은 주소). 없으면 상세 페이지의 큰 그림
  const fileId = t.match(/imageDown\((\d+)\)/)?.[1];
  const img = fileId ? `/MUSEUM/module/M0502000000_relic_download_file_get.do?relicId=${id}&fileId=${fileId}` : t.match(/\/relic_image\/PS[^"]*\.jpg/)[0];
  return { file: 'nmk-' + id, nmkId: +id, title: t.match(/창작한 (.{0,80}?) 저작물/)[1], url: page, image: 'https://www.museum.go.kr' + img, credit: '국립중앙박물관', license: '공공누리 제1유형(출처표시) — 국립중앙박물관' };
}

const meta = {};
for (const arg of process.argv.slice(3)) {
  const [src, id] = arg.includes(':') ? arg.split(':') : ['met', arg];
  const m = await { met, aic, rijks, nmk }[src](id);
  if (!m) { console.log(arg, 'NOT FREE'); continue; }
  const { file: name, ...info } = m;
  meta[name] = info;
  const file = `${dir}/${name}.jpg`;
  if (!existsSync(file)) {
    await new Promise((r) => setTimeout(r, 400));
    const res = await fetch(info.image, src === 'aic' ? { headers: { 'User-Agent': 'joypack-art-picker/1.0', 'AIC-User-Agent': 'joypack-art-picker' } } : UA);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  console.log(arg, 'ok', String(info.title).slice(0, 40));
}
const metaFile = `${dir}/meta.json`;
const old = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) : {};
writeFileSync(metaFile, JSON.stringify({ ...old, ...meta }, null, 2));
