// 우하단 저장 알림 창. 메인이 보내는 toast / toast:hide 이벤트만 받아 그린다.
const el = document.getElementById('toast');
const text = document.getElementById('text');
const thumb = document.getElementById('thumb');

if (el && text && thumb instanceof HTMLImageElement) {
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
}
