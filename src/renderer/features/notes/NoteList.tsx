// 메모 목록. 최신순이면 날짜 그룹으로, 직접 정렬이면 끌어서 순서를 바꿀 수 있다.
import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { RichText } from '../../components/RichText';
import { useLang, useT } from '../../lib/i18n';
import { useItemsStore } from '../../stores/items';
import { useNotesStore } from '../../stores/notes';
import { saveSettings, useSettings } from '../../stores/settings';
import { moveNote } from './actions';
import { isNoteDrag } from './drag';
import { NoteListItem } from './NoteListItem';
import { noteItems, noteRows } from './selectors';

interface DragState {
  id: string;
  over: string | null;
  after: boolean;
}

interface Props {
  active: boolean;
  onCount: (n: number) => void;
}

export const NoteList = ({ active, onCount }: Props) => {
  const t = useT();
  const lang = useLang();
  const items = useItemsStore((s) => s.items);
  const settings = useSettings();
  const { query, noteId } = useNotesStore(
    useShallow((s) => ({ query: s.query, noteId: s.noteId })),
  );
  const sort = settings?.notes.sort ?? 'recent';
  const showClipboardText = settings?.notes.showClipboardText ?? false;
  const manual = sort === 'manual';

  // 숨겨진 동안에는 목록을 계산하지 않는다 (예전 렌더러의 "모드가 아니면 그리지 않는다"와 같다).
  const list = useMemo(
    () =>
      active
        ? noteItems(items, { query, noteId, showClipboardText, sort })
        : [],
    [active, items, query, noteId, showClipboardText, sort],
  );
  const rows = useMemo(
    () => noteRows(list, manual, lang),
    [list, manual, lang],
  );
  useEffect(() => onCount(list.length), [list.length, onCount]);

  const [drag, setDrag] = useState<DragState | null>(null);
  const canDrag = !query.trim();

  const onDragOver = (e: React.DragEvent): void => {
    if (!drag || !isNoteDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    const row =
      e.target instanceof Element
        ? e.target.closest<HTMLElement>('.note-item')
        : null;
    const id = row?.dataset['id'];
    if (!row || !id || id === drag.id) {
      if (drag.over !== null) setDrag({ ...drag, over: null });
      return;
    }
    const r = row.getBoundingClientRect();
    const after = e.clientY > r.top + r.height / 2;
    if (id !== drag.over || after !== drag.after)
      setDrag({ ...drag, over: id, after });
  };
  const onDrop = (e: React.DragEvent): void => {
    if (!drag || !isNoteDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    const { id, over, after } = drag;
    setDrag(null);
    if (!over || over === id) return;
    void moveNote(id, over, after);
  };

  return (
    <div
      className={`notelist${manual ? ' manual' : ''}`}
      id="noteList"
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={() => setDrag(null)}
    >
      {!list.length ? (
        <div className="none">
          <RichText
            text={query ? t('notes.no_result') : t('notes.empty_list')}
          />
        </div>
      ) : (
        <>
          {manual && (
            <div className="sort-hint">
              <span>{t('notes.sort_hint')}</span>
              <button
                type="button"
                id="sortReset"
                onClick={() => void saveSettings({ notes: { sort: 'recent' } })}
              >
                {t('notes.sort_reset')}
              </button>
            </div>
          )}
          {rows.map((row) =>
            row.kind === 'group' ? (
              <div key={`g:${row.label}`} className="group">
                {row.label}
              </div>
            ) : (
              <NoteListItem
                key={row.item.id}
                item={row.item}
                active={row.item.id === noteId}
                draggable={canDrag}
                dragging={drag?.id === row.item.id}
                dropMark={
                  drag?.over === row.item.id
                    ? drag.after
                      ? 'after'
                      : 'before'
                    : null
                }
                onDragStart={(id) => setDrag({ id, over: null, after: false })}
              />
            ),
          )}
        </>
      )}
    </div>
  );
};
