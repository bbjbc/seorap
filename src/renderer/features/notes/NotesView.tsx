// 메모: 왼쪽 목록 + 오른쪽 편집기. 다른 모드일 때도 마운트된 채 숨긴다 (편집 상태 유지).
import { useMode } from '../../stores/ui';
import { NoteEditor } from './NoteEditor';
import { NoteSidebar } from './NoteSidebar';

export const NotesView = () => {
  const mode = useMode();
  const active = mode === 'notes';
  return (
    <section className="view split" id="viewNotes" hidden={!active}>
      <NoteSidebar active={active} />
      <NoteEditor />
    </section>
  );
};
