// 빠른 전환 (Ctrl+K): 메모·항목을 검색해 바로 연다.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Modal } from '../../components/Modal';
import { firstLineOf, fmtTime } from '../../lib/format';
import { useLang, useT } from '../../lib/i18n';
import { type Item, useItemsStore } from '../../stores/items';
import { useUiStore } from '../../stores/ui';
import { openAny } from '../items/actions';

const MAX_RESULTS = 40;

function titleOf(it: Item, untitled: string): string {
  if (it.type === 'link') return it.linkTitle ?? it.url ?? '';
  if (it.type === 'text') return firstLineOf(it.text ?? '') || untitled;
  return it.title || it.file || '';
}

export const SwitcherModal = () => {
  const t = useT();
  const lang = useLang();
  const { open, query, setOpen, setQuery } = useUiStore(
    useShallow((s) => ({
      open: s.switcherOpen,
      query: s.switcherQuery,
      setOpen: s.setSwitcherOpen,
      setQuery: s.setSwitcherQuery,
    })),
  );
  const items = useItemsStore((s) => s.items);
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    const list = q
      ? items.filter((it) =>
          [it.title, it.text, it.url, it.linkTitle, it.tags.join(' ')]
            .join('\n')
            .toLowerCase()
            .includes(q),
        )
      : items.filter((it) => it.type === 'text');
    return [...list]
      .sort(
        (a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt),
      )
      .slice(0, MAX_RESULTS);
  }, [items, q]);

  const [seen, setSeen] = useState({ q, open });
  if (seen.q !== q || seen.open !== open) {
    setSeen({ q, open });
    setIndex(0);
  }
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // 활성 줄에만 붙는 ref. 활성이 바뀌면 React 가 새 요소에 이 콜백을 불러 그 줄을 화면에 드러낸다.
  const revealActive = (el: HTMLDivElement | null): void =>
    el?.scrollIntoView({ block: 'nearest' });

  const pick = (i: number): void => {
    const it = results[i];
    if (!it) return;
    setOpen(false);
    openAny(it.id);
  };

  return (
    <Modal
      id="switcher"
      open={open}
      top
      onClose={() => setOpen(false)}
      cardClassName="switcher-card"
    >
      <input
        id="switcherInput"
        ref={inputRef}
        value={query}
        placeholder={t('switcher.ph')}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!results.length) return;
            setIndex(
              (i) =>
                (i + (e.key === 'ArrowDown' ? 1 : -1) + results.length) %
                results.length,
            );
          } else if (e.key === 'Enter') {
            e.preventDefault();
            pick(index);
          }
        }}
      />
      <div className="switcher-list" id="switcherList">
        {!results.length ? (
          <div className="sw-empty">
            {q ? t('switcher.no_result') : t('switcher.no_notes')}
          </div>
        ) : (
          results.map((it, i) => {
            const title = titleOf(it, t('common.new_note'));
            const sub =
              it.type === 'text'
                ? (it.text ?? '')
                    .trim()
                    .slice(title.length, title.length + 120)
                    .replace(/\s+/g, ' ')
                : (it.url ?? '');
            return (
              <div
                key={it.id}
                ref={i === index ? revealActive : undefined}
                className={`sw-item${i === index ? ' active' : ''}`}
                data-i={i}
                onClick={() => pick(i)}
              >
                <span className={`badge ${it.type}`}>
                  {t(`type.${it.type}`)}
                </span>
                <div className="sw-text">
                  <div className="sw-title">{title}</div>
                  <div className="sw-sub">{sub}</div>
                </div>
                <span className="sw-time">
                  {fmtTime(it.updatedAt ?? it.createdAt, lang)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
};
