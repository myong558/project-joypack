// 천천히(요청 사이 쉼) + 막히면 다시 시도
export async function getJson(url) {
  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 400 + i * 2500));
    const res = await fetch(url, { headers: { 'User-Agent': 'joypack-art-picker/1.0' } });
    const text = await res.text();
    if (text.startsWith('{')) return JSON.parse(text);
  }
  throw new Error('blocked: ' + url);
}
