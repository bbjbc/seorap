// preload 가 contextBridge 로 노출한 IPC 표면. 렌더러 코드는 window.scrap 을 직접 만지지 않고 이걸 import 한다.
export const api: Seorap.Api = window.scrap;
