// `npm test`: 격리된 임시 폴더에서 Electron 을 띄워 dev-functional 을 실행한다.
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const root = path.join(__dirname, '..', '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'seorap-test-'));
// electron 패키지의 기본 export 는 실행 파일 경로 문자열이다.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const electronPath: unknown = require('electron');
if (typeof electronPath !== 'string') throw new Error('electron binary path not found');

const result = spawnSync(electronPath, ['.'], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    SEORAP_USER_DATA: path.join(tmp, 'userdata'),
    SEORAP_DATA_DIR: path.join(tmp, 'data'),
    SEORAP_DEBUG_SCRIPT: path.join(root, 'out', 'scripts', 'dev-functional.js'),
  },
  timeout: 5 * 60 * 1000,
});

try {
  fs.rmSync(tmp, { recursive: true, force: true });
} catch {
  /* ignore */
}
if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
