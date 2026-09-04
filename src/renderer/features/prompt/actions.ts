// 범용 프롬프트/확인 모달. 여는 쪽은 Promise 로 결과를 받고, 그리는 건 PromptModal 이 한다.
import { t } from '../../lib/i18n';
import { useUiStore, type PromptOptions } from '../../stores/ui';

let seq = 0;

export function promptDialog(opts: PromptOptions): Promise<string[] | null> {
  const ui = useUiStore.getState();
  // 이미 떠 있는 프롬프트가 있으면 취소된 것으로 마무리한다.
  ui.prompt?.resolve(null);
  return new Promise((resolve) => {
    ui.setPrompt({
      seq: ++seq,
      opts,
      resolve: (values) => {
        useUiStore.getState().setPrompt(null);
        resolve(values);
      },
    });
  });
}

export async function confirmDialog(title: string, desc: string, okText: string = t('common.delete')): Promise<boolean> {
  return (await promptDialog({ title, desc, okText })) !== null;
}

export function cancelPrompt(): void {
  useUiStore.getState().prompt?.resolve(null);
}
