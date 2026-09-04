import { useShallow } from 'zustand/react/shallow';
import { IconPin } from '../../components/icons';
import { useT } from '../../lib/i18n';
import { type TypeFilter, useBoardStore } from '../../stores/board';
import { useItemsStore } from '../../stores/items';
import { boardCounts } from './selectors';

const TYPES: readonly TypeFilter[] = ['all', 'image', 'text', 'link', 'file'];

export const TypeChips = () => {
  const t = useT();
  const items = useItemsStore((s) => s.items);
  const { type, pinnedOnly, tag, setType, togglePinnedOnly, toggleTag } =
    useBoardStore(
      useShallow((s) => ({
        type: s.type,
        pinnedOnly: s.pinnedOnly,
        tag: s.tag,
        setType: s.setType,
        togglePinnedOnly: s.togglePinnedOnly,
        toggleTag: s.toggleTag,
      })),
    );
  const counts = boardCounts(items);

  return (
    <div className="chips nodrag" id="typeChips">
      {TYPES.map((k) => (
        <button
          key={k}
          type="button"
          className={`chip${type === k ? ' active' : ''}`}
          data-type={k}
          onClick={() => setType(k)}
        >
          <span>{t(`type.${k}`)}</span>
          <em data-count={k}>{counts[k] ? String(counts[k]) : ''}</em>
        </button>
      ))}
      <span className="chip-sep" />
      <button
        type="button"
        className={`chip${pinnedOnly ? ' active' : ''}`}
        id="chipPinned"
        title={t('board.pinned_only')}
        onClick={togglePinnedOnly}
      >
        <IconPin />
        <span>{t('common.pin')}</span>
      </button>
      <button
        type="button"
        className="chip tagchip"
        id="tagFilter"
        hidden={!tag}
        onClick={() => toggleTag(tag)}
      >
        {tag ? `#${tag} ×` : ''}
      </button>
    </div>
  );
};
