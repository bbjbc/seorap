// 서랍 렌더러. 번들러 없이 <script src="app.js"> 로 로드되는 단일 스크립트.
// 타입 계약은 src/shared/types.d.ts (전역 Seorap 네임스페이스).
(() => {
  const api = window.scrap;

  // =====================================================================
  // DOM 헬퍼
  // =====================================================================
  function $<T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T {
    const el = root.querySelector<T>(sel);
    if (!el) throw new Error(`missing element: ${sel}`);
    return el;
  }
  function $$<T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T[] {
    return Array.from(root.querySelectorAll<T>(sel));
  }
  const input = (sel: string): HTMLInputElement => $<HTMLInputElement>(sel);
  const textarea = (sel: string): HTMLTextAreaElement => $<HTMLTextAreaElement>(sel);
  const select = (sel: string): HTMLSelectElement => $<HTMLSelectElement>(sel);
  const button = (sel: string): HTMLButtonElement => $<HTMLButtonElement>(sel);

  function closest<T extends HTMLElement = HTMLElement>(target: EventTarget | null, sel: string): T | null {
    return target instanceof Element ? target.closest<T>(sel) : null;
  }

  // =====================================================================
  // 상태
  // =====================================================================
  type Item = Seorap.ClientItem;

  interface PendingDelete {
    ids: string[];
    removed: Item[];
  }

  interface VaultState {
    status: Seorap.VaultStatus | null;
    entries: Seorap.VaultEntryPublic[];
    id: string | null;
    saveTimer: number | null;
    lastTouch: number;
  }

  const state = {
    items: [] as Item[],
    mode: 'board' as Seorap.Mode,
    settings: null as Seorap.Settings | null,
    // 보드
    query: '',
    type: 'all' as Seorap.ItemType | 'all',
    pinnedOnly: false,
    tag: null as string | null,
    selected: new Set<string>(),
    renderLimit: 120,
    // 메모
    noteQuery: '',
    noteId: null as string | null,
    noteSaveTimer: null as number | null,
    // 금고
    vault: { status: null, entries: [], id: null, saveTimer: null, lastTouch: 0 } as VaultState,
    pendingDelete: null as PendingDelete | null,
  };

  const el = {
    app: $('#app'),
    grid: $('#grid'),
    sentinel: $('#sentinel'),
    empty: $('#empty'),
    emptyTitle: $('#emptyTitle'),
    emptyDesc: $('#emptyDesc'),
    search: input('#search'),
    searchClear: button('#searchClear'),
    typeChips: $('#typeChips'),
    chipPinned: button('#chipPinned'),
    tagFilter: button('#tagFilter'),
    boardScroll: $('#boardScroll'),
    dropOverlay: $('#dropOverlay'),
    dropText: $('#dropText'),
    flash: $('#flash'),
    undoBar: $('#undoBar'),
    undoText: $('#undoText'),
    undoBtn: button('#undoBtn'),
    // 메모
    noteSearch: input('#noteSearch'),
    noteList: $('#noteList'),
    noteCount: $('#noteCount'),
    optShowClipText: input('#optShowClipText'),
    editor: textarea('#editor'),
    editorEmpty: $('#editorEmpty'),
    findBar: $('#findBar'),
    findInput: input('#findInput'),
    findCount: $('#findCount'),
    findHl: $('#findHl'),
    editorMirror: $('#editorMirror'),
    editorStats: $('#editorStats'),
    noteTitle: $('#noteTitle'),
    saveState: $('#saveState'),
    noteTagList: $('#noteTagList'),
    noteTagInput: input('#noteTagInput'),
    // 금고
    vaultDot: $('#vaultDot'),
    vaultLocked: $('#vaultLocked'),
    vaultOpen: $('#vaultOpen'),
    lockForm: $<HTMLFormElement>('#lockForm'),
    lockPw: input('#lockPw'),
    lockPw2: input('#lockPw2'),
    lockTitle: $('#lockTitle'),
    lockDesc: $('#lockDesc'),
    lockBtn: button('#lockBtn'),
    lockErr: $('#lockErr'),
    strength: $('#strength'),
    lockAck: $('#lockAck'),
    lockAckBox: input('#lockAckBox'),
    vaultSearch: input('#vaultSearch'),
    vaultList: $('#vaultList'),
    vaultForm: $('#vaultForm'),
    vaultEmpty: $('#vaultEmpty'),
    lockCountdown: $('#lockCountdown'),
    vName: input('#vName'),
    vUrl: input('#vUrl'),
    vUser: input('#vUser'),
    vPass: input('#vPass'),
    vNotes: textarea('#vNotes'),
    vMeta: $('#vMeta'),
    vSaveState: $('#vSaveState'),
    vEye: button('#vEye'),
    // 모달
    detail: $('#detail'),
    settings: $('#settings'),
    prompt: $('#prompt'),
    switcher: $('#switcher'),
  };

  // =====================================================================
  // 유틸
  // =====================================================================
  const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s: string | number | null | undefined): string => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c] ?? c);

  function debounce(fn: () => void, ms: number): () => void {
    let t: number | null = null;
    return () => {
      if (t !== null) clearTimeout(t);
      t = window.setTimeout(fn, ms);
    };
  }

  function fmtTime(ts: number | undefined): string {
    if (!ts) return '';
    const d = new Date(ts);
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60e3) return '방금';
    if (diff < 3600e3) return `${Math.floor(diff / 60e3)}분 전`;
    if (diff < 86400e3 && d.getDate() === new Date().getDate()) return `${Math.floor(diff / 3600e3)}시간 전`;
    if (d.toDateString() === new Date(now - 86400e3).toDateString()) return '어제';
    if (d.getFullYear() === new Date().getFullYear()) return `${d.getMonth() + 1}월 ${d.getDate()}일`;
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  }
  function fmtFull(ts: number | undefined): string {
    if (!ts) return '';
    const d = new Date(ts);
    const p = (n: number): string => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  function fmtSize(b: number | undefined): string {
    if (b === undefined) return '';
    if (b < 1024) return `${b} B`;
    if (b < 1024 ** 2) return `${(b / 1024).toFixed(0)} KB`;
    if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
    return `${(b / 1024 ** 3).toFixed(2)} GB`;
  }
  function hostOf(url: string | undefined): string {
    if (!url) return '';
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }
  const TYPE_LABEL: Record<Seorap.ItemType, string> = { image: '이미지', text: '글', link: '링크', file: '파일' };
  function isTyping(): boolean {
    const a = document.activeElement;
    return a instanceof HTMLInputElement || a instanceof HTMLTextAreaElement || (a instanceof HTMLElement && a.isContentEditable);
  }
  const firstLineOf = (t: string): string => (t.trim().split('\n')[0] ?? '').trim();
  const findItem = (id: string | null): Item | undefined => (id ? state.items.find((i) => i.id === id) : undefined);
  const PIN_SVG =
    '<svg viewBox="0 0 24 24"><path d="M16 3l5 5-4.2 1.4-2.7 2.7.5 4.9-2 2-3.6-3.6L4 21l-1-1 5.6-5-3.6-3.6 2-2 4.9.5 2.7-2.7z"/></svg>';

  let flashTimer: number | null = null;
  function flash(text: string): void {
    el.flash.textContent = text;
    el.flash.hidden = false;
    if (flashTimer !== null) clearTimeout(flashTimer);
    flashTimer = window.setTimeout(() => {
      el.flash.hidden = true;
    }, 1600);
  }

  // =====================================================================
  // 모드 전환
  // =====================================================================
  function setMode(mode: Seorap.Mode): void {
    if (state.mode === 'notes' && mode !== 'notes') leaveNote();
    state.mode = mode;
    el.app.dataset['mode'] = mode;
    $$<HTMLButtonElement>('.rail-btn[data-mode]').forEach((b) => b.classList.toggle('active', b.dataset['mode'] === mode));
    $('#viewBoard').hidden = mode !== 'board';
    $('#viewNotes').hidden = mode !== 'notes';
    $('#viewVault').hidden = mode !== 'vault';
    if (mode === 'notes') renderNoteList();
    if (mode === 'vault') void refreshVault();
    if (state.settings && state.settings.lastMode !== mode) void api.setSettings({ lastMode: mode });
  }
  $$<HTMLButtonElement>('.rail-btn[data-mode]').forEach((b) =>
    b.addEventListener('click', () => {
      const m = b.dataset['mode'];
      if (m === 'board' || m === 'notes' || m === 'vault') setMode(m);
    }),
  );
  $('#railGrab').addEventListener('click', () => void grabClipboard());
  $('#railSettings').addEventListener('click', () => void openSettings());

  async function grabClipboard(): Promise<void> {
    const r = await api.captureClipboard();
    if (!r) {
      flash('클립보드가 비어 있어요');
      return;
    }
    if (r.duplicate) {
      flash('이미 저장된 항목이에요');
      highlight(r.item.id);
      return;
    }
    flash('저장했어요');
    if (state.mode === 'board') {
      el.boardScroll.scrollTop = 0;
      highlight(r.item.id);
    }
  }

  // =====================================================================
  // 데이터 로드 & 변경 반영
  // =====================================================================
  async function loadAll(): Promise<void> {
    state.items = await api.listItems();
    renderBoard();
    renderNoteList();
    evaluateStarNudge();
  }

  api.onItemsChanged((evt) => {
    switch (evt.type) {
      case 'reload':
        void loadAll();
        return;
      case 'add':
        if (!state.items.some((i) => i.id === evt.item.id)) state.items.unshift(evt.item);
        break;
      case 'update': {
        const idx = state.items.findIndex((i) => i.id === evt.item.id);
        const prev = state.items[idx];
        if (prev) {
          const keepEditorText = state.noteId === evt.item.id && document.activeElement === el.editor;
          state.items[idx] = keepEditorText ? { ...evt.item, text: prev.text } : evt.item;
        }
        break;
      }
      case 'remove': {
        const set = new Set(evt.ids);
        state.items = state.items.filter((i) => !set.has(i.id));
        evt.ids.forEach((id) => state.selected.delete(id));
        if (state.noteId && set.has(state.noteId)) {
          state.noteId = null;
          void renderEditor();
        }
        if (!el.detail.hidden && detailId && set.has(detailId)) closeModal(el.detail);
        break;
      }
    }
    renderBoard();
    renderNoteList();
    if (evt.type === 'update' && evt.item.id === state.noteId) renderEditorMeta();
    if (evt.type === 'add') evaluateStarNudge();
  });

  api.onUiAction((msg) => {
    const ids = msg.ids ?? [];
    const first = ids[0];
    switch (msg.action) {
      case 'settings':
        void openSettings();
        break;
      case 'newNote':
        setMode('notes');
        void newNote();
        break;
      case 'openNote':
        setMode('notes');
        if (first) openNote(first);
        break;
      case 'detail':
        if (first) openDetail(first);
        break;
      case 'tags':
        void promptTags(ids);
        break;
      case 'rename':
        if (first) void promptRename(first);
        break;
      case 'delete':
        softDelete(ids);
        break;
    }
  });
  api.onFlash((m) => flash(m.text));
  api.onWindowShown(() => {
    if (state.mode === 'notes' && state.noteId) el.editor.focus();
    if (state.mode === 'vault') void refreshVault();
  });
  api.onSettingsChanged((s) => {
    state.settings = s;
    applySettingsToUi();
  });

  // =====================================================================
  // 보드
  // =====================================================================
  /** 보드는 클립보드 전용이다. 메모(note)는 메모 모드에서만 다룬다. */
  const isBoardItem = (it: Item): boolean => !it.note;

  function boardItems(): Item[] {
    const q = state.query.trim().toLowerCase();
    const list = state.items.filter((it) => {
      if (!isBoardItem(it)) return false;
      if (state.type !== 'all' && it.type !== state.type) return false;
      if (state.pinnedOnly && !it.pinned) return false;
      if (state.tag && !it.tags.includes(state.tag)) return false;
      if (q) {
        const hay = [it.title, it.text, it.url, it.linkTitle, it.tags.join(' ')].join('\n').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt);
    return list;
  }

  function renderBoard(): void {
    const list = boardItems();
    const all = state.items.filter(isBoardItem);
    const counts: Record<string, number> = { all: all.length, image: 0, text: 0, link: 0, file: 0 };
    for (const it of all) counts[it.type] = (counts[it.type] ?? 0) + 1;
    for (const [k, v] of Object.entries(counts)) {
      const c = el.typeChips.querySelector(`[data-count="${k}"]`);
      if (c) c.textContent = v ? String(v) : '';
    }

    const frag = document.createDocumentFragment();
    for (const it of list.slice(0, state.renderLimit)) frag.appendChild(cardEl(it));
    el.grid.replaceChildren(frag);
    el.sentinel.hidden = list.length <= state.renderLimit;

    el.empty.hidden = list.length > 0;
    if (!el.empty.hidden) {
      if (all.length === 0) {
        el.emptyTitle.textContent = '아직 아무것도 없어요';
        const key = state.settings?.shortcuts.quickSave ?? '';
        el.emptyDesc.innerHTML = `이미지·파일·글을 이 창으로 끌어다 놓거나, <kbd>Ctrl</kbd>+<kbd>V</kbd>로 붙이세요.<br>다른 앱에서 작업 중일 때는 ${
          key ? `<kbd>${esc(key)}</kbd>로` : '트레이 메뉴에서'
        } 바로 저장할 수 있어요.`;
      } else {
        el.emptyTitle.textContent = '조건에 맞는 항목이 없어요';
        el.emptyDesc.textContent = '검색어나 필터를 바꿔 보세요.';
      }
    }
  }

  function cardEl(it: Item): HTMLDivElement {
    const d = document.createElement('div');
    d.className = `card type-${it.type}${it.pinned ? ' pinned' : ''}${state.selected.has(it.id) ? ' selected' : ''}`;
    d.dataset['id'] = it.id;
    d.draggable = true;
    d.title = it.type === 'text' ? '클릭: 복사 · 더블클릭: 메모로 보내기' : '클릭: 복사 · 더블클릭: 자세히';

    let body = '';
    if (it.type === 'image') {
      const src = it.thumbUrl ?? it.fileUrl;
      body = `<div class="card-media${it.thumbUrl ? '' : ' contain'}">${
        src ? `<img src="${esc(src)}" decoding="async" alt="">` : '<div class="noimg">미리보기 없음</div>'
      }</div>`;
    } else if (it.type === 'text') {
      const t = (it.text ?? '').trim();
      const first = firstLineOf(t);
      const rest = t.slice(first.length).trim();
      body = `<div class="card-text"><div class="t-title">${esc(first || '(빈 메모)')}</div><div class="t-body">${esc(rest)}</div></div>`;
    } else if (it.type === 'link') {
      body = `<div class="card-link"><div class="l-host">${esc(hostOf(it.url))}</div><div class="l-title">${esc(it.linkTitle ?? it.url)}</div>${
        it.linkTitle ? `<div class="l-url">${esc(it.url)}</div>` : ''
      }</div>`;
    } else {
      body = `<div class="card-file"><span class="f-ext">${esc((it.ext ?? 'file').toUpperCase())}</span><div class="f-name">${esc(it.title || it.file)}</div></div>`;
    }

    const tags = it.tags
      .slice(0, 3)
      .map((t) => `<span class="tag" data-tag="${esc(t)}">${esc(t)}</span>`)
      .join('');
    const dim = it.type === 'image' && it.width ? `${it.width}×${it.height ?? '?'}` : fmtSize(it.size);
    d.innerHTML = `
    ${body}
    <div class="card-meta"><span>${fmtTime(it.createdAt)}</span>${tags}<span class="dim">${esc(dim)}</span></div>
    <span class="pin">${PIN_SVG}</span>
    <div class="card-actions">
      <button class="act-pin" title="${it.pinned ? '고정 해제' : '고정'}">${PIN_SVG}</button>
      <button class="act-copy" title="복사"><svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg></button>
      <button class="del" title="삭제"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
    </div>`;
    return d;
  }

  const cardIds = (): string[] => $$('.card', el.grid).map((c) => c.dataset['id'] ?? '');

  // 격자 이벤트 (위임)
  el.grid.addEventListener('click', (e) => {
    const card = closest(e.target, '.card');
    const id = card?.dataset['id'];
    if (!card || !id) return;
    const act = closest<HTMLButtonElement>(e.target, 'button');
    if (act) {
      e.stopPropagation();
      if (act.classList.contains('act-pin')) void togglePin([id]);
      else if (act.classList.contains('act-copy')) void copyCard(id, card);
      else if (act.classList.contains('del')) softDelete([id]);
      return;
    }
    const tagEl = closest(e.target, '.tag');
    if (tagEl) {
      e.stopPropagation();
      setTagFilter(tagEl.dataset['tag'] ?? null);
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      if (state.selected.has(id)) state.selected.delete(id);
      else state.selected.add(id);
      card.classList.toggle('selected', state.selected.has(id));
      return;
    }
    if (e.shiftKey && state.selected.size) {
      const ids = cardIds();
      const last = [...state.selected].pop() ?? id;
      const a = ids.indexOf(last);
      const b = ids.indexOf(id);
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) {
        const x = ids[i];
        if (x) state.selected.add(x);
      }
      $$('.card', el.grid).forEach((c) => c.classList.toggle('selected', state.selected.has(c.dataset['id'] ?? '')));
      return;
    }
    selectOnly(id);
    if ((state.settings?.board.clickAction ?? 'copy') === 'copy') void copyCard(id, card);
    else openAny(id);
  });
  el.grid.addEventListener('dblclick', (e) => {
    const card = closest(e.target, '.card');
    const id = card?.dataset['id'];
    if (id && !closest(e.target, 'button')) openAny(id);
  });
  el.grid.addEventListener('contextmenu', (e) => {
    const id = closest(e.target, '.card')?.dataset['id'];
    if (!id) return;
    e.preventDefault();
    if (!state.selected.has(id)) selectOnly(id);
    void api.contextMenu([...state.selected]);
  });
  el.grid.addEventListener('dragstart', (e) => {
    const id = closest(e.target, '.card')?.dataset['id'];
    if (!id) return;
    e.preventDefault();
    if (!state.selected.has(id)) selectOnly(id);
    api.startDrag([...state.selected]);
  });
  el.boardScroll.addEventListener('click', (e) => {
    if (e.target === el.boardScroll || e.target === el.grid) {
      state.selected.clear();
      $$('.card.selected', el.grid).forEach((c) => c.classList.remove('selected'));
    }
  });

  function selectOnly(id: string): void {
    state.selected.clear();
    state.selected.add(id);
    $$('.card', el.grid).forEach((c) => c.classList.toggle('selected', c.dataset['id'] === id));
  }
  function highlight(id: string): void {
    selectOnly(id);
    el.grid.querySelector(`.card[data-id="${id}"]`)?.scrollIntoView({ block: 'nearest' });
  }
  async function copyCard(id: string, card?: HTMLElement): Promise<void> {
    const ok = await api.copyItem(id);
    const target = card ?? el.grid.querySelector<HTMLElement>(`.card[data-id="${id}"]`);
    if (target && ok) {
      // 클래스를 뗀 뒤 다음 프레임에 다시 붙여 애니메이션을 재시작한다.
      target.classList.remove('flash-copy');
      requestAnimationFrame(() => target.classList.add('flash-copy'));
    }
    if (!ok) flash('복사하지 못했어요');
  }
  function openAny(id: string): void {
    const it = findItem(id);
    if (!it) return;
    if (it.type === 'text') {
      setMode('notes');
      openNote(id);
    } else openDetail(id);
  }
  async function togglePin(ids: string[]): Promise<void> {
    const items = ids.map(findItem).filter((i): i is Item => i !== undefined);
    const all = items.every((i) => i.pinned);
    for (const it of items) await api.updateItem(it.id, { pinned: !all });
  }

  // 무한 스크롤
  new IntersectionObserver(
    (entries) => {
      if (entries.some((x) => x.isIntersecting) && boardItems().length > state.renderLimit) {
        state.renderLimit += 120;
        renderBoard();
      }
    },
    { root: el.boardScroll, rootMargin: '600px' },
  ).observe(el.sentinel);

  // 검색 / 필터
  el.search.addEventListener(
    'input',
    debounce(() => {
      state.query = el.search.value;
      el.searchClear.hidden = !state.query;
      state.renderLimit = 120;
      renderBoard();
    }, 120),
  );
  el.searchClear.addEventListener('click', () => {
    el.search.value = '';
    state.query = '';
    el.searchClear.hidden = true;
    renderBoard();
    el.search.focus();
  });
  el.typeChips.addEventListener('click', (e) => {
    const chip = closest<HTMLButtonElement>(e.target, '.chip[data-type]');
    const t = chip?.dataset['type'];
    if (!chip || !t) return;
    if (t === 'all' || t === 'image' || t === 'text' || t === 'link' || t === 'file') state.type = t;
    $$('.chip[data-type]', el.typeChips).forEach((c) => c.classList.toggle('active', c === chip));
    state.renderLimit = 120;
    renderBoard();
  });
  el.chipPinned.addEventListener('click', () => {
    state.pinnedOnly = !state.pinnedOnly;
    el.chipPinned.classList.toggle('active', state.pinnedOnly);
    renderBoard();
  });
  function setTagFilter(tag: string | null): void {
    state.tag = state.tag === tag ? null : tag;
    el.tagFilter.hidden = !state.tag;
    el.tagFilter.textContent = state.tag ? `#${state.tag} ×` : '';
    renderBoard();
  }
  el.tagFilter.addEventListener('click', () => setTagFilter(state.tag));

  // 삭제 (실행 취소 가능)
  let undoTimer: number | null = null;
  function softDelete(rawIds: string[]): void {
    const ids = rawIds.filter((id) => state.items.some((i) => i.id === id));
    if (!ids.length) return;
    if (state.pendingDelete) commitDelete();
    const removed = state.items.filter((i) => ids.includes(i.id));
    state.items = state.items.filter((i) => !ids.includes(i.id));
    ids.forEach((id) => state.selected.delete(id));
    if (state.noteId && ids.includes(state.noteId)) {
      state.noteId = null;
      void renderEditor();
    }
    state.pendingDelete = { ids, removed };
    el.undoText.textContent = ids.length > 1 ? `${ids.length}개를 삭제했어요` : '삭제했어요';
    el.undoBar.hidden = false;
    if (undoTimer !== null) clearTimeout(undoTimer);
    undoTimer = window.setTimeout(commitDelete, 6000);
    renderBoard();
    renderNoteList();
  }
  function commitDelete(): void {
    if (!state.pendingDelete) return;
    const { ids } = state.pendingDelete;
    state.pendingDelete = null;
    el.undoBar.hidden = true;
    void api.deleteItems(ids);
  }
  el.undoBtn.addEventListener('click', () => {
    if (!state.pendingDelete) return;
    if (undoTimer !== null) clearTimeout(undoTimer);
    state.items = [...state.pendingDelete.removed, ...state.items].sort((a, b) => b.createdAt - a.createdAt);
    state.pendingDelete = null;
    el.undoBar.hidden = true;
    renderBoard();
    renderNoteList();
  });

  // =====================================================================
  // 드래그 앤 드롭
  // =====================================================================
  let dragDepth = 0;
  window.addEventListener('dragenter', (e) => {
    if (!e.dataTransfer?.types.length || isNoteDrag(e.dataTransfer)) return;
    dragDepth++;
    el.dropText.textContent = state.mode === 'notes' ? '놓으면 메모로 저장돼요' : '놓으면 저장돼요';
    el.dropOverlay.hidden = false;
  });
  window.addEventListener('dragleave', () => {
    if (--dragDepth <= 0) {
      dragDepth = 0;
      el.dropOverlay.hidden = true;
    }
  });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDepth = 0;
    el.dropOverlay.hidden = true;
    if (e.dataTransfer && !isNoteDrag(e.dataTransfer)) void handleDrop(e.dataTransfer);
  });

  async function handleDrop(dt: DataTransfer): Promise<void> {
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
        const isTextFile = /\.(txt|md|markdown|log|csv|json)$/i.test(f.name) && f.size < 2 * 1024 * 1024;
        if (isTextFile && state.mode === 'notes') {
          bump(await api.addText(await f.text(), { note: true }));
        } else if (p) paths.push(p);
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
      else if (uri && /^https?:/i.test(uri) && /\.(png|jpe?g|gif|webp|bmp|svg|avif)(\?|$)/i.test(uri)) bump(await api.addUrl(uri));
      else if (uri && /^https?:/i.test(uri)) bump(await api.addText(uri, { note: false }));
      else if (text) bump(await api.addText(text, { note: state.mode === 'notes' }));
    }
    if (added || dup) {
      flash(added ? `${added}개 저장했어요${dup ? ` · ${dup}개는 이미 있어요` : ''}` : '이미 저장된 항목이에요');
      if (state.mode === 'board') el.boardScroll.scrollTop = 0;
    }
  }

  // =====================================================================
  // 메모
  // =====================================================================
  function noteItems(): Item[] {
    const q = state.noteQuery.trim().toLowerCase();
    const showClip = state.settings?.notes.showClipboardText ?? false;
    const list = state.items.filter(
      (it) => it.type === 'text' && (showClip || it.note || it.id === state.noteId) && (!q || (it.text ?? '').toLowerCase().includes(q)),
    );
    const recent = (a: Item, b: Item): number => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt);
    if (noteSortMode() === 'manual') {
      // 순서가 없는(새) 메모는 맨 위에 최신순으로, 나머지는 사용자가 정한 순서대로.
      list.sort((a, b) => {
        if (a.order === undefined && b.order === undefined) return recent(a, b);
        if (a.order === undefined) return -1;
        if (b.order === undefined) return 1;
        return a.order - b.order;
      });
    } else list.sort((a, b) => Number(b.pinned) - Number(a.pinned) || recent(a, b));
    return list;
  }
  const noteSortMode = (): Seorap.NoteSort => state.settings?.notes.sort ?? 'recent';

  function groupOf(ts: number): string {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return '오늘';
    if (d.toDateString() === new Date(now.getTime() - 86400e3).toDateString()) return '어제';
    if (now.getTime() - ts < 7 * 86400e3) return '이번 주';
    if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) return '이번 달';
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
  }

  function renderNoteList(): void {
    if (state.mode !== 'notes') return;
    const list = noteItems();
    el.noteCount.textContent = list.length ? `${list.length}개` : '';
    if (!list.length) {
      el.noteList.innerHTML = `<div class="none">${state.noteQuery ? '검색 결과가 없어요' : '메모가 없어요.<br><b>Ctrl+N</b>으로 시작하세요.'}</div>`;
      return;
    }
    const manual = noteSortMode() === 'manual';
    el.noteList.classList.toggle('manual', manual);
    const frag = document.createDocumentFragment();
    if (manual) {
      const hint = document.createElement('div');
      hint.className = 'sort-hint';
      hint.innerHTML = `<span>직접 정렬 · 끌어서 옮기세요</span><button type="button" id="sortReset">최신순으로</button>`;
      frag.appendChild(hint);
    }
    let lastGroup: string | null = null;
    for (const it of list) {
      const g = manual ? null : it.pinned ? '고정' : groupOf(it.updatedAt ?? it.createdAt);
      if (g !== null && g !== lastGroup) {
        const h = document.createElement('div');
        h.className = 'group';
        h.textContent = g;
        frag.appendChild(h);
        lastGroup = g;
      }
      const t = (it.text ?? '').trim();
      const first = firstLineOf(t);
      const snip = t.slice(first.length).trim().replace(/\s+/g, ' ').slice(0, 80);
      const d = document.createElement('div');
      d.className = 'note-item' + (it.id === state.noteId ? ' active' : '');
      d.dataset['id'] = it.id;
      d.draggable = !state.noteQuery.trim();
      d.innerHTML = `
      <div class="n-title${first ? '' : ' untitled'}">${it.pinned ? PIN_SVG : ''}<span>${esc(first || '새 메모')}</span></div>
      <div class="n-sub"><span class="n-snip">${esc(snip || (first ? '' : '내용 없음'))}</span><span class="n-time">${fmtTime(it.updatedAt ?? it.createdAt)}</span></div>
      ${it.tags.length ? `<div class="n-tags">${it.tags.map((x) => `<span>${esc(x)}</span>`).join('')}</div>` : ''}`;
      frag.appendChild(d);
    }
    el.noteList.replaceChildren(frag);
  }

  el.noteList.addEventListener('click', (e) => {
    if (closest(e.target, '#sortReset')) {
      void save({ notes: { sort: 'recent' } });
      return;
    }
    const id = closest(e.target, '.note-item')?.dataset['id'];
    if (id) openNote(id);
  });

  // ---------- 리스트 드래그 정렬 ----------
  // 한 번이라도 끌어서 옮기면 '직접 정렬' 모드가 된다. 검색 중에는 순서가 왜곡되므로 끌 수 없다.
  const NOTE_DRAG_MIME = 'application/x-seorap-note';
  const drag = { id: null as string | null, over: null as HTMLElement | null, after: false };
  const isNoteDrag = (dt: DataTransfer | null): boolean => !!dt && Array.from(dt.types).includes(NOTE_DRAG_MIME);
  function clearDropMarks(): void {
    drag.over?.classList.remove('drop-before', 'drop-after');
    drag.over = null;
  }
  el.noteList.addEventListener('dragstart', (e) => {
    const row = closest(e.target, '.note-item');
    const id = row?.dataset['id'];
    if (!row || !id || !e.dataTransfer || state.noteQuery.trim()) {
      e.preventDefault();
      return;
    }
    drag.id = id;
    e.dataTransfer.setData(NOTE_DRAG_MIME, id);
    e.dataTransfer.effectAllowed = 'move';
    row.classList.add('dragging');
  });
  el.noteList.addEventListener('dragover', (e) => {
    if (!drag.id || !isNoteDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const row = closest(e.target, '.note-item');
    if (!row || row.dataset['id'] === drag.id) {
      clearDropMarks();
      return;
    }
    const r = row.getBoundingClientRect();
    const after = e.clientY > r.top + r.height / 2;
    if (row !== drag.over || after !== drag.after) {
      clearDropMarks();
      drag.over = row;
      drag.after = after;
      row.classList.add(after ? 'drop-after' : 'drop-before');
    }
  });
  el.noteList.addEventListener('drop', (e) => {
    if (!drag.id || !isNoteDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    const target = drag.over?.dataset['id'] ?? null;
    const after = drag.after;
    const id = drag.id;
    endNoteDrag();
    if (!target || target === id) return;
    void moveNote(id, target, after);
  });
  el.noteList.addEventListener('dragend', endNoteDrag);
  function endNoteDrag(): void {
    clearDropMarks();
    el.noteList.querySelector('.note-item.dragging')?.classList.remove('dragging');
    drag.id = null;
  }
  /** id 를 target 앞(또는 뒤)으로 옮기고 전체 순서를 저장한다. 최신순이었다면 지금 보이는 순서를 출발점으로 직접 정렬로 전환. */
  async function moveNote(id: string, target: string | null, after: boolean): Promise<void> {
    const ids = noteItems().map((it) => it.id);
    const from = ids.indexOf(id);
    if (from === -1) return;
    ids.splice(from, 1);
    let to = target ? ids.indexOf(target) : -1;
    if (to === -1) to = ids.length;
    else if (after) to += 1;
    ids.splice(to, 0, id);
    ids.forEach((x, i) => {
      const it = findItem(x);
      if (it) it.order = i;
    });
    if (noteSortMode() !== 'manual') await save({ notes: { sort: 'manual' } });
    renderNoteList();
    await api.reorderItems(ids);
  }
  $('#btnNoteSort').addEventListener('click', () => {
    const manual = noteSortMode() === 'manual';
    if (manual) {
      void save({ notes: { sort: 'recent' } });
      return;
    }
    // 최신순 → 직접 정렬: 지금 보이는 순서를 그대로 고정한다.
    const ids = noteItems().map((it) => it.id);
    ids.forEach((x, i) => {
      const it = findItem(x);
      if (it) it.order = i;
    });
    void api.reorderItems(ids);
    void save({ notes: { sort: 'manual' } });
  });
  el.noteList.addEventListener('contextmenu', (e) => {
    const id = closest(e.target, '.note-item')?.dataset['id'];
    if (!id) return;
    e.preventDefault();
    void api.contextMenu([id]);
  });
  el.noteSearch.addEventListener(
    'input',
    debounce(() => {
      state.noteQuery = el.noteSearch.value;
      renderNoteList();
    }, 100),
  );
  $('#btnNewNote').addEventListener('click', () => void newNote());
  el.optShowClipText.addEventListener('change', () => void api.setSettings({ notes: { showClipboardText: el.optShowClipText.checked } }));

  async function newNote(): Promise<void> {
    leaveNote();
    const r = await api.addNote();
    if (!r) return;
    if (!state.items.some((i) => i.id === r.item.id)) state.items.unshift(r.item);
    openNote(r.item.id);
  }

  function openNote(id: string): void {
    if (state.noteId && state.noteId !== id) leaveNote();
    state.noteId = id;
    const it = findItem(id);
    if (!it) {
      state.noteId = null;
      void renderEditor();
      return;
    }
    if (!it.note) {
      it.note = true;
      void api.updateItem(id, { note: true });
    }
    void renderEditor();
    renderNoteList();
    el.noteList.querySelector(`.note-item[data-id="${id}"]`)?.scrollIntoView({ block: 'nearest' });
    el.editor.focus();
  }

  /** 편집기를 떠날 때: 대기 중인 저장을 즉시 반영하고, 빈 메모는 조용히 지운다. */
  function leaveNote(): void {
    if (state.noteSaveTimer !== null) {
      clearTimeout(state.noteSaveTimer);
      state.noteSaveTimer = null;
      void saveNoteNow();
    }
    const it = findItem(state.noteId);
    if (it?.note && !(it.text ?? '').trim() && !it.tags.length) {
      state.items = state.items.filter((i) => i.id !== it.id);
      void api.deleteItems([it.id]);
    }
  }

  const noteActionButtons = (): HTMLButtonElement[] => $$<HTMLButtonElement>('.pane-actions .icon-btn', $('#viewNotes'));

  async function renderEditor(): Promise<void> {
    const it = findItem(state.noteId);
    const has = it !== undefined;
    el.editor.hidden = !has;
    el.editorEmpty.hidden = has;
    noteActionButtons().forEach((b) => {
      b.disabled = !has;
      b.style.opacity = has ? '' : '.35';
    });
    el.noteTagInput.disabled = !has;
    if (!has) closeFind();
    if (!it) {
      el.noteTitle.textContent = '메모';
      el.saveState.textContent = '';
      el.editorStats.textContent = '';
      el.noteTagList.innerHTML = '';
      return;
    }
    const text = it.truncated ? await api.fullText(it.id) : (it.text ?? '');
    if (el.editor.value !== text) el.editor.value = text;
    if (!el.findBar.hidden) {
      find.index = -1;
      findMatches();
      renderFindCount();
      el.findHl.hidden = true;
    }
    renderEditorMeta();
    el.saveState.textContent = it.updatedAt ? `저장됨 · ${fmtTime(it.updatedAt)}` : '';
    el.saveState.classList.remove('saving');
  }
  function renderEditorMeta(): void {
    const it = findItem(state.noteId);
    if (!it) return;
    const text = el.editor.value;
    el.noteTitle.textContent = firstLineOf(text) || '새 메모';
    const lines = text ? text.split('\n').length : 0;
    el.editorStats.textContent = text ? `${text.length.toLocaleString()}자 · ${lines}줄` : '';
    $('#btnNotePin').classList.toggle('active', it.pinned);
    $('#btnNoteMono').classList.toggle('active', state.settings?.notes.mono ?? false);
    el.noteTagList.innerHTML = it.tags.map((t) => `<span class="tag" data-tag="${esc(t)}">${esc(t)}<b>×</b></span>`).join('');
  }

  el.editor.addEventListener('input', () => {
    const it = findItem(state.noteId);
    if (!it) return;
    it.text = el.editor.value;
    it.updatedAt = Date.now();
    el.saveState.textContent = '저장 중…';
    el.saveState.classList.add('saving');
    renderEditorMeta();
    if (state.noteSaveTimer !== null) clearTimeout(state.noteSaveTimer);
    state.noteSaveTimer = window.setTimeout(() => void saveNoteNow(), 500);
  });
  el.editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      el.editor.setRangeText('\t', el.editor.selectionStart, el.editor.selectionEnd, 'end');
      el.editor.dispatchEvent(new Event('input'));
    }
  });
  async function saveNoteNow(): Promise<void> {
    state.noteSaveTimer = null;
    const id = state.noteId;
    if (!id || !findItem(id)) return;
    const saved = await api.updateItem(id, { text: el.editor.value, note: true });
    if (saved && state.noteId === id) {
      el.saveState.textContent = '저장됨 · 방금';
      el.saveState.classList.remove('saving');
    }
    renderNoteList();
  }
  // ---------- 메모 안 찾기 (Ctrl+F) ----------
  // 브라우저처럼 대소문자 구분 없이 앉은 자리부터 다음 일치를 찾아 선택한다. 편집기 내용은 건드리지 않는다.
  const find = { matches: [] as number[], index: -1 };
  function findMatches(): void {
    const q = el.findInput.value.toLowerCase();
    find.matches = [];
    if (!q) return;
    const hay = el.editor.value.toLowerCase();
    for (let i = hay.indexOf(q); i !== -1; i = hay.indexOf(q, i + q.length)) find.matches.push(i);
  }
  function renderFindCount(): void {
    const n = find.matches.length;
    const q = el.findInput.value;
    el.findCount.textContent = !q ? '' : n ? `${find.index + 1} / ${n}` : '결과 없음';
    el.findCount.classList.toggle('none', !!q && !n);
  }
  /** 선택을 옮기고 그 위치가 보이도록 스크롤한다. 포커스는 찾기 입력칸에 남긴다. */
  function revealMatch(i: number): void {
    const start = find.matches[i];
    if (start === undefined) return;
    find.index = i;
    const end = start + el.findInput.value.length;
    // textarea 는 포커스를 받을 때 선택 영역을 화면에 드러내므로, 잠깐 포커스를 넘긴 뒤 되찾아 온다.
    el.editor.focus({ preventScroll: true });
    el.editor.setSelectionRange(start, end);
    scrollEditorToSelection(start);
    el.findInput.focus({ preventScroll: true });
    renderFindCount();
    drawFindHighlight();
  }
  /** 거울 div 에 같은 글을 넣고 일치 구간을 span 으로 감싸 좌표를 읽는다. */
  function drawFindHighlight(): void {
    const start = find.matches[find.index];
    if (start === undefined || el.findBar.hidden) {
      el.findHl.hidden = true;
      return;
    }
    const text = el.editor.value;
    const end = start + el.findInput.value.length;
    const m = el.editorMirror;
    m.style.width = `${el.editor.clientWidth}px`;
    m.replaceChildren(document.createTextNode(text.slice(0, start)), Object.assign(document.createElement('span'), { textContent: text.slice(start, end) }));
    const span = m.querySelector('span');
    const r = span?.getClientRects()[0];
    if (!r) {
      el.findHl.hidden = true;
      return;
    }
    const base = m.getBoundingClientRect();
    const top = r.top - base.top - el.editor.scrollTop;
    if (top < -r.height || top > el.editor.clientHeight) {
      el.findHl.hidden = true;
      return;
    }
    el.findHl.style.top = `${top}px`;
    el.findHl.style.left = `${r.left - base.left}px`;
    el.findHl.style.width = `${Math.max(2, r.width)}px`;
    el.findHl.style.height = `${r.height}px`;
    el.findHl.hidden = false;
  }
  el.editor.addEventListener('scroll', () => {
    if (!el.findBar.hidden) drawFindHighlight();
  });
  function scrollEditorToSelection(pos: number): void {
    // 선택 위치까지의 줄 수로 대략적인 y 를 구해 가운데쯤 오도록 스크롤한다.
    const before = el.editor.value.slice(0, pos);
    const lineHeight = parseFloat(getComputedStyle(el.editor).lineHeight) || 24;
    const line = before.split('\n').length - 1;
    const y = line * lineHeight;
    const view = el.editor.clientHeight;
    if (y < el.editor.scrollTop + lineHeight || y > el.editor.scrollTop + view - lineHeight * 2) {
      el.editor.scrollTop = Math.max(0, y - view / 2);
    }
  }
  function findStep(dir: 1 | -1): void {
    findMatches();
    if (!find.matches.length) {
      find.index = -1;
      renderFindCount();
      el.findHl.hidden = true;
      return;
    }
    // 처음 실행이면 커서 뒤의 첫 일치부터, 이후엔 순환.
    if (find.index < 0 || find.index >= find.matches.length) {
      const from = el.editor.selectionStart;
      const first = find.matches.findIndex((m) => m >= from);
      revealMatch(dir === 1 ? (first === -1 ? 0 : first) : first <= 0 ? find.matches.length - 1 : first - 1);
      return;
    }
    revealMatch((find.index + dir + find.matches.length) % find.matches.length);
  }
  function openFind(): void {
    if (!state.noteId) return;
    const sel = el.editor.value.slice(el.editor.selectionStart, el.editor.selectionEnd);
    if (sel && !sel.includes('\n') && sel.length <= 100) el.findInput.value = sel;
    el.findBar.hidden = false;
    find.index = -1;
    el.findInput.focus();
    el.findInput.select();
    findMatches();
    if (el.findInput.value) findStep(1);
    else renderFindCount();
  }
  function closeFind(): void {
    if (el.findBar.hidden) return;
    el.findBar.hidden = true;
    el.findHl.hidden = true;
    find.matches = [];
    find.index = -1;
    if (state.noteId) el.editor.focus({ preventScroll: true });
  }
  el.findInput.addEventListener('input', () => {
    find.index = -1;
    findStep(1);
  });
  el.findInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      findStep(e.shiftKey ? -1 : 1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeFind();
    }
  });
  $('#findNext').addEventListener('click', () => findStep(1));
  $('#findPrev').addEventListener('click', () => findStep(-1));
  $('#findClose').addEventListener('click', closeFind);
  el.editor.addEventListener('input', () => {
    if (el.findBar.hidden) return;
    find.index = -1;
    findMatches();
    renderFindCount();
    el.findHl.hidden = true;
  });

  $('#btnNotePin').addEventListener('click', () => {
    if (state.noteId) void togglePin([state.noteId]);
  });
  $('#btnNoteMono').addEventListener('click', () => void api.setSettings({ notes: { mono: !(state.settings?.notes.mono ?? false) } }));
  $('#btnNoteCopy').addEventListener('click', () => {
    if (!state.noteId) return;
    void api.copyItem(state.noteId).then((ok) => {
      if (ok) flash('메모를 복사했어요');
    });
  });
  $('#btnNoteDelete').addEventListener('click', () => {
    if (state.noteId) softDelete([state.noteId]);
  });
  el.noteTagInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    void addTag(state.noteId, el.noteTagInput.value);
    el.noteTagInput.value = '';
  });
  el.noteTagList.addEventListener('click', (e) => {
    const t = closest(e.target, '.tag')?.dataset['tag'];
    if (t) void removeTag(state.noteId, t);
  });
  async function addTag(id: string | null, raw: string): Promise<void> {
    const it = findItem(id);
    const tag = raw.trim().replace(/^#/, '').slice(0, 30);
    if (!it || !tag || it.tags.includes(tag)) return;
    await api.updateItem(it.id, { tags: [...it.tags, tag] });
  }
  async function removeTag(id: string | null, tag: string): Promise<void> {
    const it = findItem(id);
    if (!it) return;
    await api.updateItem(it.id, { tags: it.tags.filter((t) => t !== tag) });
  }

  // =====================================================================
  // 빠른 전환 (Ctrl+K)
  // =====================================================================
  const sw = { input: input('#switcherInput'), list: $('#switcherList'), results: [] as Item[], index: 0 };
  function openSwitcher(): void {
    sw.input.value = '';
    renderSwitcher();
    openModal(el.switcher);
    sw.input.focus();
  }
  function switcherTitle(it: Item): string {
    if (it.type === 'link') return it.linkTitle ?? it.url ?? '';
    if (it.type === 'text') return firstLineOf(it.text ?? '') || '새 메모';
    return it.title || it.file || '';
  }
  function renderSwitcher(): void {
    const q = sw.input.value.trim().toLowerCase();
    let list = q
      ? state.items.filter((it) => [it.title, it.text, it.url, it.linkTitle, it.tags.join(' ')].join('\n').toLowerCase().includes(q))
      : state.items.filter((it) => it.type === 'text');
    list = [...list].sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt));
    sw.results = list.slice(0, 40);
    sw.index = 0;
    if (!sw.results.length) {
      sw.list.innerHTML = `<div class="sw-empty">${q ? '결과가 없어요' : '메모가 없어요'}</div>`;
      return;
    }
    sw.list.innerHTML = sw.results
      .map((it, i) => {
        const title = switcherTitle(it);
        const sub = it.type === 'text' ? (it.text ?? '').trim().slice(title.length, title.length + 120).replace(/\s+/g, ' ') : (it.url ?? '');
        return `<div class="sw-item${i === 0 ? ' active' : ''}" data-i="${i}"><span class="badge ${it.type}">${TYPE_LABEL[it.type]}</span><div class="sw-text"><div class="sw-title">${esc(
          title,
        )}</div><div class="sw-sub">${esc(sub)}</div></div><span class="sw-time">${fmtTime(it.updatedAt ?? it.createdAt)}</span></div>`;
      })
      .join('');
  }
  sw.input.addEventListener('input', renderSwitcher);
  sw.input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!sw.results.length) return;
      sw.index = (sw.index + (e.key === 'ArrowDown' ? 1 : -1) + sw.results.length) % sw.results.length;
      $$('.sw-item', sw.list).forEach((x, i) => x.classList.toggle('active', i === sw.index));
      sw.list.querySelector('.sw-item.active')?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pickSwitcher(sw.index);
    }
  });
  sw.list.addEventListener('click', (e) => {
    const row = closest(e.target, '.sw-item');
    if (row) pickSwitcher(Number(row.dataset['i']));
  });
  function pickSwitcher(i: number): void {
    const it = sw.results[i];
    if (!it) return;
    closeModal(el.switcher);
    openAny(it.id);
  }

  // =====================================================================
  // 상세 보기 (이미지/링크/파일)
  // =====================================================================
  let detailId: string | null = null;
  const detailTitle = input('#detailTitle');
  const dPin = button('#dPin');

  function openDetail(id: string): void {
    const it = findItem(id);
    if (!it) return;
    if (it.type === 'text') {
      setMode('notes');
      openNote(id);
      return;
    }
    detailId = id;
    const badge = $('#detailType');
    badge.textContent = TYPE_LABEL[it.type];
    badge.className = 'badge ' + it.type;
    detailTitle.value = it.type === 'link' ? (it.linkTitle ?? '') : it.title;
    detailTitle.readOnly = it.type === 'link';
    const body = $('#detailBody');
    if (it.type === 'image') body.innerHTML = `<img src="${esc(it.fileUrl)}" alt="">`;
    else if (it.type === 'link')
      body.innerHTML = `<div class="link-view"><div class="l-host badge link">${esc(hostOf(it.url))}</div><div class="l-title">${esc(
        it.linkTitle ?? '',
      )}</div><a href="#" data-url="${esc(it.url)}">${esc(it.url)}</a></div>`;
    else
      body.innerHTML = `<div class="file-view"><span class="f-ext">${esc((it.ext ?? 'FILE').toUpperCase())}</span><div class="f-name">${esc(
        it.title || it.file,
      )}</div><div class="muted">${fmtSize(it.size)}</div></div>`;
    renderDetailTags();
    const dim = it.type === 'image' && it.width ? ` · ${it.width}×${it.height ?? '?'}` : '';
    $('#detailMeta').textContent = `${fmtFull(it.createdAt)}${dim}${it.size ? ' · ' + fmtSize(it.size) : ''}`;
    dPin.textContent = it.pinned ? '고정 해제' : '고정';
    openModal(el.detail);
  }
  function renderDetailTags(): void {
    const it = findItem(detailId);
    if (!it) return;
    $('#detailTagList').innerHTML = it.tags.map((t) => `<span class="tag" data-tag="${esc(t)}">${esc(t)}<b>×</b></span>`).join('');
  }
  $('#detailBody').addEventListener('click', (e) => {
    const a = closest<HTMLAnchorElement>(e.target, 'a[data-url]');
    const url = a?.dataset['url'];
    if (url) {
      e.preventDefault();
      void api.openExternal(url);
    }
  });
  detailTitle.addEventListener('change', () => {
    if (detailId) void api.updateItem(detailId, { title: detailTitle.value.trim() });
  });
  input('#detailTagInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      e.preventDefault();
      void addTag(detailId, e.target.value).then(renderDetailTags);
      e.target.value = '';
    }
  });
  $('#detailTagList').addEventListener('click', (e) => {
    const t = closest(e.target, '.tag')?.dataset['tag'];
    if (t) void removeTag(detailId, t).then(renderDetailTags);
  });
  dPin.addEventListener('click', () => {
    if (!detailId) return;
    void togglePin([detailId]).then(() => {
      dPin.textContent = findItem(detailId)?.pinned ? '고정 해제' : '고정';
    });
  });
  $('#dOpen').addEventListener('click', () => {
    if (detailId) void api.openItem(detailId);
  });
  $('#dFolder').addEventListener('click', () => {
    if (detailId) void api.showInFolder(detailId);
  });
  $('#dDelete').addEventListener('click', () => {
    const id = detailId;
    closeModal(el.detail);
    if (id) softDelete([id]);
  });
  $('#dCopy').addEventListener('click', () => {
    if (!detailId) return;
    void api.copyItem(detailId).then((ok) => {
      if (ok) flash('클립보드에 복사했어요');
    });
  });

  // =====================================================================
  // 범용 프롬프트
  // =====================================================================
  interface PromptField {
    type?: 'text' | 'password';
    placeholder?: string;
    value?: string;
  }
  interface PromptOptions {
    title: string;
    desc?: string;
    fields?: PromptField[];
    okText?: string;
    validate?: (values: string[]) => Promise<string | null> | string | null;
  }
  let promptCancel: (() => void) | null = null;

  function promptDialog(opts: PromptOptions): Promise<string[] | null> {
    const fields = opts.fields ?? [];
    return new Promise((resolve) => {
      $('#promptTitle').textContent = opts.title;
      const desc = $('#promptDesc');
      desc.textContent = opts.desc ?? '';
      desc.hidden = !opts.desc;
      $('#promptErr').textContent = '';
      const wrap = $('#promptFields');
      wrap.innerHTML = fields
        .map(
          (f, i) =>
            `<input id="pf${i}" type="${f.type ?? 'text'}" placeholder="${esc(f.placeholder ?? '')}" value="${esc(f.value ?? '')}" autocomplete="off" spellcheck="false">`,
        )
        .join('');
      wrap.hidden = !fields.length;
      const ok = button('#promptOk');
      ok.textContent = opts.okText ?? '확인';
      const values = (): string[] => fields.map((_f, i) => input(`#pf${i}`).value);

      const cleanup = (): void => {
        ok.onclick = null;
        wrap.removeEventListener('keydown', onKey);
        closeBtns.forEach((b) => b.removeEventListener('click', onCancel));
        promptCancel = null;
      };
      const finish = (val: string[] | null): void => {
        cleanup();
        closeModal(el.prompt);
        resolve(val);
      };
      const submit = async (): Promise<void> => {
        const v = values();
        if (opts.validate) {
          const err = await opts.validate(v);
          if (err) {
            $('#promptErr').textContent = err;
            return;
          }
        }
        finish(fields.length ? v : []);
      };
      const onKey = (e: KeyboardEvent): void => {
        if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
          e.preventDefault();
          void submit();
        }
      };
      const onCancel = (): void => finish(null);
      const closeBtns = $$('[data-close]', el.prompt);
      ok.onclick = () => void submit();
      wrap.addEventListener('keydown', onKey);
      closeBtns.forEach((b) => b.addEventListener('click', onCancel));
      promptCancel = onCancel;
      openModal(el.prompt);
      const first = wrap.querySelector<HTMLInputElement>('#pf0');
      if (first) {
        first.focus();
        first.select();
      }
    });
  }
  async function promptTags(ids: string[]): Promise<void> {
    const items = ids.map(findItem).filter((i): i is Item => i !== undefined);
    const head = items[0];
    if (!head) return;
    const common = items.length === 1 ? head.tags : items.reduce<string[]>((acc, it) => acc.filter((t) => it.tags.includes(t)), head.tags);
    const r = await promptDialog({
      title: items.length > 1 ? `${items.length}개 항목 태그` : '태그 편집',
      desc: '쉼표나 공백으로 구분해요.',
      fields: [{ value: common.join(', '), placeholder: '업무, 참고' }],
    });
    const raw = r?.[0];
    if (raw === undefined) return;
    const tags = [
      ...new Set(
        raw
          .split(/[,\s]+/)
          .map((t) => t.replace(/^#/, '').trim())
          .filter(Boolean),
      ),
    ].slice(0, 20);
    for (const it of items) {
      const merged = items.length > 1 ? [...new Set([...it.tags.filter((t) => !common.includes(t)), ...tags])] : tags;
      await api.updateItem(it.id, { tags: merged });
    }
  }
  async function promptRename(id: string): Promise<void> {
    const it = findItem(id);
    if (!it) return;
    const r = await promptDialog({ title: '이름 바꾸기', fields: [{ value: it.title }] });
    const v = r?.[0];
    if (v !== undefined) await api.updateItem(id, { title: v.trim() });
  }
  async function confirmDialog(title: string, desc: string, okText = '삭제'): Promise<boolean> {
    return (await promptDialog({ title, desc, okText })) !== null;
  }

  // =====================================================================
  // 금고
  // =====================================================================
  const V = state.vault;
  async function refreshVault(): Promise<void> {
    V.status = await api.vault.status();
    el.vaultDot.hidden = !V.status.unlocked;
    if (V.status.unlocked) {
      el.vaultLocked.hidden = true;
      el.vaultOpen.hidden = false;
      await loadVaultList();
    } else {
      el.vaultLocked.hidden = false;
      el.vaultOpen.hidden = true;
      renderLockScreen();
    }
  }
  function renderLockScreen(): void {
    const setup = !(V.status?.exists ?? false);
    el.lockTitle.textContent = setup ? '금고 만들기' : '금고가 잠겨 있어요';
    el.lockDesc.textContent = setup
      ? '마스터 비밀번호 하나로 모든 항목을 암호화해요. 이 비밀번호는 어디에도 저장되지 않으니 꼭 기억하세요.'
      : '마스터 비밀번호를 입력하세요.';
    el.lockPw2.hidden = !setup;
    el.strength.hidden = !setup;
    el.lockAck.hidden = !setup;
    el.lockBtn.textContent = setup ? '금고 만들기' : '열기';
    el.lockPw.value = '';
    el.lockPw2.value = '';
    el.lockAckBox.checked = false;
    el.lockErr.textContent = '';
    el.strength.dataset['score'] = '0';
    if (state.mode === 'vault') window.setTimeout(() => el.lockPw.focus(), 30);
  }
  el.lockPw.addEventListener('input', () => {
    if (V.status?.exists) return;
    void api.vault.strength(el.lockPw.value).then((s) => {
      el.strength.dataset['score'] = String(el.lockPw.value ? (s.ok ? s.score : Math.max(1, s.score)) : 0);
    });
  });
  el.lockForm.addEventListener('submit', (e) => {
    e.preventDefault();
    void submitLock();
  });
  async function submitLock(): Promise<void> {
    const pw = el.lockPw.value;
    if (!pw) return;
    el.lockBtn.disabled = true;
    el.lockErr.textContent = '';
    try {
      let r: Seorap.VaultResult<Seorap.VaultStatus>;
      if (!(V.status?.exists ?? false)) {
        if (pw !== el.lockPw2.value) throw new Error('두 비밀번호가 달라요.');
        if (!el.lockAckBox.checked) throw new Error('복구 불가 안내를 확인해 주세요.');
        r = await api.vault.setup(pw);
      } else {
        r = await api.vault.unlock(pw);
      }
      if (!r.ok) throw new Error(r.error);
      el.lockPw.value = '';
      el.lockPw2.value = '';
      V.lastTouch = Date.now();
      await refreshVault();
    } catch (err) {
      el.lockErr.textContent = err instanceof Error ? err.message : String(err);
      el.lockPw.select();
    } finally {
      el.lockBtn.disabled = false;
    }
  }
  api.vault.onLocked(({ reason }) => {
    V.entries = [];
    V.id = null;
    clearVaultForm();
    el.vaultDot.hidden = true;
    if (state.mode === 'vault') {
      void refreshVault();
      if (reason === 'timeout') flash('사용하지 않아 금고를 잠갔어요');
    }
  });

  async function loadVaultList(): Promise<void> {
    const r = await api.vault.list();
    if (!r.ok) {
      await refreshVault();
      return;
    }
    V.entries = r.result;
    renderVaultList();
    if (V.id && !V.entries.some((x) => x.id === V.id)) V.id = null;
    await renderVaultForm();
  }
  function renderVaultList(): void {
    const q = el.vaultSearch.value.trim().toLowerCase();
    const list = V.entries
      .filter((x) => !q || [x.name, x.username, x.url].join('\n').toLowerCase().includes(q))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.name.localeCompare(b.name, 'ko') || b.updatedAt - a.updatedAt);
    if (!list.length) {
      el.vaultList.innerHTML = `<div class="none">${q ? '검색 결과가 없어요' : '항목이 없어요.<br>+ 로 추가하세요.'}</div>`;
      return;
    }
    el.vaultList.innerHTML = list
      .map(
        (x) => `
    <div class="note-item${x.id === V.id ? ' active' : ''}" data-id="${x.id}">
      <div class="n-title${x.name ? '' : ' untitled'}"><span>${esc(x.name || '이름 없음')}</span></div>
      <div class="n-sub"><span class="n-snip">${esc(x.username || hostOf(x.url))}</span><span class="n-time">${fmtTime(x.updatedAt)}</span></div>
    </div>`,
      )
      .join('');
  }
  el.vaultSearch.addEventListener('input', renderVaultList);
  el.vaultList.addEventListener('click', (e) => {
    const id = closest(e.target, '.note-item')?.dataset['id'];
    if (id) void selectSecret(id);
  });
  $('#btnNewSecret').addEventListener('click', () => {
    void (async () => {
      const r = await api.vault.add({ name: '' });
      if (!r.ok) {
        flash(r.error);
        return;
      }
      await loadVaultList();
      await selectSecret(r.result.id);
      el.vName.focus();
    })();
  });
  $('#btnLock').addEventListener('click', () => void api.vault.lock());

  async function selectSecret(id: string): Promise<void> {
    await flushVaultSave();
    V.id = id;
    renderVaultList();
    await renderVaultForm();
  }
  function setPassVisible(show: boolean): void {
    el.vPass.type = show ? 'text' : 'password';
    el.vPass.classList.toggle('shown', show);
    el.vEye.classList.toggle('active', show);
  }
  function clearVaultForm(): void {
    for (const f of [el.vName, el.vUrl, el.vUser, el.vPass]) f.value = '';
    el.vNotes.value = '';
    setPassVisible(false);
  }
  async function renderVaultForm(): Promise<void> {
    const x = V.entries.find((y) => y.id === V.id);
    el.vaultForm.hidden = !x;
    el.vaultEmpty.hidden = !!x;
    if (!x) {
      clearVaultForm();
      return;
    }
    el.vName.value = x.name;
    el.vUrl.value = x.url;
    el.vUser.value = x.username;
    el.vNotes.value = x.notes;
    setPassVisible(false);
    const s = await api.vault.secret(x.id);
    el.vPass.value = s.ok ? s.result : '';
    el.vMeta.textContent = `만든 날 ${fmtFull(x.createdAt)} · 수정 ${fmtTime(x.updatedAt)}`;
    el.vSaveState.textContent = '';
    touchVault();
  }
  function vaultPatch(): Seorap.VaultFields {
    return { name: el.vName.value, url: el.vUrl.value.trim(), username: el.vUser.value, password: el.vPass.value, notes: el.vNotes.value };
  }
  function scheduleVaultSave(): void {
    if (!V.id) return;
    el.vSaveState.textContent = '저장 중…';
    el.vSaveState.classList.add('saving');
    if (V.saveTimer !== null) clearTimeout(V.saveTimer);
    V.saveTimer = window.setTimeout(() => void flushVaultSave(), 600);
    touchVault();
  }
  async function flushVaultSave(): Promise<void> {
    if (V.saveTimer === null) return;
    clearTimeout(V.saveTimer);
    V.saveTimer = null;
    const id = V.id;
    if (!id) return;
    const r = await api.vault.update(id, vaultPatch());
    if (r.ok) {
      const idx = V.entries.findIndex((x) => x.id === id);
      if (idx >= 0 && r.result) V.entries[idx] = r.result;
      renderVaultList();
      if (V.id === id) {
        el.vSaveState.textContent = '저장됨 · 방금';
        el.vSaveState.classList.remove('saving');
      }
    } else {
      flash(r.error);
      await refreshVault();
    }
  }
  for (const f of [el.vName, el.vUrl, el.vUser, el.vPass, el.vNotes]) f.addEventListener('input', scheduleVaultSave);
  el.vEye.addEventListener('click', () => {
    setPassVisible(el.vPass.type === 'password');
    touchVault();
  });
  $('#vGen').addEventListener('click', () => {
    void api.vault.generate(20, true).then((pw) => {
      el.vPass.value = pw;
      setPassVisible(true);
      scheduleVaultSave();
    });
  });
  $('#vCopyPass').addEventListener('click', () => {
    void (async () => {
      await flushVaultSave();
      if (!V.id) return;
      const r = await api.vault.copy(V.id, 'password');
      if (!r.ok || !r.result) flash('복사할 비밀번호가 없어요');
      else touchVault();
    })();
  });
  $('#vCopyUser').addEventListener('click', () => {
    void (async () => {
      await flushVaultSave();
      if (!V.id) return;
      const r = await api.vault.copy(V.id, 'username');
      flash(r.ok && r.result ? '아이디를 복사했어요' : '복사할 아이디가 없어요');
    })();
  });
  $('#vOpenUrl').addEventListener('click', () => {
    const u = el.vUrl.value.trim();
    if (/^https?:/i.test(u)) void api.openExternal(u);
  });
  $('#vDelete').addEventListener('click', () => {
    void (async () => {
      const x = V.entries.find((y) => y.id === V.id);
      if (!x) return;
      const ok = await confirmDialog(`'${x.name || '이름 없음'}' 삭제`, '금고 항목은 실행 취소가 없어요. 정말 삭제할까요?');
      if (!ok) return;
      if (V.saveTimer !== null) {
        clearTimeout(V.saveTimer);
        V.saveTimer = null;
      }
      await api.vault.remove(x.id);
      V.id = null;
      await loadVaultList();
    })();
  });

  // 자동 잠금 카운트다운 & 활동 갱신
  let touchThrottle = 0;
  function touchVault(): void {
    V.lastTouch = Date.now();
    if (Date.now() - touchThrottle > 20000) {
      touchThrottle = Date.now();
      void api.vault.touch();
    }
  }
  window.setInterval(() => {
    if (state.mode !== 'vault' || !V.status?.unlocked) return;
    const min = state.settings?.vault.autoLockMinutes ?? 0;
    if (!min) {
      el.lockCountdown.textContent = '자동 잠금 꺼짐';
      return;
    }
    const left = Math.max(0, min * 60000 - (Date.now() - V.lastTouch));
    const m = Math.floor(left / 60000);
    const s = Math.floor((left % 60000) / 1000);
    el.lockCountdown.textContent = left > 0 ? `${m}:${String(s).padStart(2, '0')} 후 잠김` : '';
  }, 1000);
  $('#viewVault').addEventListener('pointerdown', () => {
    if (V.status?.unlocked) touchVault();
  });
  $('#viewVault').addEventListener('keydown', () => {
    if (V.status?.unlocked) touchVault();
  });

  // =====================================================================
  // GitHub 스타 요청 배너 (네트워크·계정 없음. 조건: 항목 50개 이상 또는 설치 7일 경과, 한 번만)
  // =====================================================================
  const REPO_URL = 'https://github.com/bbjbc/seorap';
  const nudge = { el: $('#starNudge'), shownThisSession: false };
  function evaluateStarNudge(): void {
    const s = state.settings;
    if (!s || nudge.shownThisSession) return;
    if (s.starNudge.done || Date.now() < s.starNudge.snoozeUntil) return;
    const enoughItems = state.items.length >= 50;
    const oldEnough = s.installedAt !== null && Date.now() - s.installedAt > 7 * 86400e3;
    if (!enoughItems && !oldEnough) return;
    if (state.mode !== 'board' || anyModalOpen()) return;
    nudge.el.hidden = false;
    nudge.shownThisSession = true;
  }
  function closeNudge(patch: Partial<Seorap.Settings['starNudge']>): void {
    nudge.el.hidden = true;
    void save({ starNudge: patch });
  }
  $('#nudgeStar').addEventListener('click', () => {
    void api.openExternal(REPO_URL);
    closeNudge({ done: true });
  });
  $('#nudgeLater').addEventListener('click', () => closeNudge({ snoozeUntil: Date.now() + 14 * 86400e3 }));
  $('#nudgeNever').addEventListener('click', () => closeNudge({ done: true }));
  $('#btnStar').addEventListener('click', () => {
    void api.openExternal(REPO_URL);
    void save({ starNudge: { done: true } });
  });
  $('#btnIssue').addEventListener('click', () => void api.openExternal(REPO_URL + '/issues/new'));

  // =====================================================================
  // 설정
  // =====================================================================
  async function openSettings(): Promise<void> {
    const r = await api.getSettings();
    state.settings = r.settings;
    fillSettings(r);
    openModal(el.settings);
    await refreshStats();
  }
  const shortcutInputs: Record<Seorap.ShortcutKey, HTMLInputElement> = {
    toggle: input('#scToggle'),
    quickSave: input('#scQuick'),
    newNote: input('#scNote'),
  };
  function shortcutKeyOf(inp: HTMLInputElement): Seorap.ShortcutKey | null {
    const k = inp.dataset['key'];
    return k === 'toggle' || k === 'quickSave' || k === 'newNote' ? k : null;
  }
  function fillSettings(b: Seorap.SettingsBundle): void {
    const s = b.settings;
    for (const k of Object.keys(shortcutInputs) as Seorap.ShortcutKey[]) shortcutInputs[k].value = s.shortcuts[k];
    $('#scError').textContent = Object.values(b.shortcutErrors).join(' ');
    input('#optAutoCollect').checked = s.autoCollect;
    input('#optToast').checked = s.toast;
    const autoStart = input('#optAutoStart');
    autoStart.checked = s.autoStart;
    autoStart.disabled = !b.isPackaged;
    $('#autoStartHint').textContent = b.isPackaged ? '트레이에만 조용히 떠 있어요.' : '설치된 버전에서만 설정할 수 있어요 (개발 모드).';
    setSeg('#segCardSize', s.board.cardSize);
    setSeg('#segClick', s.board.clickAction);
    input('#optMono').checked = s.notes.mono;
    setSeg('#segFont', String(s.notes.fontSize));
    select('#optAutoLock').value = String(s.vault.autoLockMinutes);
    select('#optClipClear').value = String(s.vault.clipboardClearSeconds);
    input('#optLockOnHide').checked = s.vault.lockOnHide;
    input('#optContentProtection').checked = s.vault.contentProtection;
    input('#optCleanup').checked = s.cleanup.enabled;
    input('#optCleanupDays').value = String(s.cleanup.days);
    $('#aboutVersion').textContent = `서랍 (Seorap) ${b.version}`;
    updateCleanupPreview();
  }
  function setSeg(sel: string, v: string): void {
    $$<HTMLButtonElement>(`${sel} button`).forEach((b) => b.classList.toggle('active', b.dataset['v'] === v));
  }
  async function refreshStats(): Promise<void> {
    const st = await api.getStats();
    $('#stats').innerHTML = `
    <div class="stat"><b>${st.count.toLocaleString()}</b><span>항목 · 고정 ${st.pinned}</span></div>
    <div class="stat"><b>${fmtSize(st.bytes)}</b><span>원본 용량</span></div>
    <div class="stat"><b>${fmtSize(st.thumbBytes)}</b><span>썸네일</span></div>
    <div class="stat"><b>${st.byType.image}</b><span>이미지 · 글 ${st.byType.text} · 링크 ${st.byType.link} · 파일 ${st.byType.file}</span></div>`;
    $('#dataDir').textContent = st.dir;
  }
  function cleanupDays(): number {
    return Number(input('#optCleanupDays').value) || 0;
  }
  function staleCount(days: number): number {
    const cutoff = Date.now() - days * 86400e3;
    return days > 0 ? state.items.filter((i) => !i.pinned && i.createdAt < cutoff).length : 0;
  }
  function updateCleanupPreview(): void {
    const days = cleanupDays();
    $('#cleanupPreview').textContent = days > 0 ? `지금 실행하면 ${staleCount(days)}개가 지워져요` : '';
    $('#btnCleanupNow').textContent = `${days || 30}일 지난 항목 지금 정리`;
  }
  async function save(patch: Seorap.SettingsPatch): Promise<void> {
    const r = await api.setSettings(patch);
    state.settings = r.settings;
    $('#scError').textContent = Object.values(r.shortcutErrors).join(' ');
    applySettingsToUi();
  }
  const onCheck = (sel: string, fn: (checked: boolean) => Seorap.SettingsPatch): void => {
    const inp = input(sel);
    inp.addEventListener('change', () => void save(fn(inp.checked)));
  };
  const onSelect = (sel: string, fn: (v: string) => Seorap.SettingsPatch): void => {
    const s = select(sel);
    s.addEventListener('change', () => void save(fn(s.value)));
  };
  const onSeg = (sel: string, fn: (v: string) => Seorap.SettingsPatch): void => {
    $(sel).addEventListener('click', (e) => {
      const v = closest<HTMLButtonElement>(e.target, 'button')?.dataset['v'];
      if (v === undefined) return;
      setSeg(sel, v);
      void save(fn(v));
    });
  };
  onCheck('#optAutoCollect', (c) => ({ autoCollect: c }));
  onCheck('#optToast', (c) => ({ toast: c }));
  onCheck('#optAutoStart', (c) => ({ autoStart: c }));
  onCheck('#optMono', (c) => ({ notes: { mono: c } }));
  onCheck('#optLockOnHide', (c) => ({ vault: { lockOnHide: c } }));
  onCheck('#optContentProtection', (c) => ({ vault: { contentProtection: c } }));
  onCheck('#optCleanup', (c) => ({ cleanup: { enabled: c } }));
  onSelect('#optAutoLock', (v) => ({ vault: { autoLockMinutes: Number(v) } }));
  onSelect('#optClipClear', (v) => ({ vault: { clipboardClearSeconds: Number(v) } }));
  onSeg('#segCardSize', (v) => ({ board: { cardSize: v === 'small' || v === 'large' ? v : 'medium' } }));
  onSeg('#segClick', (v) => ({ board: { clickAction: v === 'detail' ? 'detail' : 'copy' } }));
  onSeg('#segFont', (v) => ({ notes: { fontSize: Number(v) || 15 } }));
  const cleanupDaysInput = input('#optCleanupDays');
  cleanupDaysInput.addEventListener('change', () => {
    const d = Math.max(1, Math.min(3650, Number(cleanupDaysInput.value) || 30));
    cleanupDaysInput.value = String(d);
    void save({ cleanup: { days: d } });
    updateCleanupPreview();
  });
  cleanupDaysInput.addEventListener('input', updateCleanupPreview);
  $('#btnOpenDir').addEventListener('click', () => void api.openDataDir());
  $('#btnMoveDir').addEventListener('click', () => {
    void (async () => {
      $('#dirError').textContent = '';
      const r = await api.pickDataDir();
      if (r.error) $('#dirError').textContent = r.error;
      if (r.ok) {
        flash('저장 폴더를 옮겼어요');
        await refreshStats();
      }
    })();
  });
  $('#btnCleanupNow').addEventListener('click', () => {
    void (async () => {
      const days = cleanupDays() || 30;
      const n = staleCount(days);
      if (!n) {
        flash(`${days}일 지난 항목이 없어요`);
        return;
      }
      const ok = await confirmDialog(`${n}개 항목 삭제`, `${days}일보다 오래된, 고정하지 않은 항목 ${n}개를 지워요. 이 작업은 되돌릴 수 없어요.`);
      if (!ok) return;
      const removed = await api.runCleanup(days);
      flash(`${removed}개를 정리했어요`);
      await refreshStats();
      updateCleanupPreview();
    })();
  });
  $('#btnChangeMaster').addEventListener('click', () => {
    void (async () => {
      const st = await api.vault.status();
      if (!st.exists) {
        flash('먼저 금고를 만들어 주세요');
        return;
      }
      if (!st.unlocked) {
        flash('금고를 먼저 열어 주세요');
        return;
      }
      const r = await promptDialog({
        title: '마스터 비밀번호 변경',
        desc: '모든 항목을 새 비밀번호로 다시 암호화해요.',
        fields: [
          { type: 'password', placeholder: '현재 비밀번호' },
          { type: 'password', placeholder: '새 비밀번호' },
          { type: 'password', placeholder: '새 비밀번호 확인' },
        ],
        okText: '변경',
        validate: async ([o, n, n2]) => {
          if (!o || !n) return '모두 입력해 주세요.';
          if (n !== n2) return '새 비밀번호가 서로 달라요.';
          const s = await api.vault.strength(n);
          if (!s.ok) return s.reason ?? '비밀번호가 약해요.';
          const res = await api.vault.changePassword(o, n);
          return res.ok ? null : res.error;
        },
      });
      if (r) flash('마스터 비밀번호를 바꿨어요');
    })();
  });
  $('#btnExportVault').addEventListener('click', () => {
    void (async () => {
      const st = await api.vault.status();
      if (!st.unlocked) {
        flash('금고를 먼저 열어 주세요');
        return;
      }
      const r = await promptDialog({
        title: '평문으로 내보내기',
        desc: '암호화되지 않은 JSON 파일이 만들어져요. 백업 후에는 안전한 곳에 두거나 바로 지우세요.',
        fields: [{ type: 'password', placeholder: '마스터 비밀번호 확인' }],
        okText: '내보내기',
        validate: async ([pw]) => {
          const res = await api.vault.export(pw ?? '');
          return res.ok ? null : res.error;
        },
      });
      if (r) flash('내보냈어요');
    })();
  });

  // 단축키 녹화
  const MODIFIER_KEYS = new Set(['Control', 'Alt', 'Shift', 'Meta', 'OS']);
  const SPECIAL_KEYS = new Set(['Space', 'Tab', 'Enter', 'Home', 'End', 'PageUp', 'PageDown', 'Insert']);
  for (const inp of Object.values(shortcutInputs)) {
    inp.addEventListener('focus', () => {
      inp.classList.add('recording');
      inp.dataset['prev'] = inp.value;
      inp.value = '';
      inp.placeholder = '키 조합을 누르세요… (Esc 취소)';
    });
    inp.addEventListener('blur', () => {
      inp.classList.remove('recording');
      inp.placeholder = '없음';
      if (!inp.value) inp.value = inp.dataset['prev'] ?? '';
    });
    inp.addEventListener('keydown', (e) => {
      e.preventDefault();
      const key = shortcutKeyOf(inp);
      if (!key) return;
      if (e.key === 'Escape') {
        inp.value = inp.dataset['prev'] ?? '';
        inp.blur();
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        inp.value = '';
        inp.dataset['prev'] = '';
        void save({ shortcuts: { [key]: '' } });
        inp.blur();
        return;
      }
      if (MODIFIER_KEYS.has(e.key)) return;
      const mods: string[] = [];
      if (e.ctrlKey) mods.push('Ctrl');
      if (e.altKey) mods.push('Alt');
      if (e.shiftKey) mods.push('Shift');
      if (e.metaKey) mods.push('Super');
      const k = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key;
      const isFn = /^F\d{1,2}$/.test(k);
      if (!(isFn || SPECIAL_KEYS.has(k) || k.length === 1)) return;
      if (!mods.length && !isFn) return;
      const acc = [...mods, k].join('+');
      inp.value = acc;
      inp.dataset['prev'] = acc;
      void save({ shortcuts: { [key]: acc } });
      inp.blur();
    });
  }
  $$<HTMLButtonElement>('[data-clear]').forEach((b) =>
    b.addEventListener('click', () => {
      const inp = input(`#${b.dataset['clear'] ?? ''}`);
      const key = shortcutKeyOf(inp);
      if (!key) return;
      inp.value = '';
      inp.dataset['prev'] = '';
      void save({ shortcuts: { [key]: '' } });
    }),
  );

  function applySettingsToUi(): void {
    const s = state.settings;
    if (!s) return;
    el.app.dataset['card'] = s.board.cardSize;
    document.documentElement.style.setProperty('--editor-font', s.notes.mono ? 'var(--mono)' : 'var(--font)');
    document.documentElement.style.setProperty('--editor-size', `${s.notes.fontSize || 15}px`);
    el.optShowClipText.checked = s.notes.showClipboardText;
    $('#btnNoteMono').classList.toggle('active', s.notes.mono);
    const sortBtn = $('#btnNoteSort');
    sortBtn.classList.toggle('active', s.notes.sort === 'manual');
    sortBtn.title = s.notes.sort === 'manual' ? '정렬: 직접 정렬 (클릭하면 최신순)' : '정렬: 최신순 (클릭하면 직접 정렬)';
    renderNoteList();
    if (!el.settings.hidden) {
      setSeg('#segCardSize', s.board.cardSize);
      setSeg('#segFont', String(s.notes.fontSize));
      input('#optMono').checked = s.notes.mono;
    }
  }

  // =====================================================================
  // 모달 공통 / 전역 키
  // =====================================================================
  function openModal(m: HTMLElement): void {
    m.hidden = false;
  }
  function closeModal(m: HTMLElement): void {
    m.hidden = true;
    if (m === el.detail) detailId = null;
  }
  function anyModalOpen(): HTMLElement | undefined {
    return [el.detail, el.settings, el.prompt, el.switcher].find((m) => !m.hidden);
  }
  $$('.modal [data-close]').forEach((b) =>
    b.addEventListener('click', () => {
      const m = b.closest<HTMLElement>('.modal');
      if (m && m !== el.prompt) closeModal(m);
    }),
  );

  document.addEventListener('keydown', (e) => {
    const open = anyModalOpen();
    if (e.key === 'Escape') {
      if (open) {
        if (open === el.prompt && promptCancel) promptCancel();
        else closeModal(open);
        return;
      }
      if (isTyping() && document.activeElement !== el.editor) {
        (document.activeElement as HTMLElement | null)?.blur();
        return;
      }
      if (!el.findBar.hidden) {
        closeFind();
        return;
      }
      void api.hideWindow();
      return;
    }
    if (open) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key === 'k') {
      e.preventDefault();
      openSwitcher();
      return;
    }
    if (mod && (e.key === '1' || e.key === '2' || e.key === '3')) {
      e.preventDefault();
      setMode(e.key === '1' ? 'board' : e.key === '2' ? 'notes' : 'vault');
      return;
    }
    if (mod && e.key === 'n' && state.mode === 'notes') {
      e.preventDefault();
      void newNote();
      return;
    }
    if (mod && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      if (state.mode === 'board') el.search.focus();
      else if (state.mode === 'notes') {
        // 메모가 열려 있으면 그 메모 안에서 찾고, 리스트 검색은 Shift 를 더한다.
        if (state.noteId && !e.shiftKey) openFind();
        else el.noteSearch.focus();
      } else el.vaultSearch.focus();
      return;
    }
    if ((e.key === 'F3' || (mod && e.key === 'g')) && state.mode === 'notes' && !el.findBar.hidden) {
      e.preventDefault();
      findStep(e.shiftKey ? -1 : 1);
      return;
    }
    if (mod && e.key === ',') {
      e.preventDefault();
      void openSettings();
      return;
    }
    if (state.mode !== 'board' || isTyping()) return;
    if (mod && e.key === 'v') {
      e.preventDefault();
      void grabClipboard();
      return;
    }
    if (mod && e.key === 'a') {
      e.preventDefault();
      boardItems().forEach((i) => state.selected.add(i.id));
      renderBoard();
      return;
    }
    const only = state.selected.size === 1 ? [...state.selected][0] : undefined;
    if (mod && e.key === 'c' && only) {
      e.preventDefault();
      void copyCard(only);
      return;
    }
    if (e.key === 'Delete' && state.selected.size) {
      e.preventDefault();
      softDelete([...state.selected]);
      return;
    }
    if (e.key === 'Enter' && only) {
      e.preventDefault();
      openAny(only);
    }
  });
  window.addEventListener('paste', (e) => {
    if (isTyping() || anyModalOpen() || state.mode !== 'board') return;
    e.preventDefault();
    void grabClipboard();
  });
  window.addEventListener('beforeunload', () => {
    leaveNote();
    commitDelete();
  });
  // 창이 숨겨지면 대기 중인 저장을 바로 반영한다.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    if (state.noteSaveTimer !== null) {
      clearTimeout(state.noteSaveTimer);
      state.noteSaveTimer = null;
      void saveNoteNow();
    }
    void flushVaultSave();
  });

  // =====================================================================
  // 개발용 훅 (테스트·캡처 스크립트가 사용)
  // =====================================================================
  window.__seorap = {
    setMode,
    openNote,
    newNote,
    openDetail,
    openSettings,
    openSwitcher,
    searchSwitcher: (q) => {
      sw.input.value = q;
      renderSwitcher();
    },
    closeAllModals: () => {
      for (const m of [el.detail, el.settings, el.prompt, el.switcher]) closeModal(m);
    },
    refreshVault,
    selectSecret,
    vaultEntryIds: () => V.entries.map((x) => x.id),
    items: () => state.items,
    noteId: () => state.noteId,
    typeIntoEditor: (text) => {
      el.editor.value = text;
      el.editor.dispatchEvent(new Event('input'));
    },
    starNudgeVisible: () => !nudge.el.hidden,
    evaluateStarNudge,
    findInNote: (q) => {
      openFind();
      el.findInput.value = q;
      find.index = -1;
      findStep(1);
      return { open: !el.findBar.hidden, count: find.matches.length, index: find.index, selStart: el.editor.selectionStart, selEnd: el.editor.selectionEnd };
    },
    closeFind,
    noteListIds: () => $$('.note-item', el.noteList).map((d) => d.dataset['id'] ?? ''),
    moveNote: (id, beforeId) => moveNote(id, beforeId, false),
  };

  // =====================================================================
  // 시작
  // =====================================================================
  void (async () => {
    const r = await api.getSettings();
    state.settings = r.settings;
    applySettingsToUi();
    await loadAll();
    setMode(r.settings.lastMode);
    await renderEditor();
    el.vaultDot.hidden = !(await api.vault.status()).unlocked;
    window.setInterval(() => {
      if (state.mode !== 'board') return;
      for (const s of $$('.card-meta > span:first-child', el.grid)) {
        const it = findItem(s.closest<HTMLElement>('.card')?.dataset['id'] ?? null);
        if (it) s.textContent = fmtTime(it.createdAt);
      }
    }, 60000);
  })();
})();
