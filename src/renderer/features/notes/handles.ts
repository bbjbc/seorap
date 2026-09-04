import { createHandle } from '../../lib/handles';

/** 메모 본문 textarea. 찾기가 선택 범위를 옮기고, 창이 다시 보일 때 포커스를 준다. */
export const editorHandle = createHandle<HTMLTextAreaElement>();
/** 메모 안 찾기 입력칸 */
export const findInputHandle = createHandle<HTMLInputElement>();
/** 메모 목록 검색칸 (Ctrl+Shift+F) */
export const noteSearchHandle = createHandle<HTMLInputElement>();
