// 개발용: 시드 데이터를 넣고 각 화면을 캡처한다. main 이 SEORAP_DEBUG_SCRIPT 로 불러온다.
import fs from 'fs';
import path from 'path';
import { nativeImage } from 'electron';
import type { DebugContext } from '../src/main/main';

const ROOT = path.join(__dirname, '..', '..');

export default async function run({ app, win, store, vault, showToast, toastWin }: DebugContext): Promise<void> {
  const out = process.env['SEORAP_SHOT_DIR'];
  if (!out) throw new Error('SEORAP_SHOT_DIR 가 필요해요');
  fs.mkdirSync(out, { recursive: true });
  const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
  const shot = async (name: string): Promise<void> => {
    const img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(out, name + '.png'), img.toPNG());
    console.log('shot', name);
  };
  const js = (code: string): Promise<unknown> => win.webContents.executeJavaScript(code, true);

  if (!store.items.length) {
    const icon = nativeImage.createFromPath(path.join(ROOT, 'assets', 'icon.png'));
    await store.addImage(icon, { source: 'seed', title: '앱 아이콘' });
    await store.addImage(icon.resize({ width: 1600, height: 900 }), { source: 'seed', title: '와이드 스크린샷' });
    await store.addText('배포 체크리스트\n- nginx 설정 백업\n- DB 마이그레이션 순서 확인\n  1. users 테이블\n  2. orders 테이블\n- 롤백 스크립트 준비\n- 슬랙 공지', { source: 'manual', note: true });
    await store.addText('회의 메모 9/2\n김대리 요청사항: 대시보드에 주간 리포트 추가. 다음 주 수요일까지 초안.', { source: 'manual', note: true });
    await store.addText('장보기\n우유, 계란, 두부, 대파', { source: 'manual', note: true });
    await store.addText('npx electron-builder --win --x64', { source: 'clipboard' });
    const link = await store.addText('https://www.electronjs.org/docs/latest/api/clipboard', { source: 'clipboard' });
    if (link) store.update(link.item.id, { linkTitle: 'clipboard | Electron', tags: ['electron', '참고'] });
    await store.addFile(path.join(ROOT, 'package.json'), { source: 'drop' });
    await store.addFile(path.join(ROOT, 'package-lock.json'), { source: 'drop' }).catch(() => null);
    const first = store.items[store.items.length - 1];
    if (first) store.update(first.id, { pinned: true, tags: ['아이콘'] });
    store.flush();
  }

  await sleep(1500);
  await shot('01-board');
  await js(`__seorap.setMode('notes'); __seorap.openNote(__seorap.items().find(i => i.type === 'text' && i.note).id);`);
  await sleep(600);
  await shot('02-notes');
  await js(`__seorap.setMode('vault');`);
  await sleep(600);
  await shot('03-vault-setup');
  if (!vault.exists) vault.setup('Correct-Horse-Battery-2026!');
  else vault.unlock('Correct-Horse-Battery-2026!');
  vault.add({ name: 'AWS 루트 계정', username: 'me@example.com', password: 'x', url: 'https://console.aws.amazon.com', notes: 'MFA는 폰에' });
  vault.add({ name: '집 와이파이', password: 'y' });
  vault.add({ name: 'OpenAI API key', username: 'sk-...', password: 'z' });
  await js(`__seorap.refreshVault().then(() => __seorap.selectSecret(__seorap.vaultEntryIds()[0]))`);
  await sleep(900);
  await shot('04-vault-open');
  await js(`__seorap.setMode('board'); __seorap.openSettings();`);
  await sleep(700);
  await shot('05-settings');
  await js(`__seorap.closeAllModals(); __seorap.openSwitcher(); __seorap.searchSwitcher('메');`);
  await sleep(400);
  await shot('06-switcher');
  await js(`__seorap.closeAllModals(); __seorap.openDetail(__seorap.items().find(i => i.type === 'image').id);`);
  await sleep(600);
  await shot('07-detail');
  const img = store.items.find((i) => i.type === 'image');
  const thumbPath = img ? store.absThumb(img) : null;
  showToast({
    kind: 'ok',
    text: '저장됨 · 이미지 1600×900',
    thumb: thumbPath ? nativeImage.createFromPath(thumbPath).resize({ height: 56 }).toDataURL() : null,
    duration: 5000,
  });
  await sleep(700);
  fs.writeFileSync(path.join(out, '08-toast.png'), (await toastWin.webContents.capturePage()).toPNG());
  console.log('shot 08-toast');
  app.exit(0);
}
