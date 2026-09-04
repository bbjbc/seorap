// 오른쪽 편집기 칸. 본문의 정본은 items 스토어의 item.text 이고 textarea 는 그걸 그린다.
import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { EmptyArt } from '../../components/EmptyArt';
import { IconCopy, IconMono, IconPin, IconTrash } from '../../components/icons';
import { RichText } from '../../components/RichText';
import { TagInput, TagList } from '../../components/TagList';
import { firstLineOf, fmtTime } from '../../lib/format';
import { t as tr, useLang, useT } from '../../lib/i18n';
import { useItemsStore } from '../../stores/items';
import { useNotesStore } from '../../stores/notes';
import { saveSettings, useSettings } from '../../stores/settings';
import { addTag, copyItem, removeTag, softDelete, togglePin } from '../items/actions';
import { flash } from '../overlays/actions';
import { editNoteText } from './actions';
import { FindBar } from './FindBar';
import { FindHighlight } from './FindHighlight';
import { editorHandle } from './handles';

export const NoteEditor = () => {
  const t = useT();
  const lang = useLang();
  const settings = useSettings();
  const { noteId, saveState } = useNotesStore(useShallow((s) => ({ noteId: s.noteId, saveState: s.saveState })));
  const item = useItemsStore((s) => (noteId ? s.items.find((i) => i.id === noteId) : undefined));
  const text = item?.text ?? '';
  const has = item !== undefined;
  const mono = settings?.notes.mono ?? false;

  const taRef = useRef<HTMLTextAreaElement | null>(null);
  // 메모를 열면 편집기에 포커스
  useEffect(() => {
    if (noteId) taRef.current?.focus();
  }, [noteId]);

  const saveLabel =
    saveState === 'saving' ? t('notes.saving') : saveState === 'saved' ? t('notes.saved_now') : item?.updatedAt ? t('notes.saved_at', { t: fmtTime(item.updatedAt, lang) }) : '';

  return (
    <div className="pane">
      <header className="viewbar drag">
        <div className="pane-title" id="noteTitle">
          {has ? firstLineOf(text) || t('common.new_note') : t('common.notes')}
        </div>
        <span className={`save-state${saveState === 'saving' ? ' saving' : ''}`} id="saveState">
          {has ? saveLabel : ''}
        </span>
        <div className="pane-actions nodrag">
          <button type="button" className={`icon-btn${item?.pinned ? ' active' : ''}`} id="btnNotePin" title={t('common.pin')} disabled={!has} onClick={() => noteId && void togglePin([noteId])}>
            <IconPin />
          </button>
          <button type="button" className={`icon-btn${mono ? ' active' : ''}`} id="btnNoteMono" title={t('notes.mono_title')} disabled={!has} onClick={() => void saveSettings({ notes: { mono: !mono } })}>
            <IconMono />
          </button>
          <button type="button" className="icon-btn" id="btnNoteCopy" title={t('notes.copy_all')} disabled={!has} onClick={() => noteId && void copyNote(noteId)}>
            <IconCopy />
          </button>
          <button type="button" className="icon-btn danger" id="btnNoteDelete" title={t('common.delete')} disabled={!has} onClick={() => noteId && softDelete([noteId])}>
            <IconTrash />
          </button>
        </div>
      </header>
      <FindBar />
      <div className="editor-wrap">
        <textarea
          id="editor"
          ref={(el) => {
            taRef.current = el;
            editorHandle.attach(el);
          }}
          hidden={!has}
          value={text}
          spellCheck={false}
          placeholder={t('notes.editor_ph')}
          onChange={(e) => editNoteText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Tab') return;
            e.preventDefault();
            const ta = e.currentTarget;
            ta.setRangeText('\t', ta.selectionStart, ta.selectionEnd, 'end');
            editNoteText(ta.value);
          }}
        />
        <FindHighlight text={text} textareaRef={taRef} />
        <div className="editor-empty" id="editorEmpty" hidden={has}>
          <EmptyArt small />
          <h2>{t('notes.empty_title')}</h2>
          <p>
            <RichText text={t('notes.empty_desc')} />
          </p>
        </div>
      </div>
      <footer className="editor-foot">
        <span className="muted" id="editorStats">
          {has && text ? t('notes.stats', { chars: text.length.toLocaleString(), lines: text.split('\n').length }) : ''}
        </span>
        <TagList id="noteTagList" inline tags={item?.tags ?? []} onRemove={(tag) => void removeTag(noteId, tag)} />
        <TagInput id="noteTagInput" placeholder={t('notes.tag_ph')} disabled={!has} onAdd={(raw) => void addTag(noteId, raw)} />
      </footer>
    </div>
  );
};

async function copyNote(id: string): Promise<void> {
  if (await copyItem(id)) flash(tr('flash.note_copied'));
}
