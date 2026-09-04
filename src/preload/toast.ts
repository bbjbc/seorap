import { contextBridge, type IpcRendererEvent, ipcRenderer } from 'electron';

const api: Seorap.ToastApi = {
  onShow: (cb) => {
    ipcRenderer.on('toast', (_e: IpcRendererEvent, payload: unknown) =>
      cb(payload as Seorap.ToastPayload),
    );
  },
  onHide: (cb) => {
    ipcRenderer.on('toast:hide', () => cb());
  },
};

contextBridge.exposeInMainWorld('toast', api);
