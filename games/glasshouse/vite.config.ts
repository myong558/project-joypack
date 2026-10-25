import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

// 설정 팝업에 보여 줄 버전(package.json의 vX.Y.Z)
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

/**
 * 조이팩 안에서는 앱 설치·오프라인을 조이팩이 맡는다(manifest·서비스 워커는 사이트 루트).
 * 게임 페이지에서도 조이팩 앱으로 설치되도록 루트 manifest를 가리킨다. 빌드 대상 밖 파일이라 Vite 처리 뒤에 넣는다
 */
const joypackManifest: Plugin = {
  name: 'joypack-manifest',
  transformIndexHtml: {
    order: 'post',
    handler: () => [{ tag: 'link', attrs: { rel: 'manifest', href: '../../manifest.webmanifest' }, injectTo: 'head' }],
  },
};

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  server: { port: 5176, open: false },
  plugins: [joypackManifest],
});
