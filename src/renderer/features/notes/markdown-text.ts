// @tiptap/markdown(3.31.3)은 텍스트 노드를 직렬화할 때 & < > 를 HTML 엔티티로 바꾼다
// (@tiptap/core 의 encodeHtmlEntities). 그래서 본문에 "a -> b" 라고 적으면 파일에는
// "a -&gt; b" 가 저장되고, 순수 텍스트 모드로 열면 그 깨진 글자가 그대로 보인다.
// 우리 메모는 HTML 이 아니라 사람이 읽고 다른 편집기로도 여는 마크다운 파일이라 그러면 안 된다.
//
// 옵션으로 끌 수 없어서(private 메서드) 직렬화 직전 단계를 감싼다. 출력 전체를 되돌리면
// 코드 블록 안에 일부러 적은 &lt; 까지 < 로 바꿔 버리므로 텍스트 노드 단위로 되돌려야 한다.
// 원본은 코드 블록·인라인 코드 안에서는 글자를 그대로 돌려주니, 반환값이 입력과 달라졌을
// 때만 되돌리면 코드 안은 건드리지 않는다.
//
// 확장이 이 동작을 고치면 이 파일은 지워도 된다.
import { decodeHtmlEntities, type Editor } from '@tiptap/core';

type Encoder = (text: string, node: unknown, parent: unknown) => string;

export function keepMarkdownTextLiteral(editor: Editor): void {
  const mm = editor.markdown as unknown as
    | { encodeTextForMarkdown?: Encoder }
    | undefined;
  const original = mm?.encodeTextForMarkdown;
  // 확장 구조가 바뀌면 조용히 손대지 않는다. 깨진 채로 두는 편이 터지는 것보다 낫다.
  if (!mm || typeof original !== 'function') return;
  mm.encodeTextForMarkdown = (text, node, parent) => {
    const out = original.call(mm, text, node, parent);
    return out === text ? out : decodeHtmlEntities(out);
  };
}
