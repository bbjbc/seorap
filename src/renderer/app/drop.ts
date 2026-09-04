// 창 어디에나 파일·글·링크를 떨어뜨리면 저장한다. 메모 목록 안의 정렬 드래그는 무시한다.
import { api } from '../lib/api';
import { t } from '../lib/i18n';
import { useUiStore } from '../stores/ui';
import { boardScrollHandle } from '../features/board/actions';
import { isNoteDrag } from '../features/notes/drag';
import { flash } from '../features/overlays/actions';

let dragDepth = 0;

function onDragEnter(e: DragEvent): void {
  if (!e.dataTransfer?.types.length || isNoteDrag(e.dataTransfer)) return;
  dragDepth++;
  const ui = useUiStore.getState();
  ui.setDropText(ui.mode === 'notes' ? t('board.drop_as_note') : t('board.drop_here'));
}

function onDragLeave(): void {
  if (--dragDepth <= 0) {
    dragDepth = 0;
    useUiStore.getState().setDropText(null);
  }
}

function onDragOver(e: DragEvent): void {
  e.preventDefault();
}

function onDrop(e: DragEvent): void {
  e.preventDefault();
  dragDepth = 0;
  useUiStore.getState().setDropText(null);
  if (e.dataTransfer && !isNoteDrag(e.dataTransfer)) void handleDrop(e.dataTransfer);
}

const TEXT_FILE_RE = /\.(txt|md|markdown|log|csv|json)$/i;
const IMAGE_URL_RE = /\.(png|jpe?g|gif|webp|bmp|svg|avif)(\?|$)/i;

async function handleDrop(dt: DataTransfer): Promise<void> {
  const mode = useUiStore.getState().mode;
  const files = Array.from(dt.files);
  let added = 0;
  let dup = 0;
  const bump = (r: Seorap.AddOutcome | null): void => {
    if (!r || 'error' in r) return;
    if (r.duplicate) dup++;
    else added++;
  };

  if (files.length) {
    const paths: string[] = [];
    const blobs: Seorap.DroppedBlob[] = [];
    for (const f of files) {
      const p = api.getPathForFile(f);
      // 메모 모드에 떨어진 텍스트 파일은 내용을 읽어 메모로 만든다. 보드에서는 파일 그대로 보관.
      const isTextFile = TEXT_FILE_RE.test(f.name) && f.size < 2 * 1024 * 1024;
      if (isTextFile && mode === 'notes') bump(await api.addText(await f.text(), { note: true }));
      else if (p) paths.push(p);
      else blobs.push({ name: f.name, mime: f.type, data: await f.arrayBuffer() });
    }
    if (paths.length) (await api.addFiles(paths)).forEach(bump);
    if (blobs.length) (await api.addBuffers(blobs)).forEach(bump);
  } else {
    const uri = dt
      .getData('text/uri-list')
      .split('\n')
      .find((l) => l && !l.startsWith('#'));
    const html = dt.getData('text/html');
    const text = dt.getData('text/plain');
    const imgSrc = /<img[^>]+src=["']([^"']+)["']/i.exec(html)?.[1];
    if (imgSrc && /^https?:/i.test(imgSrc)) bump(await api.addUrl(imgSrc));
    else if (uri && /^https?:/i.test(uri) && IMAGE_URL_RE.test(uri)) bump(await api.addUrl(uri));
    else if (uri && /^https?:/i.test(uri)) bump(await api.addText(uri, { note: false }));
    else if (text) bump(await api.addText(text, { note: mode === 'notes' }));
  }
  if (added || dup) {
    flash(added ? (dup ? t('board.saved_n_dup', { n: added, d: dup }) : t('board.saved_n', { n: added })) : t('flash.already_saved'));
    if (mode === 'board') {
      const scroll = boardScrollHandle.get();
      if (scroll) scroll.scrollTop = 0;
    }
  }
}

export function installDropHandlers(): () => void {
  window.addEventListener('dragenter', onDragEnter);
  window.addEventListener('dragleave', onDragLeave);
  window.addEventListener('dragover', onDragOver);
  window.addEventListener('drop', onDrop);
  return () => {
    window.removeEventListener('dragenter', onDragEnter);
    window.removeEventListener('dragleave', onDragLeave);
    window.removeEventListener('dragover', onDragOver);
    window.removeEventListener('drop', onDrop);
  };
}
