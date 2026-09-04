// 여러 값 중 하나를 고르는 분절 버튼 (설정의 카드 크기, 글자 크기 등)
interface Option<V extends string> {
  value: V;
  label: string;
}

interface Props<V extends string> {
  id: string;
  value: V;
  options: readonly Option<V>[];
  onChange: (value: V) => void;
}

export const SegControl = <V extends string>({ id, value, options, onChange }: Props<V>) => (
  <div className="seg" id={id}>
    {options.map((o) => (
      <button key={o.value} type="button" data-v={o.value} className={o.value === value ? 'active' : ''} onClick={() => onChange(o.value)}>
        {o.label}
      </button>
    ))}
  </div>
);
