<div align="center">

<img width="120" src="assets/icon.png" alt="Seorap icon">

<h1>Seorap (서랍)</h1>

<p><strong>Everything you would DM yourself, in one drawer.</strong></p>

<p>Screenshots, snippets, links, files, and the passwords you keep in the wrong place.<br>One hotkey in. One click out. Nothing leaves your PC.</p>

<p>
  <a href="https://github.com/bbjbc/seorap/releases">Download</a> |
  <a href="#quickstart">Quickstart</a> |
  <a href="#shortcuts">Shortcuts</a> |
  <a href="#vault-security">Vault security</a> |
  <a href="README.ko.md">한국어</a>
</p>

[![Release](https://img.shields.io/github/v/release/bbjbc/seorap?display_name=tag&style=flat-square)](https://github.com/bbjbc/seorap/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/bbjbc/seorap/ci.yml?branch=main&label=CI&style=flat-square)](https://github.com/bbjbc/seorap/actions/workflows/ci.yml)
[![Downloads](https://img.shields.io/github/downloads/bbjbc/seorap/total?style=flat-square&label=downloads)](https://github.com/bbjbc/seorap/releases)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%20%7C%2011-lightgrey?style=flat-square)](#quickstart)

⭐ _If Seorap retired your Slack messages-to-self, leave a star. It decides what gets built next._

</div>

## About

Things you only need for a while never have a place to go. So they end up as Slack messages to yourself, thirty open Notepad tabs, and a Wi-Fi password written down somewhere again. *Seorap* (Korean for "drawer") replaces those three habits with one window in the tray. Copy, press a hotkey; click when you need it back. No server, no account, no sync. Everything stays on your PC as plain files in one folder.

<img src="docs/demo/seorap.en.svg" width="100%" alt="One PowerShell line downloads the latest release, verifies it, installs and launches Seorap">

<sub>The demo is an animated SVG made with [termcast](https://termcast.xyz). Source tape: [docs/demo/seorap.en.tape](docs/demo/seorap.en.tape).</sub>

- `Ctrl+Alt+V` from any app saves the clipboard (image, text, link or file). The window stays hidden; a small toast confirms it
- On the board, click a card to copy it, drag it into another app to drop it as a file
- A notepad with no save button. Stop typing and it is saved; `Ctrl+K` searches note bodies and opens the match, `Ctrl+F` finds inside the open note, and the list can be reordered by dragging
- A master-password vault: scrypt + AES-256-GCM, auto-lock, copied passwords cleared from the clipboard after 30 seconds
- Duplicates are caught by hash, deletes can be undone for six seconds, old items can be cleaned up automatically
- English and Korean UI (Settings > General). When a new version is out, a single quiet button appears in the rail
- Electron 44 + React 19 + TypeScript (strict), bundled with electron-vite. No runtime npm dependencies beyond React and Zustand, which ship inside the bundle

![Board view](docs/screenshots/en/board.png)

## Quickstart

**1. Install**

One line of PowerShell. It downloads the latest release, verifies the SHA256, installs silently into your user folder and launches the app. No admin rights needed.

```powershell
irm https://raw.githubusercontent.com/bbjbc/seorap/main/install.ps1 | iex
```

To download manually, pick one from [Releases](https://github.com/bbjbc/seorap/releases).

```
Seorap-Setup-x.y.z.exe       Installer. Start menu shortcut, launch-at-login option
Seorap-x.y.z-portable.exe    Runs without installing
```

Builds are not code-signed, so SmartScreen may warn on first launch. Click "More info", then "Run anyway". Verify downloads against the `SHA256SUMS.txt` attached to each release.

**2. Put things in**

The app sits in the tray. Copy anything, then:

```
Ctrl + Alt + V        Save whatever is on the clipboard. Toast only, window stays put
Ctrl + Alt + Space    Show / hide the Seorap window
```

With the window open you can also drop files or images onto it, press `Ctrl+V`, or type a line in the top box and press `Enter`.

**3. Take things out**

```
click a card          Copied to the clipboard
drag a card           Lands in Slack, Explorer or mail as a file
double-click          Images open large, text opens in the notes editor, links open in the browser
```

**4. Notes and vault**

```
Ctrl + 2   →  Ctrl + N        New note. Just type; it saves itself
Ctrl + K                       Search note bodies with a few characters and jump in
Ctrl + 3                       Vault. Create a master password the first time (it cannot be recovered)
```

---

## Three drawers

| Drawer | What goes in | Muscle memory |
|---|---|---|
| **Board** | Images, text, links and files as a card grid. Search, type filters, tags, pinning. | click = copy, drag = drop as file, `Delete` = remove (undoable) |
| **Notes** | A Notepad replacement. Recency-sorted list instead of tabs, autosave instead of a save button. Drop `.txt` files to import. | `Ctrl+N` new note, `Ctrl+K` quick open |
| **Vault** | Passwords, API keys, certificate PINs. Each entry is encrypted whole; nothing is readable while locked, not even names. | "Copy" clears the clipboard after 30 s, locks after 5 min idle |

More screenshots are in [docs/screenshots](docs/screenshots).

## Shortcuts

| Keys | Action | Scope |
|---|---|---|
| `Ctrl+Alt+Space` | Show / hide window | Global |
| `Ctrl+Alt+V` | Save clipboard now | Global |
| `Ctrl+Alt+N` | New note | Global |
| `Ctrl+1` `Ctrl+2` `Ctrl+3` | Board / Notes / Vault | App |
| `Ctrl+K` | Quick open | App |
| `Ctrl+N` | New note (notes mode) | App |
| `Ctrl+V` | Paste clipboard as an item (board) | App |
| `Ctrl+F` | Search | App |
| `Ctrl+,` | Settings | App |
| `Delete` | Delete selected cards | Board |
| `Esc` | Hide window | App |

The three global shortcuts can be remapped in Settings.

---

### Data

```
%APPDATA%\seorap\
├── settings.json
└── data\
    ├── index.json      item list and metadata
    ├── items\          originals (png, txt, pdf, ...)
    ├── thumbs\         thumbnails (up to 400px)
    └── vault.json      the vault. ciphertext only
```

Originals are plain files, so there is no item limit and the folder opens in Explorer like any other. The grid renders thumbnails only, and only the visible cards, so thousands of items stay fast. Settings > Storage can move the folder to another drive or into OneDrive. Using the same folder from several PCs **at the same time** can overwrite `index.json`, so concurrent use is not supported yet.

> **Network**: the app talks to the network only to fetch a link's title, to download images dragged from a browser, and (every 6 hours, can be turned off in Settings > Updates) to ask GitHub Releases for the latest version number. It collects no usage data and never sends your items anywhere.

---

### Vault security

| | |
|---|---|
| **Key derivation** | scrypt (N = 2^16, r = 8, p = 1), 16-byte random salt |
| **Encryption** | AES-256-GCM, random 96-bit nonce per entry, authentication tag verified |
| **At rest** | Name, username, password and notes form one ciphertext. Nothing is readable while locked, not even names |
| **Key handling** | Never written to disk. Zeroed in memory the moment the vault locks |
| **Auto-lock** | After 5 minutes idle (configurable), when the window hides, on screen lock or suspend |
| **Brute force** | Growing delay after wrong attempts, up to 30 seconds |
| **Clipboard** | Copied passwords are cleared after 30 seconds and excluded from auto-collect |
| **Screen** | Window capture and screen sharing are blocked while the vault is open (Windows API) |

If this PC already has a keylogger or malware, no password manager is safe. A weak master password makes the table above meaningless, so length and character mix are checked at setup, and a forgotten master password cannot be recovered. Keep banking and email credentials in a dedicated manager; the Seorap vault is for the miscellaneous secrets you used to message yourself.

---

### Development

Requires Node.js 22.

```bash
git clone https://github.com/bbjbc/seorap.git
cd seorap
npm install
npm start          # build with electron-vite, then run
npm run dev        # dev server with hot reload for the renderer
npm run check      # typecheck + Biome + ESLint (any is forbidden)
npm run format     # format with Biome
npm test           # unit tests (Vitest) + functional tests (launches Electron)
npm run build      # installer + portable exe into dist/
npm run icons      # assets/icon.svg → icon.png / icon.ico
```

Electron 44 + React 19 + TypeScript (strict), built with [electron-vite](https://electron-vite.org). [Biome](https://biomejs.dev) formats, sorts imports and runs the type-free lint rules; ESLint keeps only the type-aware rules that forbid `any` and unhandled promises, plus the React Compiler rules. Shared types live in a global `Seorap` namespace ([`src/shared/types.d.ts`](src/shared/types.d.ts)), and IPC is a map from channel name to argument and result types, so a main handler and a preload call that disagree fail at compile time. The renderer keeps its state in small Zustand stores, its side effects in per-feature `actions.ts` modules, and its views in arrow-function components; the main process never changed.

```
src/shared/             types.d.ts (items, settings, IPC channels, API), locales.ts (ko/en strings)
src/main/               main.ts (window, tray, shortcuts, IPC), store.ts, vault.ts, clipboard.ts, settings.ts
src/preload/            index.ts (window.scrap for the main window), toast.ts (toast window)
src/renderer/           React app
  app/                  App shell, boot sequence, IPC subscriptions, global shortcuts, drop handling, debug hooks
  stores/               Zustand stores: items, settings, ui, board, notes, vault
  features/             board, notes, vault, settings, detail, switcher, prompt, overlays, nudge, update
  components/           shared presentational pieces (icons, Modal, SearchBox, TagList, SegControl, RichText)
  lib/                  api, i18n hooks, formatting, DOM handles
  styles/               global CSS split by area
  toast/                bottom-right toast window (plain TS)
scripts/                test, icon and screenshot tooling (bundled alongside main)
out/                    electron-vite output (not committed)
```

To release, bump the version in `package.json` and push a tag with the same number. GitHub Actions builds both executables and attaches them, with checksums, to a Release.

```bash
npm version 0.4.0 --no-git-tag-version
git commit -am "release: v0.4.0"
git tag v0.4.0 && git push origin main v0.4.0
```

---

### Explore

[**Screenshots**](docs/screenshots/en/): board, notes, vault and settings (Korean UI in [docs/screenshots/](docs/screenshots/)).

**Roadmap**: sync-safe storage for concurrent use across PCs, importing unsaved tabs from Windows Notepad, an app lock, a light theme.

[**Contributing**](https://github.com/bbjbc/seorap/issues): issues and pull requests are welcome. Please open an issue first for larger changes, and run `npm run check` and `npm test` before committing.

[**Typeface**](assets/fonts/): the UI ships with [Pretendard](https://github.com/orioncactus/pretendard) (SIL Open Font License 1.1).

---

<p align="center">
  <a href="https://github.com/bbjbc/seorap/releases"><strong>Releases</strong></a> | MIT
</p>
