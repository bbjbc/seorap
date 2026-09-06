import Link from 'next/link';
import { CopyButton } from '@/components/CopyButton';
import { DownloadButton } from '@/components/DownloadButton';
import { AssetSize, Version } from '@/components/ReleaseMeta';
import { ScrollFx } from '@/components/ScrollFx';
import { dictionaries, INSTALL_COMMAND, type Lang, links } from '@/lib/dict';
import { asset, FALLBACK_VERSION } from '@/lib/site';

function GithubIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <title />
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3-.3 6.2-1.5 6.2-6.7A5.2 5.2 0 0 0 19.9 5a4.9 4.9 0 0 0-.1-3.6s-1.1-.3-3.7 1.4a12.7 12.7 0 0 0-6.6 0C6.9 1.1 5.8 1.4 5.8 1.4A4.9 4.9 0 0 0 5.7 5a5.2 5.2 0 0 0-1.4 3.7c0 5.2 3.2 6.4 6.2 6.7a3.4 3.4 0 0 0-.9 2.6V22" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="#6fd39a"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <title />
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/**
 * 앱은 Electron 의 titleBarOverlay 라 창 조절 버튼이 윈도우 기본 모양으로
 * 오른쪽 위에 붙는다 (main.ts: symbolColor #c9c9cf). 그 배치를 그대로 흉내낸다.
 */
function WindowControls() {
  return (
    <div className="winctl">
      <i>
        <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
          <title />
          <path d="M1 6h10" stroke="currentColor" strokeWidth="1.1" />
        </svg>
      </i>
      <i>
        <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
          <title />
          <rect
            x="1.6"
            y="1.6"
            width="8.8"
            height="8.8"
            rx="0.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.1"
          />
        </svg>
      </i>
      <i>
        <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
          <title />
          <path
            d="M1.4 1.4l9.2 9.2M10.6 1.4l-9.2 9.2"
            stroke="currentColor"
            strokeWidth="1.1"
          />
        </svg>
      </i>
    </div>
  );
}

/** 보드 · 메모 · 금고. lib/dict.tsx 의 feat.main 순서와 맞춘다. */
const FEATURE_ICONS = [
  <g key="board">
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" />
  </g>,
  <g key="notes">
    <path d="M5 3h9l5 5v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
    <path d="M14 3v6h5" />
    <path d="M8 13h7" />
    <path d="M8 17h5" />
  </g>,
  <g key="vault">
    <rect x="4" y="10" width="16" height="11" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </g>,
];

export function Landing({ lang }: { lang: Lang }) {
  const t = dictionaries[lang];
  const other: Lang = lang === 'ko' ? 'en' : 'ko';
  const homeHref = lang === 'ko' ? '/' : '/en';
  const otherHref = other === 'ko' ? '/' : '/en';

  return (
    <>
      <ScrollFx />

      <header className="nav">
        <div className="wrap nav-inner">
          <Link className="brand" href={homeHref}>
            <img src={asset('/img/icon.png')} alt="" width={30} height={30} />
            <span>{t.brand}</span>
          </Link>
          <nav className="nav-links">
            <a href="#features">{t.nav.features}</a>
            <a href="#privacy">{t.nav.privacy}</a>
            <a href="#install">{t.nav.install}</a>
            <a className="nav-gh" href={links.repo}>
              <GithubIcon />
              GitHub
            </a>
          </nav>
          <div className="lang">
            <span className="is-on">{t.langLabel[lang]}</span>
            <Link href={otherHref} hrefLang={other}>
              {t.langLabel[other]}
            </Link>
          </div>
          <DownloadButton
            className="btn btn-sm"
            label={t.nav.download}
            withIcon={false}
          />
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-glow" aria-hidden="true" />
          <div className="grain" aria-hidden="true" />
          <div className="wrap hero-inner">
            <div className="hero-copy">
              <p className="eyebrow">{t.hero.eyebrow}</p>
              <h1>{t.hero.h1}</h1>
              <p className="lead">{t.hero.lead}</p>
              <div className="cta-row">
                <DownloadButton className="btn btn-lg" label={t.hero.cta} />
                <a className="btn btn-ghost btn-lg" href="#install">
                  {t.hero.cta2}
                </a>
              </div>
              <p className="meta">
                <Version fallback={FALLBACK_VERSION} />
                <span className="dot">·</span>
                <AssetSize fallback={t.hero.size} />
                <span className="dot">·</span>
                <span>{t.hero.noAdmin}</span>
                <span className="dot">·</span>
                <span>{t.hero.sha}</span>
              </p>
            </div>

            <div className="hero-art" aria-hidden="true">
              <div className="chip chip-img">
                <div className="chip-thumb" />
                <div className="mono chip-name">screenshot.png</div>
              </div>
              <div className="chip chip-link">
                <div className="chip-host">github.com</div>
                <div className="chip-title">{t.chip.link}</div>
                <div className="chip-url">github.com/bbjbc/seorap</div>
              </div>
              <div className="chip chip-pw">
                <div className="chip-pw-head">
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="#f5b342"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <title />
                    <rect x="4" y="10" width="16" height="11" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                  <span>{t.chip.pw}</span>
                </div>
                <div className="mono chip-dots">••••••••</div>
              </div>

              <div className="drawer">
                <div className="drawer-bar">
                  <span className="mono">{t.chip.drawer}</span>
                  <WindowControls />
                </div>
                <img
                  src={asset(`/img/board.${lang}.jpg`)}
                  alt=""
                  width={1100}
                  height={726}
                />
                <div className="drawer-fade" />
              </div>
              <div className="drawer-handle" />
            </div>
          </div>
        </section>

        <section className="features" id="features">
          <div className="wrap">
            <p className="eyebrow">{t.feat.eyebrow}</p>
            <h2>{t.feat.h2}</h2>

            <div className="cards-3 cards-main">
              {t.feat.main.map((card, i) => (
                <article key={card.title} className="card js-card">
                  <div className="card-icon">
                    <svg
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                      fill="none"
                      stroke="#f5b342"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <title />
                      {FEATURE_ICONS[i]}
                    </svg>
                  </div>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                  <div className="shot js-reveal">
                    <img
                      src={asset(`/img/${card.shot}.${lang}.jpg`)}
                      alt=""
                      loading="lazy"
                      width={1100}
                      height={726}
                    />
                  </div>
                </article>
              ))}
            </div>

            <div className="cards-3">
              {t.feat.more.map((card) => (
                <article key={card.title} className="card card-sm js-card">
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="privacy-wrap" id="privacy">
          <div className="wrap">
            <div className="privacy">
              <div className="grain" aria-hidden="true" />
              <div className="privacy-inner">
                <div className="privacy-copy">
                  <h2 className="privacy-h2">
                    {t.privacy.lines.map((line) => (
                      <span key={line} className="js-line">
                        {line}
                      </span>
                    ))}
                  </h2>
                  <p>{t.privacy.body}</p>
                </div>
                <ul className="checks">
                  {t.privacy.checks.map((check) => (
                    <li key={check} className="js-check">
                      <CheckIcon />
                      <span>{check}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="install" id="install">
          <div className="wrap">
            <p className="eyebrow">{t.install.eyebrow}</p>
            <h2>{t.install.h2}</h2>
            <div className="cards-2">
              <article className="card card-pick js-card">
                <p className="mono tag amber">{t.install.pickTag}</p>
                <h3>{t.install.pickTitle}</h3>
                <p>{t.install.pickBody}</p>
                <DownloadButton
                  className="btn"
                  label={t.install.pickBtn}
                  iconSize={18}
                />
                <p className="fine">{t.install.pickFine}</p>
              </article>
              <article className="card js-card">
                <p className="mono tag">{t.install.devTag}</p>
                <h3>{t.install.devTitle}</h3>
                <p>{t.install.devBody}</p>
                <div className="codeline">
                  <code className="mono">{INSTALL_COMMAND}</code>
                  <CopyButton
                    text={INSTALL_COMMAND}
                    label={t.install.copy}
                    doneLabel={t.install.copied}
                  />
                </div>
                <p className="fine">{t.install.devFine}</p>
              </article>
            </div>
          </div>
        </section>

        <section className="final">
          <div className="final-glow" aria-hidden="true" />
          <div className="wrap final-inner">
            <h2>{t.final.h2}</h2>
            <p className="final-lead">{t.final.body}</p>
            <DownloadButton className="btn btn-lg" label={t.final.cta} />
            <p className="meta">
              <span>{t.final.meta}</span>
              <span className="dot">·</span>
              <Version fallback={FALLBACK_VERSION} />
            </p>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="wrap foot-inner">
          <img src={asset('/img/icon.png')} alt="" width={22} height={22} />
          <span>{t.foot.license}</span>
          <span className="spacer" />
          <a href={links.repo}>GitHub</a>
          <a href={links.releases}>{t.foot.releases}</a>
          <a href={links.issues}>{t.foot.issues}</a>
        </div>
      </footer>
    </>
  );
}
