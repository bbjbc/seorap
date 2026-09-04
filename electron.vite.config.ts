// 빌드 설정. main / preload / renderer 세 갈래를 한 번에 번들한다 (out/main, out/preload, out/renderer).
// scripts/*.ts 도 main 쪽 진입점으로 같이 번들해서 src/main/* 과 같은 청크를 공유한다.
// (따로 컴파일하면 Vault 같은 클래스가 두 벌 생겨 instanceof 와 i18n 상태가 어긋난다.)
import { defineConfig } from 'electron-vite';
import type { Plugin } from 'vite';
import { resolve } from 'path';

/**
 * 개발 서버에서만 CSP 를 완화한다. Vite HMR 클라이언트는 inline script 와 ws 연결이 필요하다.
 * 프로덕션 빌드(loadFile)에서는 index.html 의 `script-src 'self'` 가 그대로 남는다.
 */
function devCsp(): Plugin {
  return {
    name: 'seorap:dev-csp',
    apply: 'serve',
    transformIndexHtml(html) {
      return html
        .replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
        .replace("default-src 'self'", "default-src 'self' ws://localhost:* http://localhost:*");
    },
  };
}

export default defineConfig({
  main: {
    build: {
      externalizeDeps: true,
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/main.ts'),
          'dev-functional': resolve(__dirname, 'scripts/dev-functional.ts'),
          'debug-shots': resolve(__dirname, 'scripts/debug-shots.ts'),
          'gen-icons': resolve(__dirname, 'scripts/gen-icons.ts'),
          'run-tests': resolve(__dirname, 'scripts/run-tests.ts'),
        },
      },
    },
  },
  preload: {
    build: {
      externalizeDeps: true,
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
          toast: resolve(__dirname, 'src/preload/toast.ts'),
        },
      },
    },
  },
  renderer: {
    plugins: [devCsp()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
          toast: resolve(__dirname, 'src/renderer/toast/toast.html'),
        },
      },
    },
  },
});
