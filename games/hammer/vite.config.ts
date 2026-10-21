import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// 설정 팝업에 보여 줄 버전(package.json의 vX.Y.Z)
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  server: { port: 5173, open: false },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: '두더지잡기',
        short_name: '두더지잡기',
        description: '브라우저에서 바로 즐기는 두더지 잡기 게임',
        lang: 'ko',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#ff7a3d',
        background_color: '#f4efe6',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff2,mp3,ogg,wav}'],
        // 링크 미리보기 이미지는 게임에서 쓰지 않으니 오프라인 캐시에 넣지 않는다
        globIgnores: ['og-image.png'],
      },
      devOptions: { enabled: true },
    }),
  ],
});
