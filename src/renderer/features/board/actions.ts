// 보드의 선택·복사·강조. 항목 자체를 바꾸는 일은 items/actions 에 있다.
import { createHandle } from '../../lib/handles';
import { useBoardStore } from '../../stores/board';
import { useItemsStore } from '../../stores/items';
import { copyItem } from '../items/actions';
import { boardItems } from './selectors';

/** 보드 스크롤 컨테이너. 저장 직후 맨 위로 올리거나 카드를 화면에 드러낼 때 쓴다. */
export const boardScrollHandle = createHandle<HTMLDivElement>();
/** 보드 검색칸 (Ctrl+F) */
export const boardSearchHandle = createHandle<HTMLInputElement>();

/** 지금 필터로 보이는 항목 (그려진 순서와 같다) */
export function visibleBoardItems(): ReturnType<typeof boardItems> {
  return boardItems(useItemsStore.getState().items, useBoardStore.getState());
}

/** 카드를 선택하고 화면에 보이게 스크롤한다. 방금 추가된 항목은 다음 프레임에 그려지므로 그때 찾는다. */
export function highlight(id: string): void {
  useBoardStore.getState().selectOnly(id);
  requestAnimationFrame(() => {
    boardScrollHandle
      .get()
      ?.querySelector(`.card[data-id="${id}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  });
}

/** Shift+클릭: 마지막 선택과 이 카드 사이를 모두 선택 */
export function rangeSelectTo(id: string): void {
  const board = useBoardStore.getState();
  const ids = visibleBoardItems().map((it) => it.id);
  const last = [...board.selected].pop() ?? id;
  const a = ids.indexOf(last);
  const b = ids.indexOf(id);
  board.selectMany(ids.slice(Math.min(a, b), Math.max(a, b) + 1));
}

export function selectAllVisible(): void {
  useBoardStore.getState().selectMany(visibleBoardItems().map((it) => it.id));
}

/** 복사하고 카드에 "복사됨" 애니메이션을 띄운다. */
export async function copyCard(id: string): Promise<void> {
  if (await copyItem(id)) useBoardStore.getState().flashCopy(id);
}
