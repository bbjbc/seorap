// 렌더러 진입점. 스토어·구독·전역 핸들러를 먼저 세우고 React 를 올린 뒤 부팅한다.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { App } from './app/App';
import { boot } from './app/boot';
import { installDebugHooks } from './app/debug-hooks';
import { installDropHandlers } from './app/drop';
import { subscribeIpc } from './app/ipc';
import { installGlobalHandlers } from './app/shortcuts';

installDebugHooks();
subscribeIpc();
installGlobalHandlers();
installDropHandlers();

const root = document.getElementById('root');
if (!root) throw new Error('missing #root');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

void boot();
