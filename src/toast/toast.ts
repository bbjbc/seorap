// 우하단 저장 알림 창. 번들러 없이 <script> 로 로드되는 단일 스크립트.
(() => {
  const el = document.getElementById('toast');
  const text = document.getElementById('text');
  const thumb = document.getElementById('thumb');
  if (!el || !text || !(thumb instanceof HTMLImageElement)) return;

  window.toast.onShow((p) => {
    el.className = 'toast ' + (p.kind ?? 'ok');
    text.textContent = p.text;
    if (p.thumb) {
      thumb.src = p.thumb;
      thumb.hidden = false;
    } else {
      thumb.hidden = true;
      thumb.removeAttribute('src');
    }
    requestAnimationFrame(() => el.classList.add('show'));
  });
  window.toast.onHide(() => el.classList.remove('show'));
})();
