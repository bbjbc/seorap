// 배경을 누르면 닫히는 모달 틀. Esc 는 전역 단축키(app/shortcuts.ts)가 맨 위 모달을 닫는다.
import type { ReactNode } from 'react';

interface Props {
  id: string;
  open: boolean;
  onClose: () => void;
  /** 화면 위쪽에 붙이는 변형 (빠른 전환) */
  top?: boolean;
  cardClassName: string;
  children: ReactNode;
}

export const Modal = ({ id, open, onClose, top = false, cardClassName, children }: Props) => (
  <div id={id} className={`modal${top ? ' top' : ''}`} hidden={!open}>
    <div className="modal-backdrop" onClick={onClose} />
    <div className={`modal-card ${cardClassName}`}>{children}</div>
  </div>
);
