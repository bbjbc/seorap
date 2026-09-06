// 위지위그 편집기. 저장되는 정본은 여전히 마크다운 문자열(item.text)이고, Tiptap 은
// 그걸 파싱해 그린 뒤 편집 결과를 다시 마크다운으로 직렬화해 돌려준다. 그래서 검색·제목·
// 중복 판정처럼 item.text 를 보는 기존 코드는 이 편집기를 몰라도 그대로 동작한다.
import FindAndReplace from '@tiptap/extension-find-and-replace';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from '@tiptap/markdown';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';
import { useT } from '../../lib/i18n';
import { editNoteText } from './actions';
import { CodeBlock } from './CodeBlock';
import { onEditorTextChanged } from './find';
import { mdEditorHandle } from './handles';
import { insertPastedFiles } from './images';
import { keepMarkdownTextLiteral } from './markdown-text';
import { SlashMenu } from './slash';

interface Props {
  /** 마크다운 원문. 편집기를 처음 세울 때만 읽는다 (이후 정본은 편집기 안에 있다). */
  text: string;
}

export const MarkdownEditor = ({ text }: Props) => {
  const t = useT();
  const editor = useEditor({
    // 렌더러가 그리기 전에 DOM 을 만들어 두면 첫 프레임에서 깜빡이지 않는다.
    immediatelyRender: false,
    extensions: [
      // 코드 블록만 문법 강조가 되는 것으로 갈아 끼운다. 나머지는 StarterKit 그대로.
      StarterKit.configure({ codeBlock: false }),
      CodeBlock,
      Markdown,
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: t('notes.editor_ph') }),
      // 하이라이트 색은 앱 테마를 따라야 하므로 확장이 넣는 기본 CSS 는 끈다.
      FindAndReplace.configure({ injectCSS: false, searchDebounceMs: 0 }),
      SlashMenu,
    ],
    content: text,
    contentType: 'markdown',
    editorProps: {
      attributes: { id: 'mdEditor', class: 'md-editor' },
      handlePaste: (_view, event) => insertPastedFiles(event.clipboardData),
      handleDrop: (_view, event) => {
        if (!(event instanceof DragEvent)) return false;
        if (!insertPastedFiles(event.dataTransfer)) return false;
        // 창 전체 드롭 핸들러(app/drop.ts)까지 올라가면 같은 이미지를 한 번 더 저장하려 든다.
        event.preventDefault();
        event.stopPropagation();
        return true;
      },
    },
    // 첫 직렬화(onUpdate)보다 먼저 걸어야 한다.
    onCreate: ({ editor: ed }) => {
      keepMarkdownTextLiteral(ed);
    },
    onUpdate: ({ editor: ed }) => {
      editNoteText(ed.getMarkdown());
    },
  });

  // 찾기와 포커스가 편집기 인스턴스를 직접 만져야 한다.
  useEffect(() => {
    mdEditorHandle.attach(editor ?? null);
    return () => {
      mdEditorHandle.attach(null);
    };
  }, [editor]);

  // 편집기가 준비되면 열려 있던 검색어를 다시 적용한다.
  useEffect(() => {
    if (editor) onEditorTextChanged();
  }, [editor]);

  return <EditorContent className="md-editor-wrap" editor={editor} />;
};
