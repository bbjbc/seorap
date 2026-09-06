// 코드 블록 하나. 오른쪽 위에 지금 언어가 보이고, 눌러서 바꿀 수 있다.
// 머리줄은 contentEditable={false} 라 문서 내용이 아니다. 마크다운으로 저장될 때는
// 울타리의 언어 이름(```ts)으로만 남고 이 UI 자체는 아무것도 남기지 않는다.
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import {
  NodeViewContent,
  type NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from '@tiptap/react';
import { useT } from '../../lib/i18n';
import {
  canonicalLanguage,
  LANGUAGES,
  languageLabel,
  lowlight,
} from './highlight';

const CodeBlockView = ({ node, updateAttributes, editor }: NodeViewProps) => {
  const t = useT();
  const raw: unknown = node.attrs['language'];
  const language = typeof raw === 'string' ? raw : '';
  // ```ts 처럼 줄임말로 적혀 있어도 목록의 TypeScript 와 같은 것으로 본다.
  const canonical = canonicalLanguage(language) ?? '';
  // 언어를 안 정했으면 lowlight 가 알아서 맞춰 본다. 그 사실을 그대로 알려 준다.
  const shown = languageLabel(language) ?? t('code.auto');

  return (
    <NodeViewWrapper className="code-block">
      <div className="code-head" contentEditable={false}>
        <span className="code-lang">{shown}</span>
        <select
          className="code-lang-pick"
          value={canonical}
          title={t('code.pick_language')}
          disabled={!editor.isEditable}
          onChange={(e) => {
            updateAttributes({ language: e.target.value });
          }}
        >
          <option value="">{t('code.auto')}</option>
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
      <pre>
        {/* NodeView 가 그리므로 확장의 renderHTML 이 안 돈다. 강조용 클래스는 여기서 붙인다. */}
        <NodeViewContent<'code'>
          as="code"
          className={language ? `language-${language}` : undefined}
        />
      </pre>
    </NodeViewWrapper>
  );
};

/** 문법 강조 + 언어 선택이 붙은 코드 블록. */
export const CodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
}).configure({ lowlight });
