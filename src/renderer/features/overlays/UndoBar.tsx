import { useT } from '../../lib/i18n';
import { useUiStore } from '../../stores/ui';
import { undoDelete } from '../items/actions';

export const UndoBar = () => {
  const t = useT();
  const pending = useUiStore((s) => s.pendingDelete);
  return (
    <div id="undoBar" className="undo" hidden={!pending}>
      <span id="undoText">{pending ? (pending.ids.length > 1 ? t('board.deleted_n', { n: pending.ids.length }) : t('board.deleted')) : ''}</span>
      <button type="button" id="undoBtn" className="btn ghost small" onClick={undoDelete}>
        {t('board.undo')}
      </button>
    </div>
  );
};
