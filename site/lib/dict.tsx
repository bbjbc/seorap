import type { ReactNode } from 'react';

export const LANGS = ['ko', 'en'] as const;
export type Lang = (typeof LANGS)[number];

/** 한국어가 원본이다. 새 문구는 ko 에 먼저 넣고 en 을 맞춘다. */
export type Dict = {
  meta: { title: string; description: string };
  brand: ReactNode;
  nav: {
    features: string;
    privacy: string;
    install: string;
    download: string;
  };
  hero: {
    eyebrow: string;
    h1: ReactNode;
    lead: string;
    cta: string;
    cta2: string;
    size: string;
    noAdmin: string;
    sha: string;
  };
  chip: { link: string; pw: string; drawer: string };
  feat: {
    eyebrow: string;
    h2: string;
    /** 서랍의 세 칸. 순서가 곧 화면 순서이고 스크린샷도 이 순서로 붙는다. */
    main: {
      title: string;
      body: ReactNode;
      shot: 'board' | 'notes' | 'vault';
    }[];
    more: { title: string; body: ReactNode }[];
  };
  privacy: { lines: string[]; body: string; checks: string[] };
  install: {
    eyebrow: string;
    h2: string;
    pickTag: string;
    pickTitle: string;
    pickBody: string;
    pickBtn: string;
    pickFine: ReactNode;
    devTag: string;
    devTitle: string;
    devBody: string;
    copy: string;
    copied: string;
    devFine: string;
  };
  final: { h2: ReactNode; body: string; cta: string; meta: string };
  foot: { license: string; releases: string; issues: string };
  langLabel: { ko: string; en: string };
};

const REPO = 'https://github.com/bbjbc/seorap';

const ko: Dict = {
  meta: {
    title: '서랍 (Seorap) · 잠깐 둘 곳이 없는 것들을 넣어두는 트레이 앱',
    description:
      '스크린샷, 코드 조각, 링크, 파일, 비밀번호까지. 단축키 하나로 넣고 클릭 한 번으로 꺼내는 Windows 트레이 앱. 서버도 계정도 없이 전부 내 PC 안에서.',
  },
  brand: (
    <>
      서랍 <em>Seorap</em>
    </>
  ),
  nav: {
    features: '기능',
    privacy: '보안',
    install: '설치',
    download: '다운로드',
  },
  hero: {
    eyebrow: 'Windows 10 · 11 · 무료 · 오픈소스',
    h1: (
      <>
        나에게 보내던 DM,
        <br />
        이제 <span className="amber">서랍</span>에 넣어두세요.
      </>
    ),
    lead: '스크린샷, 코드 조각, 링크, 파일, 그리고 아무 데나 적어둔 비밀번호까지. 단축키 하나로 넣고, 클릭 한 번으로 꺼냅니다. 서버도 계정도 없이 전부 내 PC 안에서.',
    cta: 'Windows용 다운로드',
    cta2: 'PowerShell 한 줄로 설치',
    size: '설치 파일 약 100MB',
    noAdmin: '관리자 권한 필요 없음',
    sha: 'SHA256 검증',
  },
  chip: {
    link: 'bbjbc/seorap · 트레이 서랍',
    pw: '공유기 관리자',
    drawer: '서랍',
  },
  feat: {
    eyebrow: '기능',
    h2: '서랍 안에는 칸이 셋 있습니다.',
    main: [
      {
        title: '보드',
        shot: 'board',
        body: (
          <>
            어느 앱에서든 <span className="mono amber">Ctrl+Alt+V</span>.
            이미지, 글, 링크, 파일이 카드로 쌓입니다. 클릭하면 복사되고, 끌어다
            놓으면 파일로 떨어집니다.
          </>
        ),
      },
      {
        title: '메모',
        shot: 'notes',
        body: (
          <>
            저장 버튼이 없습니다. 타이핑을 멈추면 저장됩니다.{' '}
            <span className="mono kbdish">Ctrl+K</span>로 본문까지 검색하고,
            목록은 끌어서 정렬합니다.
          </>
        ),
      },
      {
        title: '금고',
        shot: 'vault',
        body: (
          <>
            마스터 비밀번호 하나로 잠급니다. scrypt + AES-256-GCM, 자동 잠금,
            복사한 비밀번호는 30초 뒤 클립보드에서 지워집니다.
          </>
        ),
      },
    ],
    more: [
      {
        title: '중복은 해시로 차단',
        body: <>같은 이미지를 두 번 넣어도 카드는 하나입니다.</>,
      },
      {
        title: '삭제는 6초간 되돌리기',
        body: <>오래된 항목은 규칙대로 알아서 정리됩니다.</>,
      },
      {
        title: '한국어 · English',
        body: <>새 버전이 나오면 사이드바에 조용한 버튼 하나가 생깁니다.</>,
      },
    ],
  },
  privacy: {
    lines: ['서버 없음.', '계정 없음.', '동기화 없음.'],
    body: '모든 것은 내 PC의 폴더 하나에 평범한 파일로 남습니다. 앱을 지워도 파일은 그 자리에 있고, 백업은 그 폴더를 복사하면 끝입니다.',
    checks: [
      '네트워크 요청은 업데이트 확인뿐',
      '금고는 scrypt + AES-256-GCM',
      'MIT 라이선스 · 소스 전체 공개',
    ],
  },
  install: {
    eyebrow: '설치',
    h2: '두 가지 중 편한 쪽으로.',
    pickTag: '추천',
    pickTitle: '버튼 눌러서 받기',
    pickBody:
      '최신 설치 파일이 바로 내려받아집니다. 실행하고 다음만 누르면 끝.',
    pickBtn: 'Seorap-Setup.exe 받기',
    pickFine: (
      <>
        포터블 버전이 필요하면{' '}
        <a href={`${REPO}/releases/latest`}>릴리스 페이지</a>에서 받으세요.
      </>
    ),
    devTag: '개발자용',
    devTitle: 'PowerShell 한 줄',
    devBody:
      '최신 릴리스를 받아 SHA256을 검증하고, 사용자 폴더에 조용히 설치한 뒤 실행합니다.',
    copy: '복사',
    copied: '복사됨',
    devFine: '관리자 권한이 필요 없습니다.',
  },
  final: {
    h2: (
      <>
        잠깐 둘 곳이 없어서
        <br />
        여기저기 흘리던 것들.
      </>
    ),
    body: '이제 서랍 하나면 됩니다.',
    cta: 'Windows용 다운로드',
    meta: 'Windows 10 · 11 (64비트)',
  },
  foot: {
    license: '서랍 (Seorap) · MIT 라이선스',
    releases: '릴리스',
    issues: '이슈',
  },
  langLabel: { ko: '한국어', en: 'EN' },
};

const en: Dict = {
  meta: {
    title: 'Seorap · everything you would DM yourself, in one drawer',
    description:
      'Screenshots, snippets, links, files and the passwords you keep in the wrong place. One hotkey in, one click out. Nothing leaves your PC.',
  },
  brand: <>Seorap</>,
  nav: {
    features: 'Features',
    privacy: 'Privacy',
    install: 'Install',
    download: 'Download',
  },
  hero: {
    eyebrow: 'Windows 10 · 11 · free · open source',
    h1: (
      <>
        Everything you would DM yourself,
        <br />
        in one <span className="amber">drawer</span>.
      </>
    ),
    lead: 'Screenshots, snippets, links, files, and the passwords you keep in the wrong place. One hotkey in, one click out. No server, no account, and nothing leaves your PC.',
    cta: 'Download for Windows',
    cta2: 'Install with one line',
    size: 'about 100 MB',
    noAdmin: 'no admin rights',
    sha: 'SHA256 verified',
  },
  chip: {
    link: 'bbjbc/seorap · a tray drawer',
    pw: 'Router admin',
    drawer: 'Seorap',
  },
  feat: {
    eyebrow: 'Features',
    h2: 'Three drawers inside.',
    main: [
      {
        title: 'Board',
        shot: 'board',
        body: (
          <>
            Press <span className="mono amber">Ctrl+Alt+V</span> from any app.
            Images, text, links and files pile up as cards. Click one to copy
            it, drag it out to drop it as a file.
          </>
        ),
      },
      {
        title: 'Notes',
        shot: 'notes',
        body: (
          <>
            No save button. Stop typing and it is saved.{' '}
            <span className="mono kbdish">Ctrl+K</span> searches note bodies,
            and the list reorders by dragging.
          </>
        ),
      },
      {
        title: 'Vault',
        shot: 'vault',
        body: (
          <>
            Locked with one master password. scrypt + AES-256-GCM, auto-lock,
            and copied passwords cleared from the clipboard after 30 seconds.
          </>
        ),
      },
    ],
    more: [
      {
        title: 'Duplicates caught by hash',
        body: <>Save the same image twice and you still get one card.</>,
      },
      {
        title: 'Six seconds to undo a delete',
        body: <>Old items are cleaned up automatically by your own rules.</>,
      },
      {
        title: 'English · 한국어',
        body: (
          <>When a new version is out, one quiet button appears in the rail.</>
        ),
      },
    ],
  },
  privacy: {
    lines: ['No server.', 'No account.', 'No sync.'],
    body: 'Everything stays on your PC as plain files in one folder. Delete the app and the files are still there; backing up means copying that folder.',
    checks: [
      'The only network request is the update check',
      'The vault uses scrypt + AES-256-GCM',
      'MIT licensed · full source published',
    ],
  },
  install: {
    eyebrow: 'Install',
    h2: 'Whichever suits you.',
    pickTag: 'Recommended',
    pickTitle: 'Press the button',
    pickBody:
      'The latest installer downloads straight away. Run it and click next.',
    pickBtn: 'Get Seorap-Setup.exe',
    pickFine: (
      <>
        Need the portable build? Grab it from the{' '}
        <a href={`${REPO}/releases/latest`}>releases page</a>.
      </>
    ),
    devTag: 'For developers',
    devTitle: 'One line of PowerShell',
    devBody:
      'Downloads the latest release, verifies the SHA256, installs silently into your user folder and launches the app.',
    copy: 'Copy',
    copied: 'Copied',
    devFine: 'No admin rights needed.',
  },
  final: {
    h2: (
      <>
        The things you kept dropping
        <br />
        because they had nowhere to go.
      </>
    ),
    body: 'One drawer is enough now.',
    cta: 'Download for Windows',
    meta: 'Windows 10 · 11 (64-bit)',
  },
  foot: {
    license: 'Seorap · MIT License',
    releases: 'Releases',
    issues: 'Issues',
  },
  langLabel: { ko: '한국어', en: 'EN' },
};

export const dictionaries: Record<Lang, Dict> = { ko, en };

export const links = {
  repo: REPO,
  releases: `${REPO}/releases`,
  latest: `${REPO}/releases/latest`,
  issues: `${REPO}/issues`,
  installScript:
    'https://raw.githubusercontent.com/bbjbc/seorap/main/install.ps1',
};

export const INSTALL_COMMAND = `irm ${links.installScript} | iex`;
