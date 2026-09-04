// 범용 프롬프트/확인. 열려 있는 요청은 ui 스토어의 prompt 이고, 결과는 그 resolve 로 돌려준다.
// 요청마다 PromptBody 를 새로 마운트해(key) 입력값·오류가 깨끗하게 시작한다.
import { useEffect, useRef, useState } from 'react';
import { Modal } from '../../components/Modal';
import { useT } from '../../lib/i18n';
import { type PromptRequest, useUiStore } from '../../stores/ui';

export const PromptModal = () => {
  const prompt = useUiStore((s) => s.prompt);
  return (
    <Modal
      id="prompt"
      open={prompt !== null}
      onClose={() => prompt?.resolve(null)}
      cardClassName="prompt-card"
    >
      {prompt && <PromptBody key={prompt.seq} prompt={prompt} />}
    </Modal>
  );
};

const PromptBody = ({ prompt }: { prompt: PromptRequest }) => {
  const t = useT();
  const fields = prompt.opts.fields ?? [];
  const [values, setValues] = useState<string[]>(() =>
    fields.map((f) => f.value ?? ''),
  );
  const [err, setErr] = useState('');
  const firstRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    firstRef.current?.focus();
    firstRef.current?.select();
  }, []);

  const submit = async (): Promise<void> => {
    if (prompt.opts.validate) {
      const e = await prompt.opts.validate(values);
      if (e) {
        setErr(e);
        return;
      }
    }
    prompt.resolve(fields.length ? values : []);
  };

  return (
    <>
      <h3 id="promptTitle">{prompt.opts.title}</h3>
      <p className="muted" id="promptDesc" hidden={!prompt.opts.desc}>
        {prompt.opts.desc}
      </p>
      <div id="promptFields" hidden={!fields.length}>
        {fields.map((f, i) => (
          <input
            // biome-ignore lint/suspicious/noArrayIndexKey: 필드 목록은 요청 안에서 고정이고, PromptBody 자체가 요청마다 다시 마운트된다.
            key={i}
            id={`pf${i}`}
            ref={i === 0 ? firstRef : undefined}
            type={f.type ?? 'text'}
            value={values[i] ?? ''}
            placeholder={f.placeholder ?? ''}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) =>
              setValues((v) => v.map((x, j) => (j === i ? e.target.value : x)))
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void submit();
              }
            }}
          />
        ))}
      </div>
      <p className="hint err" id="promptErr">
        {err}
      </p>
      <div className="detail-foot">
        <div className="spacer" />
        <button
          type="button"
          className="btn ghost"
          onClick={() => prompt.resolve(null)}
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          className="btn primary"
          id="promptOk"
          onClick={() => void submit()}
        >
          {prompt.opts.okText ?? t('common.ok')}
        </button>
      </div>
    </>
  );
};
