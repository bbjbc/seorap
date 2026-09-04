// 메모 목록에 보일 항목과 그룹 헤더. 정렬 방식은 설정(notes.sort)을 따른다.
import type { Lang } from '../../../shared/locales';
import { lookup } from '../../../shared/locales';
import { groupOf } from '../../lib/format';
import type { Item } from '../../stores/items';

export interface NoteFilter {
  query: string;
  /** 열려 있는 메모는 클립보드 글이라도 목록에 남긴다. */
  noteId: string | null;
  showClipboardText: boolean;
  sort: Seorap.NoteSort;
}

const recent = (a: Item, b: Item): number => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt);

export function noteItems(items: readonly Item[], f: NoteFilter): Item[] {
  const q = f.query.trim().toLowerCase();
  const list = items.filter(
    (it) => it.type === 'text' && (f.showClipboardText || it.note || it.id === f.noteId) && (!q || (it.text ?? '').toLowerCase().includes(q)),
  );
  if (f.sort === 'manual') {
    // 순서가 없는(새) 메모는 맨 위에 최신순으로, 나머지는 사용자가 정한 순서대로.
    list.sort((a, b) => {
      if (a.order === undefined && b.order === undefined) return recent(a, b);
      if (a.order === undefined) return -1;
      if (b.order === undefined) return 1;
      return a.order - b.order;
    });
  } else list.sort((a, b) => Number(b.pinned) - Number(a.pinned) || recent(a, b));
  return list;
}

export type NoteRow = { kind: 'group'; label: string } | { kind: 'note'; item: Item };

/** 최신순일 때만 날짜 그룹 헤더를 끼워 넣는다. 직접 정렬에서는 헤더가 없다. */
export function noteRows(list: readonly Item[], manual: boolean, lang: Lang): NoteRow[] {
  const rows: NoteRow[] = [];
  let lastGroup: string | null = null;
  for (const it of list) {
    if (!manual) {
      const g = it.pinned ? lookup(lang, 'notes.group_pinned') : groupOf(it.updatedAt ?? it.createdAt, lang);
      if (g !== lastGroup) {
        rows.push({ kind: 'group', label: g });
        lastGroup = g;
      }
    }
    rows.push({ kind: 'note', item: it });
  }
  return rows;
}
