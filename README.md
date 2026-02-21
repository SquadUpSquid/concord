<p align="center">
  <img src="assets/concord-banner.png" alt="Concord" width="100%">
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" alt="License"></a>
  <a href="https://github.com/SquadUpSquid/concord/issues"><img src="https://img.shields.io/github/issues/SquadUpSquid/concord.svg" alt="Issues"></a>
  <a href="https://github.com/SquadUpSquid/concord/network/members"><img src="https://img.shields.io/github/forks/SquadUpSquid/concord.svg" alt="Forks"></a>
  <a href="https://github.com/SquadUpSquid/concord/stargazers"><img src="https://img.shields.io/github/stars/SquadUpSquid/concord.svg" alt="Stars"></a>
</p>

<h1 align="center">Concord</h1>

<p align="center">
  <b>A familiar, modern desktop client for <a href="https://matrix.org">Matrix</a></b><br>
  Built with React, TypeScript, and Tauri
</p>

<p align="center"><i>Work in progress — no official release yet</i></p>

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Setup](#setup) — [Windows](#windows) | [macOS](#macos) | [Linux](#linux-debian--ubuntu)
- [Getting Started](#getting-started)
- [Building](#building)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Features

**Core**
- Full [Matrix](https://matrix.org) client with end-to-end encryption (Rust crypto via [matrix-js-sdk](https://github.com/matrix-org/matrix-js-sdk))
- Discord-style three-column layout: servers (spaces), channels, and chat
- Spaces and channels with custom text and voice channel sections
- Direct messages in a dedicated section separate from spaces

**Messaging**
- Markdown (GFM) with code syntax highlighting
- Replies, reactions, and emoji picker
- Typing indicators and real-time presence (online, away, offline)
- Unread badges on channels with new messages

**Voice & Video**
- [LiveKit](https://livekit.io) SFU integration for voice and video calls
- Mic, camera, screenshare, speaker detection, and participant grid
- Toggleable, resizable text chat panel in voice channels

**Organization & Customization**
- Drag-and-drop channel and section reordering (admin/moderator)
- Member sidebar with roles and presence
- Multiple dark themes (default, green, orange, red, blue)
- Native desktop experience via [Tauri](https://tauri.app) — lightweight, no Electron

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) |
| Build | [Vite 6](https://vite.dev) |
| Desktop | [Tauri 2](https://tauri.app) (Rust backend) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) |
| State | [Zustand](https://zustand.docs.pmnd.rs) |
| Matrix | [matrix-js-sdk](https://github.com/matrix-org/matrix-js-sdk) with Rust crypto (WASM) |
| Voice/Video | [LiveKit Client SDK](https://docs.livekit.io) |
| Testing | [Vitest](https://vitest.dev) + [Testing Library](https://testing-library.com) |

## Setup

Every platform needs **Git**, **Node.js >= 20**, and the **Rust toolchain**. Beyond that, each OS has its own system dependencies for Tauri. Pick your platform below and follow every step.

---

### Windows

<details>
<summary><b>Click to expand Windows setup</b></summary>

#### 1. Install Git

Download and install from [git-scm.com](https://git-scm.com/download/win).

#### 2. Install Node.js

Download the **LTS** installer (>= 20) from [nodejs.org](https://nodejs.org). This includes `npm`.

#### 3. Install Rust

Download and run the installer from [rustup.rs](https://rustup.rs). When prompted, choose the default installation.

After the installer finishes, **open a new terminal** and run:

```powershell
rustup default stable
```

#### 4. Install Tauri system dependencies

- Install [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/).
  - In the installer, select the **"Desktop development with C++"** workload.
- Install [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (pre-installed on Windows 10 1803+ and Windows 11).

For the full breakdown see the [Tauri v2 prerequisites guide](https://v2.tauri.app/start/prerequisites/).

#### 5. Verify everything

Open a **new** terminal (PowerShell or CMD) and run:

```powershell
git --version
node -v          # Should be >= 20
npm -v
rustc --version  # Should be >= 1.75
cargo --version
```

If any command is not recognized, revisit the corresponding step above.

</details>

---

### macOS

<details>
<summary><b>Click to expand macOS setup</b></summary>

#### 1. Install Xcode Command Line Tools

```bash
xcode-select --install
```

This gives you Git, a C compiler, and other build essentials.

#### 2. Install Node.js

Use [nvm](https://github.com/nvm-sh/nvm) (recommended) or download the LTS installer from [nodejs.org](https://nodejs.org).

```bash
# With nvm (after installing it):
nvm install 20
nvm use 20
```

#### 3. Install Rust

```bash
curl https://sh.rustup.rs -sSf | sh
```

Follow the on-screen prompts (defaults are fine). Then load it into your current shell:

```bash
source "$HOME/.cargo/env"
rustup default stable
```

#### 4. Verify everything

```bash
git --version
node -v          # Should be >= 20
npm -v
rustc --version  # Should be >= 1.75
cargo --version
```

If any command is not recognized, revisit the corresponding step above.

</details>

---

### Linux (Debian / Ubuntu)

<details>
<summary><b>Click to expand Linux setup</b></summary>

#### 1. Install Node.js

Use [nvm](https://github.com/nvm-sh/nvm) (recommended) or your distro's package manager. Most distro repos ship an outdated Node, so nvm is safest:

```bash
# With nvm (after installing it):
nvm install 20
nvm use 20
```

#### 2. Install Rust

```bash
curl https://sh.rustup.rs -sSf | sh
source "$HOME/.cargo/env"
rustup default stable
```

#### 3. Install Tauri system dependencies

```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev \
  libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev \
  gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-nice
```

> **Linux Voice/Video Compatibility**
>
> Voice and video calls require WebRTC support in WebKitGTK. Most Linux
> distributions (including Ubuntu and Debian) ship WebKitGTK **without**
> WebRTC enabled, so voice/video calls are currently **not supported on Linux**.
> Text chat, spaces, DMs, and everything else works fine.
>
> | Distro               | Text & Messaging | Voice & Video |
> |----------------------|------------------|---------------|
> | Arch Linux           | Yes              | Yes           |
> | Fedora               | Yes              | Yes           |
> | Ubuntu / Debian      | Yes              | No            |
>
> Native Linux voice/video support (via the LiveKit Rust SDK) is planned.
> See [this Tauri discussion](https://github.com/tauri-apps/tauri/discussions/8426)
> for background on the WebKitGTK limitation.

#### 4. Verify everything

```bash
git --version
node -v          # Should be >= 20
npm -v
rustc --version  # Should be >= 1.75
cargo --version
```

If any command is not recognized, revisit the corresponding step above.

</details>

---

## Getting Started

Once your platform setup is complete:

```bash
# Clone the repo
git clone https://github.com/SquadUpSquid/concord.git
cd concord

# Install frontend dependencies
npm install

# Launch the desktop app (first run compiles the Rust backend — this takes a few minutes)
npm run tauri dev
```

To run **just the web frontend** in a browser (no Tauri / no Rust required):

```bash
npm run dev
# Open http://localhost:5173
```

## Building

```bash
npm run tauri build
```

The output will be in `src-tauri/target/release/bundle/`.

## Testing

```bash
npm test              # Run the test suite
npm run test:watch    # Run tests in watch mode
```

## Project Structure

```
concord/
├── src/                        # React frontend
│   ├── components/
│   │   ├── chat/               # Message list, input, header, reactions
│   │   ├── common/             # Avatar, Modal, LoadingSpinner, ErrorBoundary
│   │   ├── layout/             # AppLayout, TitleBar
│   │   ├── members/            # Member sidebar
│   │   ├── modals/             # Create room/space, settings, leave room
│   │   ├── sidebar/            # Server sidebar, channel list, context menu
│   │   └── voice/              # Voice channel UI, controls, participant tiles
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Matrix client init & event handlers
│   ├── pages/                  # LoginPage, MainPage
│   ├── stores/                 # Zustand stores (auth, rooms, messages, calls …)
│   ├── types/                  # TypeScript type definitions
│   └── utils/                  # Helpers & formatters
├── src-tauri/                  # Tauri / Rust backend
│   ├── src/
│   │   ├── lib.rs              # App setup, plugins, permissions
│   │   └── main.rs             # Entry point
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
├── vite.config.ts
├── tsconfig.json
└── index.html
```

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for coding standards, branch naming, and the full workflow.

**Quick version:**

1. Fork the repo and clone your fork
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes and add tests where appropriate
4. Run `npm test` and `npx tsc --noEmit` to verify
5. Commit, push, and open a PR against `main`
6. Sign the [CLA](CLA.md) when prompted by the bot (first-time only)

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).
