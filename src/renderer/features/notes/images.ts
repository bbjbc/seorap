// 위지위그 편집기에 이미지를 붙여넣거나 떨어뜨렸을 때. 이미지를 본문에 base64 로 박아 넣으면
// index.json 이 순식간에 불어나므로, 보드 항목으로 저장하고 본문에는 scrap:// 링크만 남긴다.
// 이미 보드에 있는 이미지를 붙여넣으면 store 의 해시 중복 판정이 같은 항목을 돌려주므로
// 두 번 저장되지 않는다.
import { api } from '../../lib/api';
import { mdEditorHandle } from './handles';

const isImage = (f: File): boolean => f.type.startsWith('image/');

/** DataTransfer 안의 이미지를 저장해 커서 자리에 넣는다. 넣을 게 있었으면 true. */
export function insertPastedFiles(dt: DataTransfer | null): boolean {
  const files = Array.from(dt?.files ?? []).filter(isImage);
  if (!files.length) return false;
  void storeAndInsert(files);
  // 기본 동작(브라우저가 base64 로 박아 넣는 것)을 막는다.
  return true;
}

/** 파일 고르기 창을 열어 이미지를 넣는다 (슬래시 메뉴의 '이미지'). */
export function pickAndInsertImages(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.addEventListener('change', () => {
    const files = Array.from(input.files ?? []).filter(isImage);
    if (files.length) void storeAndInsert(files);
  });
  input.click();
}

/**
 * 디스크에 있는 파일은 경로로 넘겨 그대로 복사하게 하고, 클립보드에서 온 것처럼 경로가
 * 없을 때만 바이트로 넘긴다. 바이트 경로는 안에서 PNG 로 다시 인코딩하기 때문에, 사진
 * JPEG 를 끌어다 놓으면 용량이 몇 배로 불어난다. 보드에 떨어뜨릴 때와 같은 규칙이다.
 */
async function storeAndInsert(files: File[]): Promise<void> {
  const paths: string[] = [];
  const blobs: Seorap.DroppedBlob[] = [];
  for (const f of files) {
    const p = api.getPathForFile(f);
    if (p) paths.push(p);
    else
      blobs.push({ name: f.name, mime: f.type, data: await f.arrayBuffer() });
  }
  const results = [
    ...(paths.length ? await api.addFiles(paths) : []),
    ...(blobs.length ? await api.addBuffers(blobs) : []),
  ];

  const editor = mdEditorHandle.get();
  // 저장하는 사이에 다른 메모로 옮겨 갔으면 넣지 않는다. 이미지는 보드에 남는다.
  if (!editor || editor.isDestroyed) return;
  for (const r of results) {
    if ('error' in r || !r.item.fileUrl) continue;
    editor
      .chain()
      .focus()
      .setImage({ src: r.item.fileUrl, alt: r.item.title || '' })
      .run();
  }
}
