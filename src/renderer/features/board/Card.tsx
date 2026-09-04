// 보드 카드 하나. 클릭 동작은 설정(board.clickAction)을 따르고, Ctrl/Shift 로 여러 개를 고른다.
import { useEffect, useState } from 'react';
import { IconClose, IconCopy, IconPin } from '../../components/icons';
import { api } from '../../lib/api';
import { firstLineOf, fmtSize, fmtTime, hostOf } from '../../lib/format';
import { useLang, useT } from '../../lib/i18n';
import { useBoardStore } from '../../stores/board';
import type { Item } from '../../stores/items';
import { useSettingsStore } from '../../stores/settings';
import { openAny, softDelete, togglePin } from '../items/actions';
import { copyCard, rangeSelectTo } from './actions';

const COPIED_MS = 900;

interface Props {
  item: Item;
  selected: boolean;
  /** 0 이 아니면 그 값이 바뀔 때마다 "복사됨" 애니메이션을 한 번 재생 */
  copySeq: number;
}

export const Card = ({ item: it, selected, copySeq }: Props) => {
  const t = useT();
  const lang = useLang();
  // copySeq 가 바뀌면 덧씌우기를 보이고, 잠시 뒤 그 seq 를 "지난 것"으로 기록해 숨긴다.
  const [dismissedSeq, setDismissedSeq] = useState(0);
  useEffect(() => {
    if (!copySeq) return;
    const id = window.setTimeout(() => setDismissedSeq(copySeq), COPIED_MS);
    return () => clearTimeout(id);
  }, [copySeq]);
  const copied = copySeq !== 0 && copySeq !== dismissedSeq;

  const onClick = (e: React.MouseEvent): void => {
    const board = useBoardStore.getState();
    if (e.ctrlKey || e.metaKey) {
      board.toggleSelect(it.id);
      return;
    }
    if (e.shiftKey && board.selected.size) {
      rangeSelectTo(it.id);
      return;
    }
    board.selectOnly(it.id);
    const action = useSettingsStore.getState().settings?.board.clickAction ?? 'copy';
    if (action === 'copy') void copyCard(it.id);
    else openAny(it.id);
  };
  const onContextMenu = (e: React.MouseEvent): void => {
    e.preventDefault();
    const board = useBoardStore.getState();
    if (!board.selected.has(it.id)) board.selectOnly(it.id);
    void api.contextMenu([...useBoardStore.getState().selected]);
  };
  const onDragStart = (e: React.DragEvent): void => {
    // 브라우저 드래그 대신 OS 드래그(파일)로 넘긴다.
    e.preventDefault();
    const board = useBoardStore.getState();
    if (!board.selected.has(it.id)) board.selectOnly(it.id);
    api.startDrag([...useBoardStore.getState().selected]);
  };
  const stop = (e: React.MouseEvent, fn: () => void): void => {
    e.stopPropagation();
    fn();
  };

  const dim = it.type === 'image' && it.width ? `${it.width}×${it.height ?? '?'}` : fmtSize(it.size);

  return (
    <div
      className={`card type-${it.type}${it.pinned ? ' pinned' : ''}${selected ? ' selected' : ''}`}
      data-id={it.id}
      draggable
      title={it.type === 'text' ? t('board.card_tip_text') : t('board.card_tip')}
      onClick={onClick}
      onDoubleClick={() => openAny(it.id)}
      onContextMenu={onContextMenu}
      onDragStart={onDragStart}
    >
      <CardBody item={it} />
      <div className="card-meta">
        <span>{fmtTime(it.createdAt, lang)}</span>
        {it.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="tag" data-tag={tag} onClick={(e) => stop(e, () => useBoardStore.getState().toggleTag(tag))}>
            {tag}
          </span>
        ))}
        <span className="dim">{dim}</span>
      </div>
      <span className="pin">
        <IconPin />
      </span>
      <div className="card-actions">
        <button type="button" className="act-pin" title={it.pinned ? t('common.unpin') : t('common.pin')} onClick={(e) => stop(e, () => void togglePin([it.id]))}>
          <IconPin />
        </button>
        <button type="button" className="act-copy" title={t('common.copy')} onClick={(e) => stop(e, () => void copyCard(it.id))}>
          <IconCopy />
        </button>
        <button type="button" className="del" title={t('common.delete')} onClick={(e) => stop(e, () => softDelete([it.id]))}>
          <IconClose />
        </button>
      </div>
      {copied && (
        <span key={copySeq} className="copied">
          {t('board.copied_overlay')}
        </span>
      )}
    </div>
  );
};

const CardBody = ({ item: it }: { item: Item }) => {
  const t = useT();
  switch (it.type) {
    case 'image': {
      const src = it.thumbUrl ?? it.fileUrl;
      return (
        <div className={`card-media${it.thumbUrl ? '' : ' contain'}`}>
          {src ? <img src={src} decoding="async" alt="" /> : <div className="noimg">{t('board.no_preview')}</div>}
        </div>
      );
    }
    case 'text': {
      const txt = (it.text ?? '').trim();
      const first = firstLineOf(txt);
      return (
        <div className="card-text">
          <div className="t-title">{first || t('board.empty_note')}</div>
          <div className="t-body">{txt.slice(first.length).trim()}</div>
        </div>
      );
    }
    case 'link':
      return (
        <div className="card-link">
          <div className="l-host">{hostOf(it.url)}</div>
          <div className="l-title">{it.linkTitle ?? it.url}</div>
          {it.linkTitle && <div className="l-url">{it.url}</div>}
        </div>
      );
    case 'file':
      return (
        <div className="card-file">
          <span className="f-ext">{(it.ext ?? 'file').toUpperCase()}</span>
          <div className="f-name">{it.title || it.file}</div>
        </div>
      );
  }
};
