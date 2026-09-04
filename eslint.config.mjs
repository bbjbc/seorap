// ESLint 설정. 도구 설정 파일이라 JS(ESM)로 둔다.
import tseslint from 'typescript-eslint';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['out/**', 'dist/**', 'node_modules/**', 'eslint.config.mjs'] },
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // 'any' 금지: 명시적으로도, 추론으로도.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',

      // 프로젝트 취향
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true, allowBoolean: true }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { arguments: false, attributes: false } }],
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
    files: ['src/main/**/*.ts', 'src/preload/**/*.ts', 'scripts/**/*.ts', 'tests/**/*.ts', 'vitest.config.mts', 'electron.vite.config.ts'],
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
);
