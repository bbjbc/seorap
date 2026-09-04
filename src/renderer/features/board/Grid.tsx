// 카드 격자 + 무한 스크롤 + 빈 상태.
import { useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTick } from '../../lib/hooks';
import { useBoardStore } from '../../stores/board';
import { useItemsStore } from '../../stores/items';
import { boardScrollHandle } from './actions';
import { Card } from './Card';
import { EmptyBoard } from './EmptyBoard';
import { boardItems, isBoardItem } from './selectors';

const TIME_REFRESH_MS = 60000;

export const Grid = ({ active }: { active: boolean }) => {
  const items = useItemsStore((s) => s.items);
  const filter = useBoardStore(useShallow((s) => ({ query: s.query, type: s.type, pinnedOnly: s.pinnedOnly, tag: s.tag })));
  const { selected, renderLimit, copyFlash, growLimit, clearSelection } = useBoardStore(
    useShallow((s) => ({ selected: s.selected, renderLimit: s.renderLimit, copyFlash: s.copyFlash, growLimit: s.growLimit, clearSelection: s.clearSelection })),
  );
  const list = useMemo(() => boardItems(items, filter), [items, filter]);
  const total = useMemo(() => items.filter(isBoardItem).length, [items]);
  // 상대 시각("3분 전")이 굳지 않게 1분마다 다시 그린다.
  useTick(TIME_REFRESH_MS, active);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasMore = list.length > renderLimit;
  useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((x) => x.isIntersecting)) growLimit();
      },
      { root, rootMargin: '600px' },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [hasMore, growLimit]);

  return (
    <div
      className="scroll"
      id="boardScroll"
      tabIndex={-1}
      ref={(el) => {
        scrollRef.current = el;
        boardScrollHandle.attach(el);
      }}
      onClick={(e) => {
        // 카드 바깥(배경)을 누르면 선택 해제
        if (e.target === e.currentTarget || (e.target instanceof HTMLElement && e.target.id === 'grid')) clearSelection();
      }}
    >
      <div className="grid" id="grid">
        {list.slice(0, renderLimit).map((it) => (
          <Card key={it.id} item={it} selected={selected.has(it.id)} copySeq={copyFlash?.id === it.id ? copyFlash.seq : 0} />
        ))}
      </div>
      <div id="sentinel" className="sentinel" ref={sentinelRef} hidden={!hasMore} />
      <EmptyBoard visible={list.length === 0} total={total} />
    </div>
  );
};
