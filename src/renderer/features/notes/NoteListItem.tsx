import { useEffect, useRef } from 'react';
import { IconPin } from '../../components/icons';
import { api } from '../../lib/api';
import { firstLineOf, fmtTime } from '../../lib/format';
import { useLang, useT } from '../../lib/i18n';
import type { Item } from '../../stores/items';
import { openNote } from './actions';
import { NOTE_DRAG_MIME } from './drag';

interface Props {
  item: Item;
  active: boolean;
  draggable: boolean;
  dragging: boolean;
  dropMark: 'before' | 'after' | null;
  onDragStart: (id: string) => void;
}

export const NoteListItem = ({ item: it, active, draggable, dragging, dropMark, onDragStart }: Props) => {
  const t = useT();
  const lang = useLang();
  const ref = useRef<HTMLDivElement | null>(null);
  // 열린 메모가 바뀌면 그 줄이 보이게 스크롤한다.
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const txt = (it.text ?? '').trim();
  const first = firstLineOf(txt);
  const snip = txt.slice(first.length).trim().replace(/\s+/g, ' ').slice(0, 80);
  const cls = ['note-item', active && 'active', dragging && 'dragging', dropMark && `drop-${dropMark}`].filter(Boolean).join(' ');

  return (
    <div
      ref={ref}
      className={cls}
      data-id={it.id}
      draggable={draggable}
      onClick={() => openNote(it.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        void api.contextMenu([it.id]);
      }}
      onDragStart={(e) => {
        if (!draggable) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData(NOTE_DRAG_MIME, it.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(it.id);
      }}
    >
      <div className={`n-title${first ? '' : ' untitled'}`}>
        {it.pinned && <IconPin />}
        <span>{first || t('common.new_note')}</span>
      </div>
      <div className="n-sub">
        <span className="n-snip">{snip || (first ? '' : t('notes.no_content'))}</span>
        <span className="n-time">{fmtTime(it.updatedAt ?? it.createdAt, lang)}</span>
      </div>
      {it.tags.length > 0 && (
        <div className="n-tags">
          {it.tags.map((x) => (
            <span key={x}>{x}</span>
          ))}
        </div>
      )}
    </div>
  );
};
