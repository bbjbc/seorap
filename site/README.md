# 서랍 랜딩 페이지

`seorap` 앱과는 별개의 npm 프로젝트다. Next.js App Router 로 만들고 정적 파일로
export 하기 때문에 GitHub Pages 같은 정적 호스팅에 그대로 올릴 수 있다.

```bash
cd site
npm install
npm run dev     # http://localhost:3000
npm run build   # out/ 에 정적 파일 생성
npm start       # out/ 을 그대로 서빙해서 확인
```

## 한국어 / 영어

언어는 JS 로 글자를 바꿔치기하지 않고 **실제 경로**로 나눈다. 크롤러가 두 언어를
따로 읽고, 링크도 언어별로 공유할 수 있다.

| 경로 | 언어 | 파일 |
| --- | --- | --- |
| `/` | 한국어 | `app/(ko)/page.tsx` |
| `/en` | English | `app/(en)/en/page.tsx` |

문구는 전부 `lib/dict.tsx` 한 곳에 있다. **한국어가 원본이다.** 새 문구는 `ko` 에
먼저 넣고 `en` 을 맞춘다. 두 딕셔너리는 같은 `Dict` 타입을 쓰므로 한쪽에만 키를
추가하면 타입 검사에서 걸린다.

스크린샷도 언어별로 나뉜다 (`public/img/board.ko.jpg`, `board.en.jpg`). 앱의
`docs/screenshots/` 를 줄여 넣은 것이라, 화면이 바뀌면 같이 갱신해야 한다.
어느 스크린샷을 쓸지는 `feat.main` 의 `shot` 값이 정한다.

## 배포

Vercel 로 올린다. 저장소 루트는 Electron 앱이라, Vercel 프로젝트를 만들 때
**Root Directory 를 `site` 로 지정**해야 한다. 이건 대시보드 설정이라 파일로는 못 한다.
그 외에는 손댈 게 없다. 프레임워크는 Next.js 로 자동 인식되고, 빌드 명령도 기본값
그대로면 된다.

**환경변수도 설정할 필요가 없다.** 주소를 지정하지 않으면 Vercel 이 넣어주는
운영 도메인(`VERCEL_PROJECT_PRODUCTION_URL`)을 써서 canonical 과 og:image 를 채운다.
미리보기 배포에서도 운영 도메인을 가리키므로 미리보기 URL 이 색인될 일이 없다.

나중에 도메인을 붙이거나 다른 곳으로 옮기면 `NEXT_PUBLIC_SITE_URL` 하나만 주면 된다.
`basePath` 는 여기서 자동으로 파생된다 (`lib/site-url.mjs` 를 `next.config.mjs` 와
`lib/site.ts` 가 같이 읽는다).

```bash
# 커스텀 도메인
NEXT_PUBLIC_SITE_URL=https://seorap.dev npm run build

# GitHub Pages 하위 경로. basePath 가 자동으로 /seorap 이 된다
NEXT_PUBLIC_SITE_URL=https://bbjbc.github.io/seorap npm run build
```

정적 export(`output: 'export'`) 라서 Vercel 에서도 정적 파일로만 서빙된다. 서버가
필요한 기능(ISR, 이미지 최적화, 라우트 핸들러)을 쓰게 되면 그때 이 설정을 빼면 된다.

아무 값도 주지 않고 로컬에서 빌드하면 `http://localhost:3000` 이 박힌다. 확인용으로는
괜찮지만 그대로 배포하면 미리보기 카드가 깨진다.

## 다운로드 버튼

릴리스 자산 이름에 버전이 박혀 있어서(`Seorap-Setup-0.3.1.exe`) 고정 URL 을 쓸 수
없다. 그래서 페이지가 뜨면 GitHub API 로 최신 릴리스를 조회해 설치 파일 주소와
버전, 용량을 채운다 (`components/DownloadButton.tsx`).

API 가 실패하거나 응답 전이면 버튼은 릴리스 페이지(`/releases/latest`)를 가리킨다.
즉 **어떤 경우에도 버튼은 눌리는 링크**다.

> 릴리스 워크플로에 버전 없는 사본(`Seorap-Setup.exe`)을 하나 더 올리면
> `releases/latest/download/Seorap-Setup.exe` 라는 고정 주소가 생겨서 API 호출
> 없이도 바로 받게 만들 수 있다. 아직 적용하지 않았다.

## 등장 연출

애니메이션 라이브러리는 쓰지 않는다. 하는 일이 opacity 와 transform 을 옮기는 것
뿐이라 CSS 로 충분했고, GSAP 을 빼면서 First Load JS 가 152kB 에서 108kB 로 줄었다.

**첫 화면은 순수 CSS.** `globals.css` 의 `rise-in`, `fly-in` 키프레임이다.
`animation-fill-mode: both` 라 시작 상태가 곧 초기 모습이고 끝나면 그 자리에 머문다.
카드 회전 각도는 `--rot` 변수에 있어서, 애니메이션이 꺼져도 각도는 유지된다.

**스크롤 진입만 JS 를 쓴다.** `components/ScrollFx.tsx` 의 IntersectionObserver 가
화면에 들어온 요소에 `data-reveal="on"` 을 붙이는 게 전부고, 나타나는 모양은 CSS 의
`[data-reveal]` 규칙이 만든다. 대상이 전부 첫 화면 아래에 있어서 숨겼다 보여줘도
깜빡이지 않는다. (그래서 `<html>` 에 플래그를 붙이는 인라인 스크립트가 필요없고,
하이드레이션 불일치도 생기지 않는다)

| 클래스 | 연출 |
| --- | --- |
| `drawer`, `chip` | 첫 화면. 앱 창이 올라오고 카드가 차례로 튀어나옴 (CSS) |
| `js-card` | 스크롤 진입 시 올라오며 나타남 |
| `js-reveal` | 스크린샷이 아래에서 열리듯 드러남 (clip-path) |
| `js-line`, `js-check` | 보안 섹션 문장·항목 |

JS 가 없으면 스크롤 연출만 빠지고 내용은 그대로 다 보인다.
`prefers-reduced-motion: reduce` 면 첫 화면 연출까지 전부 꺼진다.

## 스타일과 린트

색·글꼴·라운드 값은 앱의 `src/renderer/styles/base.css` 토큰을 그대로 따른다.
사이트가 앱과 한 몸으로 보이게 하려는 것이므로, 앱 토큰이 바뀌면 여기도 맞춘다.
본문 글꼴도 앱과 같은 Pretendard 를 `public/fonts/` 에서 직접 서빙한다.

포맷과 린트는 레포 루트의 Biome 설정을 그대로 쓴다 (`npx biome check site/`).
정적 export 라 `next/image` 가 최적화를 하지 않으므로 `noImgElement` 규칙만
`site/**` 에서 꺼 뒀다. 앱 쪽 ESLint 는 타입 인지 규칙이라 `site/` 를 제외한다.

## OG 이미지

`public/img/og.ko.jpg`, `og.en.jpg` (1200×630). Pretendard 로 렌더한 화면을 캡처해
만든 것이라, 문구를 바꾸면 이미지도 다시 만들어야 한다.
