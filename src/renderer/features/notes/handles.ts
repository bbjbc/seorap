import type { Editor } from '@tiptap/react';
import { createHandle } from '../../lib/handles';

/** 메모 본문 textarea (순수 텍스트 모드). 찾기가 선택 범위를 옮긴다. */
export const editorHandle = createHandle<HTMLTextAreaElement>();
/** 메모 본문 Tiptap 인스턴스 (위지위그 모드). 둘 중 하나만 붙어 있다. */
export const mdEditorHandle = createHandle<Editor>();
/** 메모 안 찾기 입력칸 */
export const findInputHandle = createHandle<HTMLInputElement>();
/** 메모 목록 검색칸 (Ctrl+Shift+F) */
export const noteSearchHandle = createHandle<HTMLInputElement>();
