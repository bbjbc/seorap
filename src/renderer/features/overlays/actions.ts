import { useUiStore } from '../../stores/ui';

/** 화면 아래 가운데에 짧게 뜨는 안내 문구. */
export function flash(text: string): void {
  useUiStore.getState().showFlash(text);
}
