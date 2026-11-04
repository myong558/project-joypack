// 마우스 올림(:hover) 검사(기준서 1.12). pnpm build 가 맨 앞에서 돌리고, 어긋나면 빌드가 실패한다.
//   :hover 규칙은 @media (hover: hover) 안에만 둔다. 휴대폰은 누른 뒤 :hover 가 그대로 남아,
//   누른 버튼·카드가 다음에 누를 때까지 밝게(또는 커진 채로) 보인다.
// 따로 돌리기: node scripts/check-hover.mjs   자동으로 고치기: node scripts/check-hover.mjs --fix
//   (고치기는 :hover 규칙을 @media (hover: hover) { } 로 감싸고, :hover 가 아닌 선택자가 섞여 있으면 그 부분은 밖에 남긴다)
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
// 앱마다 CSS 원본이 있는 곳(빌드 결과·node_modules 는 보지 않음)
const DIRS = ['apps/hub/src', 'packages/shared', ...readdirSync(join(ROOT, 'games')).map((id) => `games/${id}`)];
const SKIP = new Set(['node_modules', 'dist', 'public', 'fonts', 'tests']);
const GUARD = /\(\s*hover\s*:\s*hover\s*\)/;

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return SKIP.has(name) ? [] : walk(p);
    return name.endsWith('.css') ? [p] : [];
  });

// 중괄호로 규칙 나무를 만든다(주석·따옴표 안은 건너뜀). 규칙마다 { prelude, start(선택자 첫 글자), end, children }
function tree(css) {
  const root = { children: [] };
  const stack = [root];
  let seg = 0;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') {
      const e = css.indexOf('*/', i + 2);
      i = e < 0 ? css.length : e + 1;
      if (css.slice(seg, i + 1).trim().startsWith('/*')) seg = i + 1; // 규칙 앞 주석은 선택자에서 뺀다
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < css.length && css[j] !== c) j += css[j] === '\\' ? 2 : 1;
      i = j;
      continue;
    }
    if (c === '{') {
      const lead = css.slice(seg, i).match(/^\s*/)[0].length;
      const node = { prelude: css.slice(seg, i).trim(), start: seg + lead, children: [] };
      stack.at(-1).children.push(node);
      stack.push(node);
      seg = i + 1;
    } else if (c === '}') {
      stack.pop().end = i + 1;
      seg = i + 1;
    } else if (c === ';') seg = i + 1;
  }
  return root;
}

// 감싸지 않은 :hover 규칙(감싼 규칙 안의 규칙은 보지 않음)
function unguarded(node, guarded = false, out = []) {
  for (const n of node.children) {
    const g = guarded || (n.prelude.startsWith('@') && GUARD.test(n.prelude));
    if (!g && !n.prelude.startsWith('@') && n.prelude.includes(':hover')) out.push(n);
    else unguarded(n, g, out);
  }
  return out;
}

// 괄호 밖 쉼표로 선택자 나누기(:not(a, b) 는 한 덩어리)
function splitSelectors(s) {
  const out = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') depth--;
    else if (s[i] === ',' && depth === 0) {
      out.push(s.slice(from, i).trim());
      from = i + 1;
    }
  }
  out.push(s.slice(from).trim());
  return out;
}

const lineOf = (css, at) => css.slice(0, at).split('\n').length;

export function checkHover() {
  const errors = [];
  for (const dir of DIRS) {
    for (const file of walk(join(ROOT, dir))) {
      const css = readFileSync(file, 'utf8');
      for (const n of unguarded(tree(css))) errors.push(`${relative(ROOT, file).replaceAll('\\', '/')}:${lineOf(css, n.start)} ${n.prelude.replace(/\s+/g, ' ')}`);
    }
  }
  return errors;
}

function fix(file) {
  let css = readFileSync(file, 'utf8');
  const list = unguarded(tree(css)).sort((a, b) => b.start - a.start);
  for (const n of list) {
    const indent = css.slice(css.lastIndexOf('\n', n.start - 1) + 1, n.start);
    const body = css.slice(css.indexOf('{', n.start), n.end);
    const sels = splitSelectors(n.prelude);
    const hover = sels.filter((s) => s.includes(':hover'));
    const rest = sels.filter((s) => !s.includes(':hover'));
    const wrapped = `${hover.join(`,\n${indent}  `)} ${body}`.replaceAll('\n', '\n  ');
    const media = `@media (hover: hover) {\n${indent}  ${wrapped}\n${indent}}`;
    const next = rest.length ? `${rest.join(`,\n${indent}`)} ${body}\n${indent}${media}` : media;
    css = css.slice(0, n.start) + next + css.slice(n.end);
  }
  if (list.length) writeFileSync(file, css);
  return list.length;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--fix')) {
    for (const dir of DIRS) for (const file of walk(join(ROOT, dir))) {
      const n = fix(file);
      if (n) console.log(`${relative(ROOT, file)}: ${n}개 감쌈`);
    }
  }
  const errors = checkHover();
  console.log(errors.length ? `감싸지 않은 :hover ${errors.length}개:\n- ${errors.join('\n- ')}` : ':hover 검사 통과');
  if (errors.length) process.exit(1);
}
