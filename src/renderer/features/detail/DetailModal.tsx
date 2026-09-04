// 이미지·링크·파일 상세 보기. 글(text)은 여기 대신 메모 편집기로 간다 (items/actions.openAny).
import { useState } from 'react';
import { IconClose } from '../../components/icons';
import { Modal } from '../../components/Modal';
import { TagInput, TagList } from '../../components/TagList';
import { api } from '../../lib/api';
import { fmtFull, fmtSize, hostOf } from '../../lib/format';
import { t as tr, useT } from '../../lib/i18n';
import { useItemsStore, type Item } from '../../stores/items';
import { useUiStore } from '../../stores/ui';
import { addTag, copyItem, removeTag, softDelete, togglePin } from '../items/actions';
import { flash } from '../overlays/actions';

export const DetailModal = () => {
  const t = useT();
  const detailId = useUiStore((s) => s.detailId);
  const close = useUiStore((s) => s.closeDetail);
  const item = useItemsStore((s) => (detailId ? s.items.find((i) => i.id === detailId) : undefined));

  const open = item !== undefined;
  const dim = item?.type === 'image' && item.width ? ` · ${item.width}×${item.height ?? '?'}` : '';

  return (
    <Modal id="detail" open={open} onClose={close} cardClassName="detail-card">
      <div className="detail-head">
        <span id="detailType" className={`badge ${item?.type ?? ''}`}>
          {item ? t(`type.${item.type}`) : ''}
        </span>
        <TitleInput key={item?.id ?? ''} item={item} placeholder={t('detail.title_ph')} />
        <button type="button" className="icon-btn" title={t('common.close')} onClick={close}>
          <IconClose />
        </button>
      </div>
      <div className="detail-body" id="detailBody">
        {item && <DetailBody item={item} />}
      </div>
      <div className="detail-tags">
        <TagList id="detailTagList" tags={item?.tags ?? []} onRemove={(tag) => void removeTag(detailId, tag)} />
        <TagInput id="detailTagInput" placeholder={t('notes.tag_ph')} onAdd={(raw) => void addTag(detailId, raw)} />
      </div>
      <div className="detail-foot">
        <span className="muted" id="detailMeta">
          {item ? `${fmtFull(item.createdAt)}${dim}${item.size ? ' · ' + fmtSize(item.size) : ''}` : ''}
        </span>
        <div className="spacer" />
        <button type="button" className="btn ghost" id="dPin" onClick={() => detailId && void togglePin([detailId])}>
          {item?.pinned ? t('common.unpin') : t('common.pin')}
        </button>
        <button type="button" className="btn ghost" id="dOpen" onClick={() => detailId && void api.openItem(detailId)}>
          {t('common.open')}
        </button>
        <button type="button" className="btn ghost" id="dFolder" onClick={() => detailId && void api.showInFolder(detailId)}>
          {t('detail.folder')}
        </button>
        <button
          type="button"
          className="btn ghost danger"
          id="dDelete"
          onClick={() => {
            const id = detailId;
            close();
            if (id) softDelete([id]);
          }}
        >
          {t('common.delete')}
        </button>
        <button type="button" className="btn primary" id="dCopy" onClick={() => detailId && void copyWithFlash(detailId)}>
          {t('common.copy')}
        </button>
      </div>
    </Modal>
  );
};

/** 제목 편집. 항목이 바뀌면 key 로 다시 마운트되어 초기값을 새로 받는다. 링크는 제목을 고칠 수 없다. */
const TitleInput = ({ item, placeholder }: { item: Item | undefined; placeholder: string }) => {
  const [title, setTitle] = useState(() => (item ? (item.type === 'link' ? (item.linkTitle ?? '') : item.title) : ''));
  const readOnly = !item || item.type === 'link';
  return (
    <input
      id="detailTitle"
      className="detail-title"
      value={title}
      placeholder={placeholder}
      spellCheck={false}
      readOnly={readOnly}
      onChange={(e) => setTitle(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      onBlur={() => {
        if (item && !readOnly && title.trim() !== item.title) void api.updateItem(item.id, { title: title.trim() });
      }}
    />
  );
};

async function copyWithFlash(id: string): Promise<void> {
  if (await copyItem(id)) flash(tr('flash.copied'));
}

const DetailBody = ({ item: it }: { item: Item }) => {
  switch (it.type) {
    case 'image':
      return <img src={it.fileUrl ?? undefined} alt="" />;
    case 'link':
      return (
        <div className="link-view">
          <div className="l-host badge link">{hostOf(it.url)}</div>
          <div className="l-title">{it.linkTitle ?? ''}</div>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (it.url) void api.openExternal(it.url);
            }}
          >
            {it.url}
          </a>
        </div>
      );
    case 'file':
    case 'text':
      return (
        <div className="file-view">
          <span className="f-ext">{(it.ext ?? 'FILE').toUpperCase()}</span>
          <div className="f-name">{it.title || it.file}</div>
          <div className="muted">{fmtSize(it.size)}</div>
        </div>
      );
  }
};
