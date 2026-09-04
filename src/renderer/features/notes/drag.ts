/** 메모 목록 안에서 끌어 정렬할 때 쓰는 MIME. 파일 드롭 덮개는 이 타입이 있으면 반응하지 않는다. */
export const NOTE_DRAG_MIME = 'application/x-seorap-note';

export const isNoteDrag = (dt: DataTransfer | null): boolean => !!dt && Array.from(dt.types).includes(NOTE_DRAG_MIME);
