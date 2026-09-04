// 메모 안 찾기 막대 (Ctrl+F). 메모 리스트 검색은 Ctrl+Shift+F.
import { IconChevronDown, IconChevronUp, IconClose, IconSearch } from '../../components/icons';
import { useT } from '../../lib/i18n';
import { useNotesStore } from '../../stores/notes';
import { closeFind, findStep, setFindQuery } from './find';
import { findInputHandle } from './handles';

const attachFindInput = findInputHandle.attach;

export const FindBar = () => {
  const t = useT();
  const find = useNotesStore((s) => s.find);
  const n = find.matches.length;
  const count = !find.query ? '' : n ? `${find.index + 1} / ${n}` : t('notes.find_none');

  return (
    <div className="findbar" id="findBar" hidden={!find.open}>
      <IconSearch />
      <input
        id="findInput"
        ref={attachFindInput}
        type="text"
        value={find.query}
        placeholder={t('notes.find_ph')}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => setFindQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            findStep(e.shiftKey ? -1 : 1);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            closeFind();
          }
        }}
      />
      <span className={`find-count${find.query && !n ? ' none' : ''}`} id="findCount">
        {count}
      </span>
      <button type="button" className="icon-btn" id="findPrev" title={t('notes.find_prev')} onClick={() => findStep(-1)}>
        <IconChevronUp />
      </button>
      <button type="button" className="icon-btn" id="findNext" title={t('notes.find_next')} onClick={() => findStep(1)}>
        <IconChevronDown />
      </button>
      <button type="button" className="icon-btn" id="findClose" title={t('common.close')} onClick={closeFind}>
        <IconClose />
      </button>
    </div>
  );
};
