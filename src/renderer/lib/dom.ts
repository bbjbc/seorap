/** 포커스가 글자 입력을 받는 요소에 있는가. 전역 단축키는 이때 한 글자 키를 가로채지 않는다. */
export function isTyping(): boolean {
  const a = document.activeElement;
  return (
    a instanceof HTMLInputElement ||
    a instanceof HTMLTextAreaElement ||
    (a instanceof HTMLElement && a.isContentEditable)
  );
}

export function blurActive(): void {
  const a = document.activeElement;
  if (a instanceof HTMLElement) a.blur();
}
