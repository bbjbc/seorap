// 코드 블록 문법 강조에 쓸 언어 목록.
// highlight.js 전체(200여 개)를 담으면 번들이 몇 MB 늘어난다. 메모에 실제로 붙여 넣게 되는
// 것만 골라 개별로 가져오면 Rollup 이 나머지를 털어낸다. 언어를 더하려면 GRAMMARS 에 한 줄
// 추가하면 강조와 선택 목록에 동시에 반영된다.

import type { LanguageFn } from 'highlight.js';
import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import go from 'highlight.js/lib/languages/go';
import ini from 'highlight.js/lib/languages/ini';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import markdown from 'highlight.js/lib/languages/markdown';
import php from 'highlight.js/lib/languages/php';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import swift from 'highlight.js/lib/languages/swift';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { createLowlight } from 'lowlight';

/**
 * 키는 마크다운 울타리에 그대로 쓰이는 이름(```ts 의 ts)이고, label 은 드롭다운에 보일 이름.
 * xml 은 HTML 을, javascript/typescript 는 JSX/TSX 를, ini 는 TOML 을 함께 맡는다.
 */
interface Grammar {
  fn: LanguageFn;
  label: string;
  /** 울타리에 흔히 적는 줄임말. ```ts 처럼 적어도 TypeScript 로 알아본다. */
  aliases?: string[];
}

const GRAMMARS: Record<string, Grammar> = {
  bash: { fn: bash, label: 'Bash / Shell', aliases: ['sh', 'shell', 'zsh'] },
  c: { fn: c, label: 'C', aliases: ['h'] },
  cpp: { fn: cpp, label: 'C++', aliases: ['c++', 'cc', 'hpp'] },
  csharp: { fn: csharp, label: 'C#', aliases: ['cs', 'c#'] },
  css: { fn: css, label: 'CSS' },
  diff: { fn: diff, label: 'Diff', aliases: ['patch'] },
  dockerfile: { fn: dockerfile, label: 'Dockerfile', aliases: ['docker'] },
  go: { fn: go, label: 'Go', aliases: ['golang'] },
  ini: { fn: ini, label: 'INI / TOML', aliases: ['toml'] },
  java: { fn: java, label: 'Java' },
  javascript: {
    fn: javascript,
    label: 'JavaScript',
    aliases: ['js', 'jsx', 'mjs', 'cjs'],
  },
  json: { fn: json, label: 'JSON', aliases: ['jsonc'] },
  kotlin: { fn: kotlin, label: 'Kotlin', aliases: ['kt'] },
  markdown: { fn: markdown, label: 'Markdown', aliases: ['md'] },
  php: { fn: php, label: 'PHP' },
  python: { fn: python, label: 'Python', aliases: ['py'] },
  rust: { fn: rust, label: 'Rust', aliases: ['rs'] },
  sql: { fn: sql, label: 'SQL' },
  swift: { fn: swift, label: 'Swift' },
  typescript: {
    fn: typescript,
    label: 'TypeScript',
    aliases: ['ts', 'tsx', 'mts', 'cts'],
  },
  xml: { fn: xml, label: 'HTML / XML', aliases: ['html', 'xhtml', 'svg'] },
  yaml: { fn: yaml, label: 'YAML', aliases: ['yml'] },
};

/** 별칭·정식 이름을 모두 정식 이름으로 모으는 색인. */
const CANONICAL = new Map<string, string>();
for (const [key, g] of Object.entries(GRAMMARS)) {
  CANONICAL.set(key, key);
  for (const a of g.aliases ?? []) CANONICAL.set(a, key);
}

export const lowlight = createLowlight(
  Object.fromEntries(Object.entries(GRAMMARS).map(([k, v]) => [k, v.fn])),
);

export interface LanguageOption {
  value: string;
  label: string;
}

/** 드롭다운에 넣을 목록. 보이는 이름 순으로 정렬한다. */
export const LANGUAGES: LanguageOption[] = Object.entries(GRAMMARS)
  .map(([value, v]) => ({ value, label: v.label }))
  .sort((a, b) => a.label.localeCompare(b.label));

/** 울타리에 적힌 이름(별칭 포함)을 정식 이름으로. 모르는 언어면 null. */
export function canonicalLanguage(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  return CANONICAL.get(value.toLowerCase()) ?? null;
}

/** 울타리에 적힌 이름을 보이는 이름으로. 모르는 언어면 적힌 그대로 보여 준다. */
export function languageLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const key = canonicalLanguage(value);
  return key ? (GRAMMARS[key]?.label ?? key) : value;
}
