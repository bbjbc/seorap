import { EmptyArt } from '../../components/EmptyArt';
import { RichText } from '../../components/RichText';
import { useT } from '../../lib/i18n';
import { useSettings } from '../../stores/settings';

interface Props {
  visible: boolean;
  /** 필터 전 보드 항목 수. 0 이면 첫 사용 안내, 아니면 "검색 결과 없음". */
  total: number;
}

export const EmptyBoard = ({ visible, total }: Props) => {
  const t = useT();
  const quickSave = useSettings()?.shortcuts.quickSave ?? '';
  const fresh = total === 0;
  return (
    <div id="empty" className="empty" hidden={!visible}>
      <EmptyArt />
      <h2 id="emptyTitle">{fresh ? t('board.empty_title') : t('board.no_match_title')}</h2>
      <p id="emptyDesc">
        {fresh ? (
          <RichText text={t('board.empty_desc', { how: quickSave ? t('board.empty_how_key', { key: quickSave }) : t('board.empty_how_tray') })} />
        ) : (
          t('board.no_match_desc')
        )}
      </p>
    </div>
  );
};
