import { useEffect, useState } from 'react';
import { useUiStore } from '../../stores/ui';

const FLASH_MS = 1600;

/** 화면 아래 가운데 안내 문구. 같은 문구가 연속으로 오면 시간을 다시 센다. */
export const Flash = () => {
  const flash = useUiStore((s) => s.flash);
  const [hiddenSeq, setHiddenSeq] = useState(0);
  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setHiddenSeq(flash.seq), FLASH_MS);
    return () => clearTimeout(id);
  }, [flash]);
  const visible = flash !== null && flash.seq !== hiddenSeq;
  return (
    <div id="flash" className="flash" hidden={!visible}>
      {flash?.text}
    </div>
  );
};
