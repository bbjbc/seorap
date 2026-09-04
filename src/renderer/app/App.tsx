// 셸: 레일 + 세 뷰(항상 마운트, hidden 으로 전환) + 오버레이 + 모달.
// 이벤트 구독·전역 단축키·부팅은 main.tsx 가 한 번 설치한다. 여기서는 문서 수준 속성만 설정에 맞춘다.
import { useEffect } from 'react';
import { lookup } from '../../shared/locales';
import { useLang } from '../lib/i18n';
import { useSettings } from '../stores/settings';
import { useMode } from '../stores/ui';
import { BoardView } from '../features/board/BoardView';
import { DetailModal } from '../features/detail/DetailModal';
import { NotesView } from '../features/notes/NotesView';
import { StarNudge } from '../features/nudge/StarNudge';
import { DropOverlay } from '../features/overlays/DropOverlay';
import { Flash } from '../features/overlays/Flash';
import { UndoBar } from '../features/overlays/UndoBar';
import { PromptModal } from '../features/prompt/PromptModal';
import { SettingsModal } from '../features/settings/SettingsModal';
import { Rail } from '../features/shell/Rail';
import { SwitcherModal } from '../features/switcher/SwitcherModal';
import { VaultView } from '../features/vault/VaultView';

export const App = () => {
  const mode = useMode();
  const lang = useLang();
  const settings = useSettings();
  const mono = settings?.notes.mono ?? false;
  const fontSize = settings?.notes.fontSize || 15;

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = lookup(lang, 'app.name');
  }, [lang]);

  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--editor-font', mono ? 'var(--mono)' : 'var(--font)');
    root.setProperty('--editor-size', `${fontSize}px`);
  }, [mono, fontSize]);

  return (
    <>
      <div className="app" id="app" data-mode={mode} data-card={settings?.board.cardSize ?? 'medium'}>
        <Rail />
        <BoardView />
        <NotesView />
        <VaultView />
      </div>
      <DropOverlay />
      <Flash />
      <StarNudge />
      <UndoBar />
      <SwitcherModal />
      <DetailModal />
      <SettingsModal />
      <PromptModal />
    </>
  );
};
