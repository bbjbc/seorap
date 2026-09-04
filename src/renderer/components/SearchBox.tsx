import { useRef, type RefCallback } from 'react';
import { IconSearch } from './icons';

interface Props {
  id: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  /** 액션이 포커스를 줄 수 있게 등록할 핸들 (lib/handles) */
  inputRef?: RefCallback<HTMLInputElement>;
  /** 오른쪽 지우기(×) 버튼. 값이 있을 때만 보인다. */
  clearable?: boolean;
}

export const SearchBox = ({ id, value, placeholder, onChange, inputRef, clearable = false }: Props) => {
  const local = useRef<HTMLInputElement | null>(null);
  return (
    <div className="search-wrap nodrag">
      <IconSearch />
      <input
        id={id}
        ref={(el) => {
          local.current = el;
          inputRef?.(el);
        }}
        type="text"
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
      />
      {clearable && (
        <button
          id={`${id}Clear`}
          className="xbtn"
          hidden={!value}
          onClick={() => {
            onChange('');
            local.current?.focus();
          }}
        >
          ×
        </button>
      )}
    </div>
  );
};
