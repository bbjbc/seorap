import { useUiStore } from '../../stores/ui';

export const DropOverlay = () => {
  const text = useUiStore((s) => s.dropText);
  return (
    <div id="dropOverlay" className="drop-overlay" hidden={text === null}>
      <div className="drop-box">
        <div className="drop-plus">＋</div>
        <div id="dropText">{text}</div>
      </div>
    </div>
  );
};
