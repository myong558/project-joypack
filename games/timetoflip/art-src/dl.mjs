// 후보 작품의 웹용 이미지(primaryImageSmall)와 메타데이터를 받아 둔다
import { getJson } from './get.mjs';
import { existsSync, writeFileSync } from 'node:fs';
const dir = process.argv[2];
const meta = {};
for (const id of process.argv.slice(3)) {
  const o = await getJson('https://collectionapi.metmuseum.org/public/collection/v1/objects/' + id);
  if (!o.isPublicDomain) { console.log(id, 'NOT PD'); continue; }
  meta[id] = { title: o.title, artist: o.artistDisplayName, date: o.objectDate, url: o.objectURL, image: o.primaryImageSmall, credit: o.creditLine };
  const file = `${dir}/${id}.jpg`;
  if (!existsSync(file)) {
    await new Promise((r) => setTimeout(r, 400));
    const res = await fetch(o.primaryImageSmall, { headers: { 'User-Agent': 'joypack-art-picker/1.0' } });
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  console.log(id, 'ok', o.title.slice(0, 40));
}
const metaFile = `${dir}/meta.json`;
const old = existsSync(metaFile) ? JSON.parse((await import('node:fs')).readFileSync(metaFile, 'utf8')) : {};
writeFileSync(metaFile, JSON.stringify({ ...old, ...meta }, null, 2));
