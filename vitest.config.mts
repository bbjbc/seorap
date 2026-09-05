// 단위 테스트 설정. Electron 을 띄우지 않는 순수 로직만 여기서 돈다.
// 창·클립보드·IPC 를 실제로 쓰는 기능 테스트는 scripts/dev-functional.ts (npm run test:e2e).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    environment: 'node',
    // electron 모듈은 각 테스트가 vi.mock 으로 대체한다. 실수로 진짜를 불러오면 바로 실패하게 둔다.
    clearMocks: true,
  },
});
