// 보드: 검색·필터 막대 + 카드 격자. 다른 모드일 때도 마운트된 채 숨긴다 (스크롤 위치·선택 유지).
import { useEffect, useState } from 'react';
import { SearchBox } from '../../components/SearchBox';
import { useDebounced } from '../../lib/hooks';
import { useT } from '../../lib/i18n';
import { useBoardStore } from '../../stores/board';
import { useMode } from '../../stores/ui';
import { boardSearchHandle } from './actions';
import { Grid } from './Grid';
import { TypeChips } from './TypeChips';

const SEARCH_DEBOUNCE_MS = 120;

export const BoardView = () => {
  const t = useT();
  const mode = useMode();
  const setQuery = useBoardStore((s) => s.setQuery);
  const [text, setText] = useState('');
  const debounced = useDebounced(text, SEARCH_DEBOUNCE_MS);
  useEffect(() => setQuery(debounced), [debounced, setQuery]);

  return (
    <section className="view" id="viewBoard" hidden={mode !== 'board'}>
      <header className="viewbar drag">
        <SearchBox id="search" value={text} placeholder={t('board.search_ph')} onChange={setText} inputRef={boardSearchHandle.attach} clearable />
        <TypeChips />
      </header>
      <Grid active={mode === 'board'} />
    </section>
  );
};
