// 태그 칩 목록 (누르면 제거) 과 태그 추가 입력칸.
import { useState } from 'react';

interface ListProps {
  id: string;
  tags: readonly string[];
  onRemove: (tag: string) => void;
  inline?: boolean;
}

export const TagList = ({ id, tags, onRemove, inline = false }: ListProps) => (
  <div id={id} className={`tag-list${inline ? ' inline' : ''}`}>
    {tags.map((tag) => (
      <span
        key={tag}
        className="tag"
        data-tag={tag}
        onClick={() => onRemove(tag)}
      >
        {tag}
        <b>×</b>
      </span>
    ))}
  </div>
);

interface InputProps {
  id: string;
  placeholder: string;
  disabled?: boolean;
  onAdd: (raw: string) => void;
}

export const TagInput = ({
  id,
  placeholder,
  disabled = false,
  onAdd,
}: InputProps) => {
  const [value, setValue] = useState('');
  return (
    <input
      id={id}
      className="tag-input"
      value={value}
      placeholder={placeholder}
      spellCheck={false}
      disabled={disabled}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        onAdd(value);
        setValue('');
      }}
    />
  );
};
