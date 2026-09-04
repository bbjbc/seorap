// 설정 화면의 행 레이아웃 조각.
import type { ReactNode } from 'react';

/** 왼쪽 라벨 + 오른쪽 컨트롤 */
export const Row = ({ label, children }: { label: ReactNode; children: ReactNode }) => (
  <div className="row">
    <label>{label}</label>
    {children}
  </div>
);

interface CheckRowProps {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
}

/** 체크박스 + 굵은 제목 + 설명 */
export const CheckRow = ({ id, checked, disabled = false, onChange, label, hint }: CheckRowProps) => (
  <label className="row check">
    <input type="checkbox" id={id} checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    <span>
      <b>{label}</b>
      {hint !== undefined && <small>{hint}</small>}
    </span>
  </label>
);

/** 버튼 몇 개가 나란히 놓이는 행 */
export const ButtonRow = ({ children }: { children: ReactNode }) => <div className="row btns">{children}</div>;

export const Section = ({ title, hint, children }: { title?: ReactNode; hint?: ReactNode; children: ReactNode }) => (
  <section>
    {title !== undefined && (
      <h3>
        {hint === undefined ? title : <span>{title}</span>}
        {hint !== undefined && <small>{hint}</small>}
      </h3>
    )}
    {children}
  </section>
);
