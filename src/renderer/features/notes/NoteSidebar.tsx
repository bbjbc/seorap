import { useEffect, useState } from 'react';
import { IconPlus, IconSort } from '../../components/icons';
import { SearchBox } from '../../components/SearchBox';
import { useDebounced } from '../../lib/hooks';
import { useT } from '../../lib/i18n';
import { useNotesStore } from '../../stores/notes';
import { saveSettings, useSettings } from '../../stores/settings';
import { newNote, toggleNoteSort } from './actions';
import { noteSearchHandle } from './handles';
import { NoteList } from './NoteList';

const SEARCH_DEBOUNCE_MS = 100;

export const NoteSidebar = ({ active }: { active: boolean }) => {
  const t = useT();
  const settings = useSettings();
  const setQuery = useNotesStore((s) => s.setQuery);
  const [text, setText] = useState('');
  const debounced = useDebounced(text, SEARCH_DEBOUNCE_MS);
  useEffect(() => setQuery(debounced), [debounced, setQuery]);
  const manual = settings?.notes.sort === 'manual';
  const [count, setCount] = useState(0);

  return (
    <aside className="side">
      <header className="viewbar drag">
        <SearchBox
          id="noteSearch"
          value={text}
          placeholder={t('notes.search_ph')}
          onChange={setText}
          inputRef={noteSearchHandle.attach}
        />
        <button
          type="button"
          className={`icon-btn nodrag${manual ? ' active' : ''}`}
          id="btnNoteSort"
          title={
            manual ? t('notes.sort_manual_title') : t('notes.sort_recent_title')
          }
          onClick={toggleNoteSort}
        >
          <IconSort />
        </button>
        <button
          type="button"
          className="icon-btn nodrag"
          id="btnNewNote"
          title={t('notes.new_title')}
          onClick={() => void newNote()}
        >
          <IconPlus />
        </button>
      </header>
      <NoteList active={active} onCount={setCount} />
      <footer className="side-foot">
        <label className="mini-check">
          <input
            type="checkbox"
            id="optShowClipText"
            checked={settings?.notes.showClipboardText ?? false}
            onChange={(e) =>
              void saveSettings({
                notes: { showClipboardText: e.target.checked },
              })
            }
          />
          <span>{t('notes.show_clip')}</span>
        </label>
        <span className="muted" id="noteCount">
          {count ? t('notes.count', { n: count }) : ''}
        </span>
      </footer>
    </aside>
  );
};
