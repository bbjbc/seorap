// 위지위그 편집기에서 '/' 를 치면 뜨는 블록 삽입 메뉴.
// 팝업은 React 밖에서 DOM 으로 직접 만든다. 편집기 안에 그리면 ProseMirror 문서에
// 끼어들고, 포털로 올리면 편집기의 선택 상태를 잃기 쉬워서다.
import { type Editor, Extension, type Range } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { t } from '../../lib/i18n';
import { pickAndInsertImages } from './images';

interface SlashItem {
  label: string;
  /** 검색어와 맞춰 볼 말. 한글 라벨과 영문 별칭을 같이 담는다. */
  terms: string;
  hint: string;
  run: (editor: Editor, range: Range) => void;
}

const at = (editor: Editor, range: Range) =>
  editor.chain().focus().deleteRange(range);

function items(): SlashItem[] {
  return [
    {
      label: t('slash.h1'),
      terms: `${t('slash.h1')} h1 heading title`,
      hint: '#',
      run: (e, r) => at(e, r).setNode('heading', { level: 1 }).run(),
    },
    {
      label: t('slash.h2'),
      terms: `${t('slash.h2')} h2 heading`,
      hint: '##',
      run: (e, r) => at(e, r).setNode('heading', { level: 2 }).run(),
    },
    {
      label: t('slash.h3'),
      terms: `${t('slash.h3')} h3 heading`,
      hint: '###',
      run: (e, r) => at(e, r).setNode('heading', { level: 3 }).run(),
    },
    {
      label: t('slash.bullet'),
      terms: `${t('slash.bullet')} bullet list ul`,
      hint: '-',
      run: (e, r) => at(e, r).toggleBulletList().run(),
    },
    {
      label: t('slash.ordered'),
      terms: `${t('slash.ordered')} ordered numbered list ol`,
      hint: '1.',
      run: (e, r) => at(e, r).toggleOrderedList().run(),
    },
    {
      label: t('slash.quote'),
      terms: `${t('slash.quote')} quote blockquote`,
      hint: '>',
      run: (e, r) => at(e, r).toggleBlockquote().run(),
    },
    {
      label: t('slash.code'),
      terms: `${t('slash.code')} code block pre`,
      hint: '```',
      run: (e, r) => at(e, r).toggleCodeBlock().run(),
    },
    {
      label: t('slash.divider'),
      terms: `${t('slash.divider')} divider rule hr`,
      hint: '---',
      run: (e, r) => at(e, r).setHorizontalRule().run(),
    },
    {
      label: t('slash.image'),
      terms: `${t('slash.image')} image picture photo`,
      hint: '',
      run: (e, r) => {
        at(e, r).run();
        pickAndInsertImages();
      },
    },
  ];
}

/** 떠 있는 목록 하나. 만들고 → 위치·내용 갱신 → 지우기. */
class Popup {
  private readonly el = document.createElement('div');
  private rows: HTMLButtonElement[] = [];
  private list: SlashItem[] = [];
  private index = 0;
  private pick: ((item: SlashItem) => void) | null = null;

  constructor() {
    this.el.className = 'slash-menu';
    document.body.appendChild(this.el);
  }

  update(
    list: SlashItem[],
    rect: DOMRect | null,
    pick: (item: SlashItem) => void,
  ): void {
    this.list = list;
    this.pick = pick;
    if (this.index >= list.length) this.index = 0;
    if (!list.length) {
      this.el.hidden = true;
      return;
    }
    this.el.hidden = false;
    this.el.replaceChildren();
    this.rows = list.map((item, i) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'slash-row';
      const label = document.createElement('span');
      label.textContent = item.label;
      const hint = document.createElement('span');
      hint.className = 'slash-hint';
      hint.textContent = item.hint;
      row.append(label, hint);
      // mousedown 을 막지 않으면 편집기가 포커스를 잃어 range 가 어긋난다.
      row.addEventListener('mousedown', (e) => e.preventDefault());
      row.addEventListener('click', () => this.pick?.(item));
      row.addEventListener('mouseenter', () => this.select(i));
      this.el.appendChild(row);
      return row;
    });
    this.select(this.index);
    this.place(rect);
  }

  private place(rect: DOMRect | null): void {
    if (!rect) return;
    const h = this.el.offsetHeight;
    const below = window.innerHeight - rect.bottom;
    // 아래가 좁으면 커서 위로 띄운다.
    const top = below < h + 12 ? rect.top - h - 6 : rect.bottom + 6;
    this.el.style.top = `${Math.max(8, top)}px`;
    this.el.style.left = `${Math.min(rect.left, window.innerWidth - this.el.offsetWidth - 8)}px`;
  }

  private select(i: number): void {
    this.index = i;
    this.rows.forEach((r, n) => {
      r.classList.toggle('on', n === i);
    });
    this.rows[i]?.scrollIntoView({ block: 'nearest' });
  }

  onKeyDown(key: string): boolean {
    if (this.el.hidden || !this.list.length) return false;
    if (key === 'ArrowDown') {
      this.select((this.index + 1) % this.list.length);
      return true;
    }
    if (key === 'ArrowUp') {
      this.select((this.index - 1 + this.list.length) % this.list.length);
      return true;
    }
    if (key === 'Enter') {
      const item = this.list[this.index];
      if (item) this.pick?.(item);
      return true;
    }
    return false;
  }

  destroy(): void {
    this.el.remove();
  }
}

export const SlashMenu = Extension.create({
  name: 'slashMenu',
  addProseMirrorPlugins() {
    return [
      // 두 번째 인자는 command 로 넘어오는 props 의 타입이다. 비워 두면 any 가 된다.
      Suggestion<SlashItem, SlashItem>({
        editor: this.editor,
        char: '/',
        // 줄 맨 앞에서만. 글 중간의 날짜(2024/01)나 경로에는 뜨지 않는다.
        startOfLine: true,
        items: ({ query }) => {
          const q = query.trim().toLowerCase();
          return items().filter((i) => i.terms.toLowerCase().includes(q));
        },
        command: ({ editor, range, props }) => props.run(editor, range),
        render: () => {
          let popup: Popup | null = null;
          return {
            onStart: (props) => {
              popup = new Popup();
              popup.update(props.items, props.clientRect?.() ?? null, (item) =>
                props.command(item),
              );
            },
            onUpdate: (props) => {
              popup?.update(props.items, props.clientRect?.() ?? null, (item) =>
                props.command(item),
              );
            },
            onKeyDown: (props) => {
              if (props.event.key === 'Escape') {
                popup?.destroy();
                popup = null;
                return true;
              }
              return popup?.onKeyDown(props.event.key) ?? false;
            },
            onExit: () => {
              popup?.destroy();
              popup = null;
            },
          };
        },
      }),
    ];
  },
});
