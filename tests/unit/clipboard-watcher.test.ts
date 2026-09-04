// 클립보드 감시기. electron.clipboard 를 흉내 내고 가짜 타이머로 tick 을 돌린다.
// 여기서 고정하는 동작: 변경 감지, 앱 자신의 쓰기 무시, 그리고 무시 창이 사용자 복사를 삼키는 방식.

import { type ClipboardItem, clipboard } from 'electron';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ClipboardWatcher,
  SELF_WRITE_IGNORE_MS,
} from '../../src/main/clipboard';

vi.mock('electron', () => ({
  clipboard: {
    read: vi.fn(),
    readText: vi.fn(),
    write: vi.fn(),
    writeText: vi.fn(),
    clear: vi.fn(),
  },
  ClipboardItem: vi.fn(),
  nativeImage: { createFromBuffer: vi.fn(), createEmpty: vi.fn() },
}));

const INTERVAL = 800;
let onClipboard = '';
const setClipboard = (text: string): void => {
  onClipboard = text;
};

beforeEach(() => {
  vi.useFakeTimers();
  onClipboard = '';
  vi.mocked(clipboard.read).mockImplementation(() =>
    Promise.resolve(
      onClipboard
        ? ([
            {
              types: ['text/plain'],
              getType: () => Promise.resolve(new Blob([onClipboard])),
            },
          ] as unknown as ClipboardItem[])
        : ([] as ClipboardItem[]),
    ),
  );
});
afterEach(() => {
  vi.useRealTimers();
});

const tick = async (n = 1): Promise<void> => {
  await vi.advanceTimersByTimeAsync(INTERVAL * n);
};

describe('ClipboardWatcher', () => {
  it('does not report what was already on the clipboard when it starts', async () => {
    setClipboard('already here');
    const onChange = vi.fn();
    const w = new ClipboardWatcher(onChange, INTERVAL);
    await w.start();
    await tick(3);
    expect(onChange).not.toHaveBeenCalled();
    w.stop();
  });

  it('reports a change once, not on every tick', async () => {
    const onChange = vi.fn();
    const w = new ClipboardWatcher(onChange, INTERVAL);
    await w.start();
    setClipboard('new text');
    await tick(3);
    expect(onChange).toHaveBeenCalledTimes(1);
    setClipboard('another');
    await tick();
    expect(onChange).toHaveBeenCalledTimes(2);
    w.stop();
  });

  it('ignores empty or whitespace-only clipboard content', async () => {
    const onChange = vi.fn();
    const w = new ClipboardWatcher(onChange, INTERVAL);
    await w.start();
    setClipboard('   \n');
    await tick(2);
    expect(onChange).not.toHaveBeenCalled();
    w.stop();
  });

  it("does not collect the app's own write after ignore()", async () => {
    const onChange = vi.fn();
    const w = new ClipboardWatcher(onChange, INTERVAL);
    await w.start();
    w.ignore();
    setClipboard('secret the app just copied');
    await tick(5); // 무시 창을 훌쩍 지나서도
    expect(onChange).not.toHaveBeenCalled();
    w.stop();
  });

  it('collects a user copy made after the ignore window has passed', async () => {
    const onChange = vi.fn();
    const w = new ClipboardWatcher(onChange, INTERVAL);
    await w.start();
    w.ignore();
    setClipboard('own write');
    await tick(4); // 3.2초 경과, 창 종료
    setClipboard('user copied this');
    await tick();
    expect(onChange).toHaveBeenCalledTimes(1);
    w.stop();
  });

  it('keeps the default ignore window short — one poll plus margin, not the clipboard-clear time', () => {
    expect(SELF_WRITE_IGNORE_MS).toBeGreaterThan(INTERVAL);
    expect(SELF_WRITE_IGNORE_MS).toBeLessThan(5000);
  });

  it('swallows a user copy made inside the ignore window — and never collects it later', async () => {
    // 무시 창 안의 변경은 건너뛰면서 기준점으로 삼기 때문에, 창이 끝난 뒤 다시 봐도
    // "변한 게 없다"가 된다. 그래서 창은 SELF_WRITE_IGNORE_MS 만큼만 짧아야 한다.
    const onChange = vi.fn();
    const w = new ClipboardWatcher(onChange, INTERVAL);
    await w.start();
    w.ignore();
    setClipboard('own write');
    await tick(); // 0.8초: 기준점 재설정
    setClipboard('user copied this at 1.6s');
    await tick(); // 1.6초: 창 안 → 건너뜀
    await tick(10); // 창이 끝나고도 한참
    expect(onChange).not.toHaveBeenCalled();
    w.stop();
  });

  it('stop() halts polling and start() is idempotent while running', async () => {
    const onChange = vi.fn();
    const w = new ClipboardWatcher(onChange, INTERVAL);
    await w.start();
    await w.start();
    expect(w.running).toBe(true);
    w.stop();
    expect(w.running).toBe(false);
    setClipboard('after stop');
    await tick(3);
    expect(onChange).not.toHaveBeenCalled();
  });
});
