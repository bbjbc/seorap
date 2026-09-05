// 사전 문자열 안의 <b> <kbd> <br> 만 요소로 살리고 나머지는 글자 그대로 그린다.
// 이 컴포넌트가 innerHTML 을 대신하므로, 태그처럼 생긴 입력이 마크업이 되면 안 된다.

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RichText } from '../../../src/renderer/components/RichText';

const html = (text: string): string =>
  renderToStaticMarkup(<RichText text={text} />);

describe('RichText', () => {
  it('passes plain text straight through', () => {
    expect(html('just words')).toBe('just words');
  });

  it('turns the three allowed tags into elements', () => {
    expect(html('press <kbd>Ctrl</kbd>')).toBe('press <kbd>Ctrl</kbd>');
    expect(html('<b>bold</b> here')).toBe('<b>bold</b> here');
    expect(html('one<br>two')).toBe('one<br/>two');
    expect(html('one<br />two')).toBe('one<br/>two');
  });

  it('nests one inside the other', () => {
    expect(html('<b>a <kbd>K</kbd> b</b>')).toBe('<b>a <kbd>K</kbd> b</b>');
  });

  it('escapes any other tag instead of rendering it', () => {
    expect(html('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    );
    expect(html('<img src=x onerror=y>')).toBe('&lt;img src=x onerror=y&gt;');
  });

  it('escapes ampersands and quotes so they read as typed', () => {
    expect(html('a & b "c"')).toBe('a &amp; b &quot;c&quot;');
  });

  it('keeps the words of a tag that was never closed, dropping the tag', () => {
    // 사전 문자열이 잘못 적혀도 글자는 보여야 한다. 스타일만 잃는다.
    expect(html('<b>unclosed')).toBe('unclosed');
    expect(html('a <kbd>b')).toBe('a b');
  });

  it('ignores a stray closing tag rather than throwing', () => {
    expect(html('plain</b>')).toBe('plain');
  });

  it('renders an empty string as nothing', () => {
    expect(html('')).toBe('');
  });

  it('handles the real strings from the dictionary', () => {
    expect(html('메모가 없어요.<br><b>Ctrl+N</b>으로 시작하세요.')).toBe(
      '메모가 없어요.<br/><b>Ctrl+N</b>으로 시작하세요.',
    );
  });
});
