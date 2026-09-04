import { contextBridge, ipcRenderer, webUtils, type IpcRendererEvent } from 'electron';

function invoke<C extends Seorap.IpcChannel>(channel: C, ...args: Seorap.Ipc[C]['args']): Promise<Seorap.Ipc[C]['result']> {
  return ipcRenderer.invoke(channel, ...args) as Promise<Seorap.Ipc[C]['result']>;
}

function on<E extends keyof Seorap.Events>(channel: E, cb: (payload: Seorap.Events[E]) => void): Seorap.Unsubscribe {
  const handler = (_e: IpcRendererEvent, payload: unknown): void => cb(payload as Seorap.Events[E]);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

const api: Seorap.Api = {
  listItems: () => invoke('items:list'),
  fullText: (id) => invoke('items:fullText', id),
  addNote: () => invoke('items:addNote'),
  addText: (text, opts) => invoke('items:addText', text, opts),
  addFiles: (paths) => invoke('items:addFiles', paths),
  addBuffers: (blobs) => invoke('items:addBuffers', blobs),
  addUrl: (url) => invoke('items:addUrl', url),
  captureClipboard: () => invoke('items:captureClipboard'),
  updateItem: (id, patch) => invoke('items:update', id, patch),
  deleteItems: (ids) => invoke('items:delete', ids),
  reorderItems: (ids) => invoke('items:reorder', ids),
  copyItem: (id) => invoke('items:copy', id),
  openItem: (id) => invoke('items:open', id),
  showInFolder: (id) => invoke('items:showInFolder', id),
  contextMenu: (ids) => invoke('items:contextMenu', ids),
  startDrag: (ids) => ipcRenderer.send('items:startDrag', ids),
  getPathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file);
    } catch {
      return '';
    }
  },

  vault: {
    status: () => invoke('vault:status'),
    setup: (pw) => invoke('vault:setup', pw),
    unlock: (pw) => invoke('vault:unlock', pw),
    lock: () => invoke('vault:lock'),
    touch: () => invoke('vault:touch'),
    list: () => invoke('vault:list'),
    secret: (id) => invoke('vault:secret', id),
    add: (fields) => invoke('vault:add', fields),
    update: (id, patch) => invoke('vault:update', id, patch),
    remove: (id) => invoke('vault:remove', id),
    copy: (id, field) => invoke('vault:copy', id, field),
    changePassword: (oldPw, newPw) => invoke('vault:changePassword', oldPw, newPw),
    generate: (len, symbols) => invoke('vault:generate', len, symbols),
    strength: (pw) => invoke('vault:strength', pw),
    export: (pw) => invoke('vault:export', pw),
    onLocked: (cb) => on('vault:locked', cb),
  },

  getSettings: () => invoke('settings:get'),
  setSettings: (patch) => invoke('settings:set', patch),
  getStats: () => invoke('settings:stats'),
  openDataDir: () => invoke('settings:openDataDir'),
  pickDataDir: () => invoke('settings:pickDataDir'),
  runCleanup: (days) => invoke('settings:runCleanup', days),

  hideWindow: () => invoke('window:hide'),
  openExternal: (url) => invoke('shell:openExternal', url),

  checkUpdate: () => invoke('update:check'),
  updateStatus: () => invoke('update:status'),
  onUpdateAvailable: (cb) => on('update:available', cb),

  onItemsChanged: (cb) => on('items:changed', cb),
  onUiAction: (cb) => on('ui:action', cb),
  onFlash: (cb) => on('ui:flash', cb),
  onWindowShown: (cb) => on('window:shown', () => cb()),
  onSettingsChanged: (cb) => on('settings:changed', cb),
};

contextBridge.exposeInMainWorld('scrap', api);
