// ESLint 설정. 도구 설정 파일이라 JS(ESM)로 둔다.
// 역할 분담: 포맷·import 정렬·타입이 필요 없는 린트는 Biome(biome.json)가 맡는다.
// 여기에는 tsconfig 를 읽어야 하는 타입 인지 규칙과 React Compiler 규칙만 남긴다.
// eslint-config-biome 이 Biome 가 대신하는 규칙을 꺼서 같은 지적이 두 번 나오지 않게 한다.

import biome from 'eslint-config-biome';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['out/**', 'dist/**', 'node_modules/**', 'eslint.config.mjs'] },
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // 'any' 금지. 명시적 any(no-explicit-any)는 Biome 가 잡고, 추론으로 새는 any 는 여기서 잡는다.
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',

      // 프로젝트 취향
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true },
      ],
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { arguments: false, attributes: false } },
      ],
      // $<T>(sel) 같은 "반환 타입만 고르는" 제네릭 헬퍼를 허용한다.
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
    },
  },
  {
    // IPC 채널 맵에서 결과 없음을 void 로 표기한다.
    files: ['src/shared/types.d.ts'],
    rules: { '@typescript-eslint/no-invalid-void-type': 'off' },
  },
  {
    files: [
      'src/main/**/*.ts',
      'src/preload/**/*.ts',
      'scripts/**/*.ts',
      'tests/**/*.ts',
      'vitest.config.mts',
      'electron.vite.config.ts',
    ],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['src/renderer/**/*.tsx'],
    ...reactHooks.configs.flat['recommended-latest'],
  },
  {
    // vi.mocked(obj.method) 가 Vitest 의 관용구라 unbound-method 와 맞지 않는다.
    files: ['tests/**/*.ts'],
    rules: { '@typescript-eslint/unbound-method': 'off' },
  },
  // 마지막에 두어 Biome 와 겹치는 규칙을 끈다 (미사용 변수, no-explicit-any, 훅 의존성 배열 등).
  biome,
);
