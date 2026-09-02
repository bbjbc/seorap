<div align="center">

<img width="120" src="assets/icon.png" alt="서랍 아이콘">

<h1>서랍 (Seorap)</h1>

<p><strong>복사한 건 서랍에. 꺼낼 땐 한 번에.</strong></p>

<p>스크린샷, 문장, 링크, 파일, 그리고 늘 엉뚱한 곳에 적어 두던 비밀번호까지.<br>슬랙 "나에게 보내기"로 가던 것들의 새 주소입니다.</p>

<p>
  <a href="https://github.com/bbjbc/seorap/releases">다운로드</a> |
  <a href="#quickstart">Quickstart</a> |
  <a href="#단축키">단축키</a> |
  <a href="#금고-보안">금고 보안</a> |
  <a href="README.en.md">English</a>
</p>

[![Release](https://img.shields.io/github/v/release/bbjbc/seorap?display_name=tag&style=flat-square)](https://github.com/bbjbc/seorap/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/bbjbc/seorap/ci.yml?branch=main&label=CI&style=flat-square)](https://github.com/bbjbc/seorap/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%20%7C%2011-lightgrey?style=flat-square)](#quickstart)

⭐ _슬랙 "나에게 보내기"를 은퇴시켰다면 스타 하나. 다음에 무엇을 만들지 그걸 보고 정합니다._

</div>

## About

잠깐 들고 있을 것들은 늘 자리가 없습니다. 그래서 슬랙에 나에게 보내고, 메모장 탭을 서른 개 열어 두고, 와이파이 비밀번호를 또 어딘가에 적습니다. 서랍은 그 세 습관을 트레이의 창 하나로 대체합니다. 복사하고 단축키 한 번, 필요하면 클릭 한 번. 서버도 계정도 동기화도 없고, 모든 것은 내 PC의 폴더 안에 일반 파일로 남습니다.

<img src="docs/demo/seorap.svg" width="100%" alt="PowerShell 한 줄로 최신 릴리즈를 내려받아 검증하고 설치한 뒤 실행">

<sub>데모는 [termcast](https://termcast.xyz)로 만든 애니메이션 SVG입니다. 원본 테이프는 [docs/demo/seorap.tape](docs/demo/seorap.tape).</sub>

- 어떤 앱에서든 `Ctrl+Alt+V`로 클립보드 내용(이미지·글·링크·파일)을 저장. 창은 뜨지 않고 우하단 알림만
- 보드에서 카드 클릭이면 클립보드 복사, 다른 앱으로 드래그하면 파일로 드롭
- 저장 버튼 없는 메모장. 타이핑을 멈추면 저장되고 `Ctrl+K`로 본문까지 검색해 바로 열기
- 마스터 비밀번호 금고: scrypt + AES-256-GCM, 자동 잠금, 복사한 비밀번호 30초 후 클립보드 삭제
- 중복은 해시로 걸러 한 번만 저장, 삭제는 6초 안에 되돌리기, 오래된 항목 자동 정리
- Electron 44 + TypeScript(strict). 런타임 npm 의존성 0개, 번들러 없음

![보드 화면](docs/screenshots/board.png)

## Quickstart

**1. 설치**

PowerShell 한 줄이면 됩니다. 최신 릴리즈를 내려받아 SHA256을 확인하고 사용자 폴더에 조용히 설치한 뒤 실행합니다. 관리자 권한은 필요 없습니다.

```powershell
irm https://raw.githubusercontent.com/bbjbc/seorap/main/install.ps1 | iex
```

직접 내려받으려면 [Releases](https://github.com/bbjbc/seorap/releases)에서 둘 중 하나를 고릅니다.

```
Seorap-Setup-x.y.z.exe       설치형. 시작 메뉴 바로가기, Windows 시작 시 자동 실행 옵션
Seorap-x.y.z-portable.exe    설치 없이 실행
```

코드 서명이 없어 처음 실행 시 SmartScreen 경고가 뜰 수 있습니다. "추가 정보"를 누른 뒤 "실행"을 선택하세요. 릴리즈의 `SHA256SUMS.txt`로 파일을 검증할 수 있습니다.

**2. 넣기**

앱은 트레이에 조용히 떠 있습니다. 무엇이든 복사한 뒤:

```
Ctrl + Alt + V        지금 클립보드에 있는 것을 저장. 알림만 뜨고 창은 그대로
Ctrl + Alt + Space    서랍 창 열기 / 닫기
```

창을 열었다면 파일이나 이미지를 끌어다 놓거나, `Ctrl+V`를 누르거나, 상단 입력창에 한 줄 적고 `Enter`.

**3. 꺼내기**

```
카드 클릭             클립보드로 복사
카드 드래그           슬랙·탐색기·메일 창에 파일로 드롭
더블클릭              이미지는 크게, 글은 메모 편집기로, 링크는 브라우저로
```

**4. 메모와 금고**

```
Ctrl + 2   →  Ctrl + N        새 메모. 그냥 타이핑하면 저장됩니다
Ctrl + K                       두세 글자로 메모 본문까지 검색해서 열기
Ctrl + 3                       금고. 처음엔 마스터 비밀번호를 만듭니다 (잊으면 복구 불가)
```

---

## 서랍 세 칸

| 칸 | 여기에 들어가는 것 | 손에 익는 동작 |
|---|---|---|
| **보드** | 던져 넣은 이미지·글·링크·파일을 카드 격자로. 검색, 타입 필터, 태그, 고정. | 클릭 = 복사, 드래그 = 파일 드롭, `Delete` = 삭제(되돌리기 가능) |
| **메모** | 메모장 대체. 탭 대신 최근 수정 순 목록, 저장 버튼 대신 자동 저장. `.txt` 드롭으로 가져오기. | `Ctrl+N` 새 메모, `Ctrl+K` 빠른 찾기 |
| **금고** | 비밀번호·API 키·인증서 비번. 항목 전체를 암호화해 저장하고 잠기면 이름도 안 보임. | "복사" 후 30초 뒤 클립보드 자동 삭제, 미사용 5분이면 잠금 |

더 많은 화면은 [docs/screenshots](docs/screenshots)에 있습니다.

## 단축키

| 키 | 동작 | 범위 |
|---|---|---|
| `Ctrl+Alt+Space` | 창 열기 / 닫기 | 전역 |
| `Ctrl+Alt+V` | 클립보드 내용 바로 저장 | 전역 |
| `Ctrl+Alt+N` | 새 메모 | 전역 |
| `Ctrl+1` `Ctrl+2` `Ctrl+3` | 보드 / 메모 / 금고 | 앱 |
| `Ctrl+K` | 빠른 찾기 | 앱 |
| `Ctrl+N` | 새 메모 (메모 모드) | 앱 |
| `Ctrl+V` | 클립보드 붙여 저장 (보드) | 앱 |
| `Ctrl+F` | 검색 | 앱 |
| `Ctrl+,` | 설정 | 앱 |
| `Delete` | 선택한 카드 삭제 | 보드 |
| `Esc` | 창 숨기기 | 앱 |

전역 단축키 세 개는 설정에서 바꿀 수 있습니다.

---

### 데이터

```
%APPDATA%\seorap\
├── settings.json
└── data\
    ├── index.json      항목 목록과 메타데이터
    ├── items\          원본 (png, txt, pdf ...)
    ├── thumbs\         썸네일 (최대 400px)
    └── vault.json      금고. 암호문만 들어 있음
```

원본은 일반 파일이라 개수 제한이 없고 탐색기에서 바로 보입니다. 격자는 썸네일만 쓰고 보이는 카드만 그리므로 수천 개가 쌓여도 느려지지 않습니다. 설정 > 저장 공간에서 폴더를 다른 드라이브나 OneDrive 안으로 옮길 수 있습니다. 여러 PC에서 **동시에** 쓰면 `index.json`이 덮어써질 수 있어 동시 사용은 아직 지원하지 않습니다.

> **네트워크**: 링크 제목을 가져올 때와 브라우저에서 끌어온 이미지를 내려받을 때만 통신합니다. 사용 데이터를 수집하지 않고, 어떤 서버에도 항목을 보내지 않습니다.

---

### 금고 보안

| | |
|---|---|
| **키 유도** | scrypt (N = 2^16, r = 8, p = 1), 16바이트 랜덤 salt |
| **암호화** | AES-256-GCM, 항목마다 랜덤 96비트 nonce, 인증 태그 검증 |
| **저장 형태** | 이름·아이디·비밀번호·메모가 하나의 암호문. 잠긴 상태에서는 이름도 보이지 않음 |
| **키 보관** | 디스크에 쓰지 않음. 잠기는 순간 메모리의 키를 0으로 덮음 |
| **자동 잠금** | 미사용 5분 (설정 가능), 창 숨김, PC 잠금·절전 시 즉시 |
| **무차별 대입** | 틀릴수록 대기 시간 증가, 최대 30초 |
| **클립보드** | 복사한 비밀번호는 30초 뒤 삭제, 자동 수집 대상에서 제외 |
| **화면** | 금고가 열려 있는 동안 창 캡처와 화면 공유 차단 (Windows API) |

이 PC에 이미 키로거나 악성코드가 있다면 어떤 비밀번호 관리자도 안전하지 않습니다. 마스터 비밀번호가 약하면 위 표는 의미가 없어서 만들 때 길이와 조합을 검사하고, 잊으면 복구할 방법이 없습니다. 은행·메일 같은 핵심 계정은 전용 관리자를 쓰고, 서랍 금고는 그 외의 잡다한 비밀 정보 용도로 권합니다.

---

### 개발

Node.js 22가 필요합니다.

```bash
git clone https://github.com/bbjbc/seorap.git
cd seorap
npm install
npm start          # 컴파일 후 개발 실행
npm run check      # 타입 검사 + 린트 (any 금지)
npm test           # 기능 테스트 (Electron을 실제로 띄움)
npm run build      # dist/ 에 설치형 + 포터블 exe
npm run icons      # assets/icon.svg → icon.png / icon.ico
```

Electron 44 + TypeScript(strict). 프레임워크와 번들러 없이 `tsc`만 쓰고, ESLint의 type-checked 규칙으로 `any`를 막습니다. 렌더러는 `<script>`로 로드되므로 공유 타입은 전역 `Seorap` 네임스페이스([`src/shared/types.d.ts`](src/shared/types.d.ts))에 두고, IPC는 채널 이름 → 인자·결과 타입 맵으로 정의해 메인과 preload가 어긋나면 컴파일이 실패합니다.

```
src/shared/types.d.ts   공유 타입 (항목, 설정, IPC 채널, API)
src/main/               main.ts(창·트레이·단축키·IPC), store.ts, vault.ts, clipboard.ts, settings.ts
src/preload.ts          렌더러에 노출하는 API
src/renderer/           index.html, styles.css, app.ts
src/toast/              우하단 알림 창
scripts/                테스트 · 아이콘 · 캡처 도구
out/                    tsc 산출물 (커밋하지 않음)
```

릴리즈는 `package.json`의 버전을 올리고 같은 번호의 태그를 푸시하면 GitHub Actions가 빌드해 Release에 exe 두 개와 체크섬을 올립니다.

```bash
npm version 1.1.0 --no-git-tag-version
git commit -am "release: v1.1.0"
git tag v1.1.0 && git push origin main v1.1.0
```

---

### 더 보기

[**스크린샷**](docs/screenshots/): 보드, 메모, 금고, 설정 화면.

**로드맵**: 여러 PC 동시 사용을 위한 동기화 안전형 저장 구조, Windows 메모장의 저장 안 한 탭 가져오기, 앱 잠금, 라이트 테마.

[**기여**](https://github.com/bbjbc/seorap/issues): 이슈와 PR을 환영합니다. 큰 변경은 이슈에서 먼저 이야기해 주세요. 커밋 전에 `npm run check`와 `npm test`를 돌려 주시면 됩니다.

[**글꼴**](assets/fonts/): UI 전체에 [Pretendard](https://github.com/orioncactus/pretendard)를 내장합니다 (SIL Open Font License 1.1).

---

<p align="center">
  <a href="https://github.com/bbjbc/seorap/releases"><strong>Releases</strong></a> | MIT
</p>
